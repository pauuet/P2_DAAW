import { useState, useEffect, useRef } from "react";
import TetrisBoard from "./TetrisBoard";
import Lobby from "./components/Lobby";
import { db } from "./firebase";
import { ref, set, onValue, push, update, remove, onDisconnect, get } from "firebase/database";
import axios from "axios";

// Use Environment Variable or fallback to localhost
const API_URL = import.meta.env.VITE_API_URL || 'https://tetris-backend-0qra.onrender.com';

function App() {
  const [gameState, setGameState] = useState('lobby'); // lobby, playing, gameover, waiting
  const [username, setUsername] = useState('');
  const [myId, setMyId] = useState(null);
  const [players, setPlayers] = useState([]);
  const [isPractice, setIsPractice] = useState(false);

  // Game State
  const [paused, setPaused] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [lines, setLines] = useState(0);
  const [level, setLevel] = useState(1);
  const [garbage, setGarbage] = useState(0);

  // Refs for listeners to avoid stale closures
  const gameStateRef = useRef(gameState);
  gameStateRef.current = gameState;
  const linesRef = useRef(lines);
  linesRef.current = lines;
  const levelRef = useRef(level);
  levelRef.current = level;
  const usernameRef = useRef(username);
  usernameRef.current = username;
  const scoreSubmittedRef = useRef(false);
  const isPracticeRef = useRef(isPractice);
  isPracticeRef.current = isPractice;
  const myIdRef = useRef(myId);
  myIdRef.current = myId;

  // Helper to submit score
  const submitScore = () => {
    if (scoreSubmittedRef.current) return;
    if (isPracticeRef.current) return; // Don't save practice scores
    scoreSubmittedRef.current = true;

    // Send score to API
    axios.post(API_URL, {
      username: usernameRef.current,
      lines: linesRef.current,
      level: levelRef.current,
      gameId: new Date().getTime()
    }).catch(e => console.error("Error saving score", e));
  };

  // 1. Join Game (Multiplayer or Practice)
  const handleJoin = async (name, practiceMode = false) => {
    if (!name) name = "Guest";

    // Fix: Prevent clicking join multiple times if already joined
    if (!practiceMode && myId) return;

    setUsername(name);

    if (practiceMode) {
      setIsPractice(true);
      startLocalGame();
      return;
    }

    // Multiplayer Join
    setIsPractice(false);

    // Check if game is already running AND clean up stale state
    const gameStatusSnap = await get(ref(db, 'rooms/global/gameStatus'));
    const playersSnap = await get(ref(db, 'rooms/global/players'));

    let status = gameStatusSnap.val();
    const playersData = playersSnap.val();
    const activePlayers = playersData ? Object.keys(playersData).length : 0;

    // Fix Stale State: If game thinks it's playing but nobody is there, RESET IT.
    if ((status === 'playing' || status === 'paused') && activePlayers === 0) {
      status = 'lobby';
      await set(ref(db, 'rooms/global/gameStatus'), 'lobby');
      await remove(ref(db, 'rooms/global/attacks'));
    }

    if (status === 'playing' || status === 'paused') {
      setGameState('waiting'); // Late joiners wait
    } else {
      setGameState('lobby');
    }

    const playersRef = ref(db, 'rooms/global/players');
    const newPlayerRef = push(playersRef);
    setMyId(newPlayerRef.key);

    // Initial Player Data
    const playerData = {
      username: name,
      color: '#' + Math.floor(Math.random() * 16777215).toString(16),
      status: 'waiting'
    };

    set(newPlayerRef, playerData);
    onDisconnect(newPlayerRef).remove(); // Remove on close
  };

  // 2. Listeners
  useEffect(() => {
    // Listen for Players
    const playersRef = ref(db, 'rooms/global/players');
    const unsubPlayers = onValue(playersRef, (snapshot) => {
      const data = snapshot.val();
      const list = data ? Object.entries(data).map(([k, v]) => ({ id: k, ...v })) : [];
      setPlayers(list);
    });

    // Listen for Game Events (Start/Pause/GameOver)
    const gameRef = ref(db, 'rooms/global/gameStatus');
    const unsubGame = onValue(gameRef, (snapshot) => {
      // Ignore global events if in Practice Mode
      if (isPracticeRef.current) return;

      const status = snapshot.val();

      if (status === 'playing') {
        // Only start if we were in LOBBY (not Waiting) AND have joined (myId exists)
        if (gameStateRef.current === 'lobby' && myIdRef.current) {
          startLocalGame();
        } else if (gameStateRef.current === 'playing') {
          setPaused(false);
        }
      } else if (status === 'paused') {
        if (gameStateRef.current === 'playing') setPaused(true);
      } else if (status === 'gameover') {
        // If waiting, go to lobby now
        if (gameStateRef.current === 'waiting') {
          setGameState('lobby');
          return;
        }

        if (!scoreSubmittedRef.current && gameStateRef.current === 'playing') {
          submitScore();
        }
        if (gameStateRef.current === 'playing') setGameOver(true);
      } else if (status === 'lobby') {
        // Reset to lobby if needed
        if (gameStateRef.current !== 'lobby' && myIdRef.current) setGameState('lobby');
      }
    });

    return () => {
      unsubPlayers();
      unsubGame();
    };
  }, []);

  // 3. Listen for Attacks
  useEffect(() => {
    if (!myId || isPractice) return;
    const attacksRef = ref(db, `rooms/global/attacks/${myId}`);
    const unsubAttacks = onValue(attacksRef, (snapshot) => {
      if (isPracticeRef.current) return;
      const data = snapshot.val();
      if (data) {
        let count = 0;
        Object.keys(data).forEach(k => {
          count += data[k].lines;
          remove(ref(db, `rooms/global/attacks/${myId}/${k}`));
        });
        if (count > 0) setGarbage(g => g + count);
      }
    });
    return () => unsubAttacks();
  }, [myId, isPractice]);

  const startLocalGame = () => {
    setGameState('playing');
    setGameOver(false);
    setLines(0);
    setLevel(1);
    setGarbage(0);
    setPaused(false);
    scoreSubmittedRef.current = false;
  };

  // 4. Global Actions
  const handleGlobalStart = () => {
    if (isPracticeRef.current) return;
    if (!myIdRef.current) return; // Use Ref to verify joined status
    set(ref(db, 'rooms/global/gameStatus'), 'playing');
    remove(ref(db, 'rooms/global/attacks'));
  };

  const handleGlobalPause = () => {
    if (isPracticeRef.current) {
      setPaused(p => !p);
      return;
    }
    if (!myIdRef.current) return; // Use Ref
    const newStatus = paused ? 'playing' : 'paused';
    set(ref(db, 'rooms/global/gameStatus'), newStatus);
  };

  // 5. Game Logic
  const handleLinesCleared = (count) => {
    const newLines = lines + count;
    setLines(newLines);
    setLevel(Math.floor(newLines / 10) + 1);

    if (count > 0 && players.length > 1 && !isPractice) {
      players.forEach(p => {
        if (p.id !== myId) {
          push(ref(db, `rooms/global/attacks/${p.id}`), { lines: count });
        }
      });
    }
  };

  const handleGameOver = () => {
    setGameOver(true);
    if (!isPractice) {
      submitScore();
      set(ref(db, 'rooms/global/gameStatus'), 'gameover');
    }
  };

  useEffect(() => {
    const handleKey = (e) => {
      if (gameState === 'lobby' && e.key === 'Enter') {
        handleGlobalStart();
      }
      if (gameState === 'playing' && e.key.toLowerCase() === 'p') {
        handleGlobalPause();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [gameState, paused, isPractice]);


  if (gameState === 'waiting') {
    return (
      <div className="app">
        <div className="lobby-container">
          <h1>⏳ Waiting for next round...</h1>
          <p>A game is currently in progress. Please wait for it to finish.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      {gameState === 'lobby' ? (
        <Lobby onJoin={handleJoin} players={players} />
      ) : (
        <div className="layout">
          <div>
            <h1 className="title">Tetris: {username} {isPractice ? '(Practice)' : ''}</h1>
            <TetrisBoard
              paused={paused}
              setPaused={() => { }}
              gameOver={gameOver}
              setGameOver={handleGameOver}
              setLines={handleLinesCleared}
              garbageLines={garbage}
              setGarbage={setGarbage}
            />
          </div>

          <div className="panel">
            {paused && <div className="banner pause">PAUSED</div>}
            {gameOver && <div className="banner over">GAME OVER</div>}

            <div className="stat">Level: {level}</div>
            <div className="stat">Lines: {lines}</div>
            <div className="stat">Players: {isPractice ? 1 : players.length}</div>

            <div className="help">
              <p>Controls:</p>
              <p>ENTER: Start (Lobby)</p>
              <p>P: Pause</p>
            </div>

            {gameOver && <button className="btn" onClick={() => setGameState('lobby')}>Back to Lobby</button>}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
