import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import juegosService from '../services/juegos';
import './DesafioRachas.css';

const DesafioRachas = () => {
    const [gameState, setGameState] = useState('START'); // START, PLAYING, ENDED
    const [questions, setQuestions] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [currentStreak, setCurrentStreak] = useState(0);
    const [maxStreak, setMaxStreak] = useState(0);
    const [loading, setLoading] = useState(false);
    const [hitType, setHitType] = useState(null); // 'correct', 'wrong'
    const [totalPoints, setTotalPoints] = useState(0);

    const navigate = useNavigate();

    const startGame = async () => {
        setLoading(true);
        try {
            const data = await juegosService.getStreakQuestions();
            setQuestions(data);
            setGameState('PLAYING');
            setCurrentIndex(0);
            setCurrentStreak(0);
            setMaxStreak(0);
            setTotalPoints(0);
        } catch (error) {
            console.error(error);
            alert("No se pudieron cargar las preguntas.");
        } finally {
            setLoading(false);
        }
    };

    const handleAnswer = (isCorrect) => {
        if (isCorrect) {
            const nextStreak = currentStreak + 1;
            setCurrentStreak(nextStreak);
            if (nextStreak > maxStreak) setMaxStreak(nextStreak);

            // Puntos: 10 base + (racha * 5)
            setTotalPoints(prev => prev + 10 + (nextStreak * 5));

            setHitType('correct');
            setTimeout(() => {
                setHitType(null);
                nextQuestion();
            }, 600);
        } else {
            setHitType('wrong');
            setTimeout(async () => {
                setHitType(null);
                setGameState('ENDED');
                await saveResult();
            }, 1000);
        }
    };

    const nextQuestion = () => {
        if (currentIndex < questions.length - 1) {
            setCurrentIndex(prev => prev + 1);
        } else {
            // Si terminan las 50, cargar más o terminar
            setGameState('ENDED');
            saveResult();
        }
    };

    const saveResult = async () => {
        try {
            await juegosService.guardarPartida({
                tipo_juego: 'streak',
                puntaje_total: totalPoints,
                preguntas_correctas: currentStreak, // En este modo, correctas totales o racha max? El user pide racha mas larga
                preguntas_incorrectas: 1,
                max_combo: maxStreak
            });
        } catch (e) {
            console.error("Error saving streak game:", e);
        }
    };

    if (gameState === 'START') {
        return (
            <div className="streak-container">
                <div className="screen-card glass-card fade-in">
                    <h1 className="hero-text-gradient" style={{ fontSize: '3rem' }}>Racha Imbatible 🔥</h1>
                    <p style={{ margin: '1.5rem 0', fontSize: '1.2rem' }}>
                        Responde tantas preguntas como puedas sin fallar.
                        Un error y vuelves al inicio.
                    </p>
                    <div className="streak-rules" style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '15px', textAlign: 'left', marginBottom: '2rem' }}>
                        <p>🎯 <strong>Objetivo:</strong> La racha más larga.</p>
                        <p>💎 <strong>Puntos:</strong> Aumentan con cada acierto consecutivo.</p>
                        <p>💀 <strong>Fallo:</strong> Fin de la partida.</p>
                    </div>
                    <button className="start-btn" onClick={startGame} disabled={loading}>
                        {loading ? 'Cargando...' : '¡Aceptar el Reto!'}
                    </button>
                    <button className="secondary-button" style={{ marginTop: '1rem' }} onClick={() => navigate('/desafios')}>Volver</button>
                </div>
            </div>
        );
    }

    if (gameState === 'ENDED') {
        return (
            <div className="streak-container">
                <div className="screen-card glass-card fade-in">
                    <h1 style={{ color: '#ef4444' }}>¡Racha Cortada! ⛈️</h1>
                    <div className="final-stats" style={{ margin: '2rem 0' }}>
                        <div className="streak-counter-bubble" style={{ margin: '0 auto', background: '#333' }}>
                            <span className="streak-number">{maxStreak}</span>
                            <span className="streak-label">RACHA MAX</span>
                        </div>
                        <h2 style={{ marginTop: '1.5rem', color: '#fbbf24' }}>{totalPoints} PUNTOS</h2>
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                        <button className="secondary-button" onClick={() => navigate('/desafios')}>Salir</button>
                        <button className="start-btn" style={{ marginTop: 0 }} onClick={startGame}>Intentar de Nuevo</button>
                    </div>
                </div>
            </div>
        );
    }

    const currentQ = questions[currentIndex];

    return (
        <div className={`streak-container ${hitType === 'correct' ? 'correct-hit' : (hitType === 'wrong' ? 'wrong-hit' : '')}`}>
            <header className="streak-header fade-in">
                <div className="streak-counter-bubble">
                    <span className="streak-number">{currentStreak}</span>
                    <span className="streak-label">STREAK</span>
                    {currentStreak > 0 && <div className="high-streak-badge">¡SIGUE ASÍ!</div>}
                </div>
                <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#fbbf24' }}>
                    {totalPoints} PTS
                </div>
            </header>

            <div className="glass-card streak-card fade-in" key={currentIndex}>
                <div style={{ position: 'absolute', top: '10px', right: '20px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {currentQ.area_nombre}
                </div>

                {/* Contexto de la pregunta */}
                {currentQ.contexto && (
                    <div className="streak-context" style={{
                        background: 'rgba(0, 0, 0, 0.2)',
                        padding: '1.2rem',
                        borderRadius: '12px',
                        marginBottom: '1.5rem',
                        maxHeight: '250px',
                        overflowY: 'auto',
                        fontSize: '0.95rem',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        textAlign: 'left'
                    }}>
                        {currentQ.contexto.contenido && (
                            <p style={{ whiteSpace: 'pre-line', marginBottom: currentQ.contexto.archivo ? '1rem' : 0 }}>
                                {currentQ.contexto.contenido}
                            </p>
                        )}
                        {currentQ.contexto.archivo && (
                            <img
                                src={currentQ.contexto.archivo}
                                alt="Contexto"
                                style={{ maxWidth: '100%', borderRadius: '8px', display: 'block', margin: '0 auto' }}
                            />
                        )}
                    </div>
                )}

                <p style={{ fontSize: '1.3rem', textAlign: 'center', marginBottom: '2rem' }}>{currentQ.enunciado}</p>

                <div className="bomb-options">
                    {currentQ.opciones.map((opt, i) => (
                        <button
                            key={opt.id}
                            className="option-button"
                            onClick={() => handleAnswer(opt.es_correcta)}
                            disabled={hitType !== null}
                            style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' }}
                        >
                            <span className="option-letter">{['A', 'B', 'C', 'D'][i]}</span>
                            {opt.texto}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default DesafioRachas;
