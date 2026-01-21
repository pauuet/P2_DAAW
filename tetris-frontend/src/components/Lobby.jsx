import { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'https://tetris-backend-0qra.onrender.com';

function Lobby({ onJoin, players }) {
    const [username, setUsername] = useState(localStorage.getItem('tetris_username') || '');
    const [rankings, setRankings] = useState([]);
    const [error, setError] = useState(null);

    useEffect(() => {
        // Load rankings
        axios.get(API_URL)
            .then(res => {
                setRankings(res.data);
                setError(null);
            })
            .catch(err => {
                console.error("Error loading rankings:", err);
                setError("Failed to load rankings. Check console.");
            });
    }, []);

    const handleJoin = (e) => {
        e.preventDefault();
        if (!username) return;
        localStorage.setItem('tetris_username', username);
        onJoin(username);
    };

    return (
        <div className="lobby-container">
            <h1>Tetris Multiplayer Lobby</h1>

            <div className="login-section">
                <form onSubmit={handleJoin}>
                    <input
                        type="text"
                        placeholder="Enter Username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="input-field"
                    />
                    <div style={{ marginTop: '10px' }}>
                        <button type="submit" className="btn primary" style={{ marginRight: '10px' }}>Join Multiplayer</button>
                        <button type="button" className="btn secondary" onClick={() => onJoin(username, true)}>Practice (Solo)</button>
                    </div>
                </form>
            </div>

            <div className="lobby-columns">
                <div className="players-list">
                    <h3>Connected Players</h3>
                    <ul>
                        {players.map((p) => (
                            <li key={p.id} style={{ color: p.color }}>
                                {p.username} {p.playing ? '(Playing)' : '(Waiting)'}
                            </li>
                        ))}
                    </ul>
                    {players.length > 0 && <p className="instruction">Waiting for START (Enter)...</p>}
                </div>

                <div className="rankings-list">
                    <h3>🏆 Top Rankings</h3>
                    {error && <p style={{ color: 'red' }}>{error}</p>}
                    {!error && rankings.length === 0 && <p>No rankings yet.</p>}
                    <table>
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Lvl</th>
                                <th>Lines</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rankings.map((r, i) => (
                                <tr key={r.id}>
                                    <td>{i + 1}. {r.username}</td>
                                    <td>{r.level}</td>
                                    <td>{r.lines}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

export default Lobby;
