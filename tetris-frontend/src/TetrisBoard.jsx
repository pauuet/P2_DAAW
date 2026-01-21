import { useState, useEffect, useRef } from "react";
import { ROWS, COLS, SPEED, SHAPES, COLORS } from "./constants";


function randomPiece() {
    const keys = Object.keys(SHAPES);
    const type = keys[Math.floor(Math.random() * keys.length)];
    return { type, rotation: 0, x: 3, y: 0 };
}


function rotate(piece, dir = 1) {
    const total = SHAPES[piece.type].length;
    return { ...piece, rotation: (piece.rotation + dir + total) % total };
}


function getMatrix(piece) {
    return SHAPES[piece.type][piece.rotation];
}

const TetrisBoard = ({
    paused,
    setPaused,
    gameOver,
    setGameOver,
    setLines,
    garbageLines,
    setGarbage
}) => {
    const [board, setBoard] = useState(
        Array.from({ length: ROWS }, () => Array(COLS).fill(null))
    );

    const [piece, setPiece] = useState(randomPiece());
    const [nextPiece, setNextPiece] = useState(randomPiece());
    const [levelSpeed, setLevelSpeed] = useState(SPEED);

    // Stats ref to calculate speed
    const linesRef = useRef(0);

    // 1. Handle Garbage Injection
    useEffect(() => {
        if (garbageLines > 0) {
            setBoard(prev => {
                const newBoard = prev.map(row => [...row]);
                // Remove top N rows (game over validity check later)
                // Add N garbage rows at bottom
                for (let i = 0; i < garbageLines; i++) {
                    newBoard.shift(); // Remove top
                    // Create garbage row: 2 holes
                    const row = Array(COLS).fill('G');
                    const hole1 = Math.floor(Math.random() * COLS);
                    let hole2 = Math.floor(Math.random() * COLS);
                    while (hole1 === hole2) hole2 = Math.floor(Math.random() * COLS);
                    row[hole1] = null;
                    row[hole2] = null;
                    newBoard.push(row);
                }
                return newBoard;
            });
            setGarbage(0); // Reset buffer
        }
    }, [garbageLines]);

    const collide = (b, p, offX = 0, offY = 0) => {
        const m = getMatrix(p);
        for (let y = 0; y < m.length; y++) {
            for (let x = 0; x < m[y].length; x++) {
                if (!m[y][x]) continue;

                const nx = p.x + x + offX;
                const ny = p.y + y + offY;

                if (ny < 0) continue;

                if (nx < 0 || nx >= COLS || ny >= ROWS) return true;

                if (b[ny][nx]) return true;
            }
        }
        return false;
    };


    const merge = (b, p) => {
        const m = getMatrix(p);
        const newBoard = b.map((r) => r.slice());

        for (let y = 0; y < m.length; y++) {
            for (let x = 0; x < m[y].length; x++) {
                if (m[y][x]) {
                    const ny = p.y + y;
                    const nx = p.x + x;
                    if (ny >= 0) newBoard[ny][nx] = p.type;
                }
            }
        }
        return newBoard;
    };


    const clearLines = (b) => {
        // Check FULL rows (no nulls)
        const newRowsKept = b.filter(r => r.some(cell => cell === null));
        const cleared = ROWS - newRowsKept.length;

        const newRows = Array.from({ length: cleared }, () =>
            Array(COLS).fill(null)
        );

        return { newBoard: [...newRows, ...newRowsKept], cleared };
    };


    const spawn = () => {
        const p = nextPiece;
        setNextPiece(randomPiece());

        if (collide(board, p, 0, 0)) {
            setGameOver(true);
        } else {
            setPiece(p);
        }
    };


    const stepDown = () => {
        if (gameOver || paused) return;

        if (!collide(board, piece, 0, 1)) {
            setPiece((prev) => ({ ...prev, y: prev.y + 1 }));
        } else {
            const merged = merge(board, piece);
            const { newBoard, cleared } = clearLines(merged);
            setBoard(newBoard);

            if (cleared > 0) {
                linesRef.current += cleared;
                setLines(cleared); // Trigger app logic
                // Speed up 10% per 10 lines
                const lvl = Math.floor(linesRef.current / 10);
                const newSpeed = Math.max(50, SPEED * Math.pow(0.9, lvl));
                setLevelSpeed(newSpeed);
            }

            spawn();
        }
    };


    useEffect(() => {
        if (gameOver || paused) return;
        const interval = setInterval(stepDown, levelSpeed);
        return () => clearInterval(interval);
    }, [gameOver, paused, levelSpeed, board, piece, setLines]);


    useEffect(() => {
        const handleKeyDown = (e) => {
            // Prevent default scrolling for arrows
            const keys = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"];
            if (keys.includes(e.key) || keys.includes(e.code)) {
                // Only prevent if focused in game? For now yes.
                if (!paused && !gameOver) e.preventDefault();
            }

            // Pause handled by Global now, but keep local toggle if needed? App disables it via prop.
            // if (e.code === "KeyP") setPaused(); // Calls the prop function

            if (gameOver || paused) return;

            if (e.key === "ArrowLeft" && !collide(board, piece, -1, 0))
                setPiece((p) => ({ ...p, x: p.x - 1 }));

            if (e.key === "ArrowRight" && !collide(board, piece, 1, 0))
                setPiece((p) => ({ ...p, x: p.x + 1 }));

            if (e.key === "ArrowDown") stepDown();

            if (e.key === "ArrowUp") {
                const rotated = rotate(piece);
                if (!collide(board, rotated, 0, 0)) setPiece(rotated);
            }

            if (e.code === "Space") {
                let dy = 0;
                let p = piece;
                // Optimization: Use a loop with collide check
                while (!collide(board, p, 0, dy + 1)) dy++;

                const landed = { ...p, y: p.y + dy };
                const merged = merge(board, landed);
                const { newBoard, cleared } = clearLines(merged);

                setBoard(newBoard);
                if (cleared > 0) {
                    linesRef.current += cleared;
                    setLines(cleared);
                    // Speed Recalc
                    const lvl = Math.floor(linesRef.current / 10);
                    const newSpeed = Math.max(50, SPEED * Math.pow(0.9, lvl));
                    setLevelSpeed(newSpeed);
                }

                spawn();
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [board, piece, gameOver, paused]);


    const getRenderBoard = (board, piece) => {
        const temp = board.map((row) => [...row]);
        // Don't render piece if game over?
        if (!gameOver && piece) {
            const m = getMatrix(piece);
            for (let y = 0; y < m.length; y++) {
                for (let x = 0; x < m[y].length; x++) {
                    if (!m[y][x]) continue;

                    const ny = piece.y + y;
                    const nx = piece.x + x;
                    if (ny >= 0 && ny < ROWS && nx >= 0 && nx < COLS) {
                        temp[ny][nx] = piece.type;
                    }
                }
            }
        }
        return temp;
    };

    // Render Next Piece
    const renderNext = () => {
        if (!nextPiece) return null;
        const m = SHAPES[nextPiece.type][0]; // Show default rotation
        return (
            <div className="next-grid">
                {m.map((row, r) => (
                    <div key={r} className="next-row">
                        {row.map((cell, c) => (
                            <div key={`${r}-${c}`} className="next-cell"
                                style={{ backgroundColor: cell ? COLORS[nextPiece.type] : 'transparent' }}
                            />
                        ))}
                    </div>
                ))}
            </div>
        );
    };


    return (
        <div className="game-container" style={{ display: 'flex', gap: '20px' }}>
            <div className="board">
                {getRenderBoard(board, piece).map((row, r) =>
                    row.map((cell, c) => (
                        <div
                            key={`${r}-${c}`}
                            className="cell"
                            style={{
                                backgroundColor: cell ? COLORS[cell] : "transparent",
                            }}
                        />
                    ))
                )}
            </div>

            <div className="side-panel">
                <h3>Next</h3>
                {renderNext()}
            </div>
        </div>
    );
};

export default TetrisBoard;
