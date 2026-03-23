import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import juegosService from '../services/juegos';
import './DueloMultijugador.css';

const DueloMultijugador = () => {
    const [view, setView] = useState('CHOICE'); // CHOICE, CREATE, JOIN, LOBBY, GAME, END
    const [config, setConfig] = useState({
        num_jugadores_max: 4,
        num_preguntas: 10,
        dificultad: 'media',
        areas: []
    });
    const [room, setRoom] = useState(null);
    const [joinCode, setJoinCode] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const pollRef = useRef(null);
    const navigate = useNavigate();

    // Áreas del ICFES mapeadas a los nombres exactos en la Base de Datos
    const allAreas = [
        { id: 'mat', label: 'Matemáticas', value: 'Matematicas' },
        { id: 'lc', label: 'Lectura Crítica', value: 'Lectura Crítica' },
        { id: 'cn', label: 'Ciencias Naturales', value: 'Ciencias_Naturales' },
        { id: 'soc', label: 'Sociales y Ciudadanas', value: 'Ciencias_Sociales_y_Competencias_Ciudadanas' }
    ];

    const handleCreate = async () => {
        setLoading(true);
        try {
            const data = await juegosService.crearSala(config);
            setRoom(data);
            setView('LOBBY');
        } catch (e) {
            setError(e.response?.data?.error || "Error al crear sala");
        } finally {
            setLoading(false);
        }
    };

    const handleJoin = async () => {
        setLoading(true);
        try {
            const data = await juegosService.unirseSala(joinCode);
            setRoom(data);
            setView('LOBBY');
        } catch (e) {
            setError(e.response?.data?.error || "Sala no encontrada");
        } finally {
            setLoading(false);
        }
    };

    // Polling del estado de la sala
    useEffect(() => {
        if (view === 'LOBBY' || view === 'GAME') {
            const poll = async () => {
                try {
                    const data = await juegosService.getSalaStatus(room.codigo);
                    setRoom(data);
                    if (data.estado === 'PLAYING') setView('GAME');
                    if (data.estado === 'FINISHED') setView('END');
                } catch (e) {
                    console.error("Polling error", e);
                }
            };
            pollRef.current = setInterval(poll, 2000);
        } else {
            if (pollRef.current) clearInterval(pollRef.current);
        }
        return () => { if (pollRef.current) clearInterval(pollRef.current); };
    }, [view, room?.codigo]);

    const handleStart = async () => {
        try {
            await juegosService.iniciarJuegoSala(room.codigo);
            setView('GAME');
        } catch (e) { console.error(e); }
    };

    const handleAnswer = async (esCorrecta) => {
        try {
            await juegosService.responderMulti(room.codigo, esCorrecta);
            // El polling actualizará la pregunta
        } catch (e) {
            alert(e.response?.data?.error || "Error");
        }
    };

    if (view === 'CHOICE') {
        return (
            <div className="multi-container">
                <div className="glass-card fade-in" style={{ textAlign: 'center', padding: '3rem' }}>
                    <h1 className="hero-text-gradient" style={{ fontSize: '3rem' }}>Duelo Multijugador ⚔️</h1>
                    <p style={{ margin: '2rem 0' }}>Enfréntate a tus amigos en tiempo real.</p>
                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                        <button className="btn-primary" onClick={() => setView('CREATE')}>Crear Sala</button>
                        <button className="secondary-button" onClick={() => setView('JOIN')}>Unirse a Sala</button>
                    </div>
                </div>
            </div>
        );
    }

    if (view === 'CREATE') {
        return (
            <div className="multi-container">
                <div className="glass-card fade-in" style={{ width: '90%', maxWidth: '500px' }}>
                    <h2>Configurar Partida</h2>
                    <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <label>Jugadores Máx:
                            <input type="number" value={config.num_jugadores_max} onChange={e => setConfig({ ...config, num_jugadores_max: e.target.value })} style={{ width: '100%', background: '#000', border: '1px solid #333', color: '#fff', padding: '10px' }} />
                        </label>
                        <label>Dificultad:
                            <select value={config.dificultad} onChange={e => setConfig({ ...config, dificultad: e.target.value })} style={{ width: '100%', background: '#000', border: '1px solid #333', color: '#fff', padding: '10px' }}>
                                <option value="facil">Fácil</option>
                                <option value="media">Media</option>
                                <option value="dificil">Difícil</option>
                            </select>
                        </label>
                        <label>Áreas:
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px', marginTop: '5px' }}>
                                {allAreas.map(a => (
                                    <label key={a.id} style={{ fontSize: '0.8rem' }}>
                                        <input type="checkbox" onChange={e => {
                                            const newAreas = e.target.checked ? [...config.areas, a.value] : config.areas.filter(x => x !== a.value);
                                            setConfig({ ...config, areas: newAreas });
                                        }} /> {a.label}
                                    </label>
                                ))}
                            </div>
                        </label>
                    </div>
                    {error && <p style={{ color: '#ef4444', marginTop: '1rem', textAlign: 'center' }}>{error}</p>}
                    <button className="start-btn" onClick={handleCreate} disabled={loading} style={{ width: '100%', marginTop: '2rem' }}>Crear Sala</button>
                    <button className="secondary-button" onClick={() => setView('CHOICE')} style={{ width: '100%', marginTop: '0.5rem' }}>Atrás</button>
                </div>
            </div>
        );
    }

    if (view === 'JOIN') {
        return (
            <div className="multi-container">
                <div className="glass-card fade-in" style={{ textAlign: 'center' }}>
                    <h2>Unirse a Duelo</h2>
                    <input
                        placeholder="CÓDIGO DE SALA"
                        value={joinCode}
                        onChange={e => setJoinCode(e.target.value.toUpperCase())}
                        style={{ display: 'block', width: '100%', margin: '2rem 0', padding: '15px', background: '#000', border: '1px solid #var(--primary)', color: 'var(--primary)', textAlign: 'center', fontSize: '1.5rem', borderRadius: '10px' }}
                    />
                    {error && <p style={{ color: '#ef4444' }}>{error}</p>}
                    <button className="start-btn" onClick={handleJoin} disabled={loading} style={{ width: '100%' }}>Entrar</button>
                    <button className="secondary-button" onClick={() => setView('CHOICE')} style={{ width: '100%', marginTop: '0.5rem' }}>Atrás</button>
                </div>
            </div>
        );
    }

    if (view === 'LOBBY') {
        const userEmail = localStorage.getItem('user_email');
        const isHost = room?.creador_email === userEmail;

        if (!userEmail) {
            return (
                <div className="multi-container">
                    <div className="glass-card" style={{ textAlign: 'center' }}>
                        <h2 style={{ color: '#ef4444' }}>⚠️ Sesión incompleta</h2>
                        <p>Por favor, cierra sesión y vuelve a ingresar para poder participar en duelos.</p>
                        <button className="btn-primary" onClick={() => navigate('/login')} style={{ marginTop: '1rem' }}>Ir al Login</button>
                    </div>
                </div>
            );
        }

        return (
            <div className="multi-container">
                <div className="glass-card lobby-box fade-in">
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>CÓDIGO DE ACCESO</span>
                    <div className="room-code-display">{room?.codigo}</div>
                    <p>Esperando jugadores ({room?.participantes.length}/{room?.num_jugadores_max})</p>

                    <div className="players-list">
                        {(room?.participantes || []).map(p => (
                            <div key={p.id} className={`player-tag ${p.email === room.creador_email ? 'is-creador' : ''}`}>
                                👤 {p.email.split('@')[0]} {p.email === room.creador_email ? '(Host)' : ''}
                            </div>
                        ))}
                    </div>

                    {isHost ? (
                        <button className="start-btn" onClick={handleStart} style={{ width: '100%' }}>Iniciar Duelo</button>
                    ) : (
                        <p style={{ fontStyle: 'italic', color: 'var(--primary)' }}>Esperando que el host inicie...</p>
                    )}
                </div>
            </div>
        );
    }

    if (view === 'GAME') {
        const currentQ = room?.pregunta_actual;
        const userEmail = localStorage.getItem('user_email');
        const myPart = room?.participantes.find(p => p.email === userEmail);
        const isHost = room?.creador_email === userEmail;

        const hasJustResponded = myPart?.respondio_actual;
        const isPenalizedFromPrevious = myPart?.bloqueado_hasta_pregunta >= room?.pregunta_actual_idx;
        const isBuzzerBlocked = hasJustResponded || isPenalizedFromPrevious;

        return (
            <div className="multi-container">
                <div className="multi-game-layout">
                    <div className="game-zone">
                        <div className="glass-card" key={currentQ?.id} style={{ position: 'relative', minHeight: '350px' }}>
                            {isBuzzerBlocked && (
                                <div className="penalty-overlay" style={{ flexDirection: 'column', gap: '10px' }}>
                                    <span>⚠️ BLOQUEADO</span>
                                    <span style={{ fontSize: '1rem', opacity: 0.8 }}>
                                        {hasJustResponded ? "Ya respondiste esta pregunta" : "Penalizado por error previo"}
                                    </span>
                                    {isHost && (
                                        <button
                                            className="secondary-button"
                                            style={{ marginTop: '20px', padding: '5px 15px' }}
                                            onClick={() => handleAnswer(true)} // Skip manual enviando true (ganar punto forzado)
                                        >
                                            Saltar Pregunta (Forzar)
                                        </button>
                                    )}
                                </div>
                            )}

                            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '1rem' }}>
                                <span>Pregunta {room.pregunta_actual_idx + 1} / {room.num_preguntas}</span>
                                <span>{currentQ?.area_nombre}</span>
                            </div>

                            {/* Contexto de la pregunta */}
                            {currentQ?.contexto && (
                                <div
                                    key={currentQ.contexto.id}
                                    style={{
                                        background: 'rgba(255,255,255,0.05)',
                                        padding: '1.2rem',
                                        borderRadius: '10px',
                                        marginBottom: '1.5rem',
                                        borderLeft: '4px solid var(--primary)',
                                        fontSize: '0.9rem',
                                        lineHeight: '1.5',
                                        color: '#cbd5e1',
                                        maxHeight: '250px',
                                        overflowY: 'auto'
                                    }}
                                >
                                    <div style={{ fontWeight: 'bold', color: 'var(--primary)', marginBottom: '0.5rem', fontSize: '0.7rem', textTransform: 'uppercase' }}>
                                        Contexto:
                                    </div>
                                    {currentQ.contexto.contenido}
                                    {currentQ.contexto.archivo && (
                                        <img
                                            src={`${import.meta.env.VITE_API_URL.replace('/api', '')}${currentQ.contexto.archivo}`}
                                            alt="Contexto"
                                            style={{ maxWidth: '100%', marginTop: '1rem', borderRadius: '8px', display: 'block' }}
                                        />
                                    )}
                                </div>
                            )}

                            {currentQ?.imagen_url && (
                                <img
                                    src={currentQ.imagen_url}
                                    alt="Pregunta"
                                    style={{ maxWidth: '100%', marginBottom: '1.5rem', borderRadius: '8px' }}
                                />
                            )}

                            <p style={{ fontSize: '1.3rem', marginBottom: '2.5rem', fontWeight: 'bold', lineHeight: '1.4' }}>{currentQ?.enunciado}</p>

                            <div className="bomb-options">
                                {currentQ?.opciones.map((opt, i) => (
                                    <button
                                        key={opt.id}
                                        className="option-button"
                                        style={{ background: 'rgba(255,255,255,0.05)' }}
                                        onClick={() => handleAnswer(opt.es_correcta)}
                                        disabled={isBuzzerBlocked}
                                    >
                                        <span className="option-letter">{['A', 'B', 'C', 'D'][i]}</span>
                                        {opt.texto}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="ranking-panel">
                        <h3 style={{ marginBottom: '1rem', borderBottom: '1px solid #333', paddingBottom: '5px' }}>Ranking</h3>
                        {[...(room?.participantes || [])].sort((a, b) => b.puntaje - a.puntaje).map(p => (
                            <div key={p.id} className="ranking-item">
                                <span style={{ color: p.respondio_actual ? '#ef4444' : '#fff' }}>
                                    {p.email.split('@')[0]}
                                </span>
                                <span style={{ fontWeight: 'bold', color: 'var(--primary)' }}>{p.puntaje}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    if (view === 'END') {
        const winner = [...(room?.participantes || [])].sort((a, b) => b.puntaje - a.puntaje)[0];
        return (
            <div className="multi-container">
                <div className="glass-card fade-in" style={{ textAlign: 'center', padding: '4rem' }}>
                    <h1 style={{ fontSize: '4rem' }}>🏆</h1>
                    <h1 className="hero-text-gradient">¡Victoria para {winner?.email?.split('@')[0]}!</h1>
                    <div style={{ margin: '2rem 0' }}>
                        {(room?.participantes || []).map(p => (
                            <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', width: '250px', margin: '0.5rem auto' }}>
                                <span>{p.email.split('@')[0]}</span>
                                <span style={{ fontWeight: 'bold' }}>{p.puntaje} pts</span>
                            </div>
                        ))}
                    </div>
                    <button className="start-btn" onClick={() => navigate('/desafios')}>Volver a Desafíos</button>
                </div>
            </div>
        );
    }

    return null;
};

export default DueloMultijugador;
