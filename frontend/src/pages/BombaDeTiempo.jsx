import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import juegosService from '../services/juegos';
import './BombaDeTiempo.css';

const START_TIME = 120;
const INCORRECT_PENALTY = 20;
const CORRECT_BONUS = 5;
const SKIP_PENALTY = 5;

const BombaDeTiempo = () => {
    const [gameState, setGameState] = useState('START'); // START, PLAYING, EXPLODED
    const [questions, setQuestions] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [timeLeft, setTimeLeft] = useState(START_TIME);
    const [score, setScore] = useState(0);
    const [stats, setStats] = useState({ correct: 0, incorrect: 0, skipped: 0 });
    const [loading, setLoading] = useState(false);
    const [feedback, setFeedback] = useState(null); // { type: 'gain'|'loss', amount: string }

    const navigate = useNavigate();

    const startGame = async () => {
        setLoading(true);
        try {
            const data = await juegosService.getQuickQuestions();
            setQuestions(data);
            setGameState('PLAYING');
            setTimeLeft(START_TIME);
            setScore(0);
            setCurrentIndex(0);
            setStats({ correct: 0, incorrect: 0, skipped: 0 });
        } catch (error) {
            console.error("Error al cargar preguntas:", error);
            alert("No se pudo iniciar el juego. Intente de nuevo.");
        } finally {
            setLoading(false);
        }
    };

    const triggerFeedback = (type, amount) => {
        setFeedback({ type, amount });
        setTimeout(() => setFeedback(null), 1000);
    };

    const handleAnswer = (isCorrect) => {
        if (isCorrect) {
            setTimeLeft(prev => prev + CORRECT_BONUS);
            setScore(prev => prev + 100);
            setStats(prev => ({ ...prev, correct: prev.correct + 1 }));
            triggerFeedback('gain', `+${CORRECT_BONUS}s`);
        } else {
            setTimeLeft(prev => Math.max(0, prev - INCORRECT_PENALTY));
            setStats(prev => ({ ...prev, incorrect: prev.incorrect + 1 }));
            triggerFeedback('loss', `-${INCORRECT_PENALTY}s`);
        }
        nextQuestion();
    };

    const handleSkip = () => {
        setTimeLeft(prev => Math.max(0, prev - SKIP_PENALTY));
        setStats(prev => ({ ...prev, skipped: prev.skipped + 1 }));
        triggerFeedback('loss', `-${SKIP_PENALTY}s`);
        nextQuestion();
    };

    const nextQuestion = () => {
        if (currentIndex < questions.length - 1) {
            setCurrentIndex(prev => prev + 1);
        } else {
            // Re-fetch or end if we want, but usually we just end or loop
            setGameState('EXPLODED');
        }
    };

    useEffect(() => {
        let timer;
        if (gameState === 'PLAYING' && timeLeft > 0) {
            timer = setInterval(() => {
                setTimeLeft(prev => prev - 1);
            }, 1000);
        } else if (timeLeft <= 0 && gameState === 'PLAYING') {
            setGameState('EXPLODED');
            saveGame();
        }
        return () => clearInterval(timer);
    }, [gameState, timeLeft]);

    const saveGame = async () => {
        try {
            await juegosService.guardarPartida({
                tipo_juego: 'bomb',
                puntaje_total: score,
                preguntas_correctas: stats.correct,
                preguntas_incorrectas: stats.incorrect,
                max_combo: 0
            });
        } catch (e) {
            console.error("Error saving game:", e);
        }
    };

    if (gameState === 'START') {
        return (
            <div className="bomb-container">
                <div className="screen-card glass-card fade-in">
                    <h1 className="hero-text-gradient" style={{ fontSize: '3.5rem' }}>Bomba de Tiempo 💣</h1>
                    <p style={{ fontSize: '1.2rem', margin: '1.5rem 0' }}>
                        ¡Desactiva la bomba respondiendo correctamente!
                        El tiempo es tu vida.
                    </p>
                    <div className="rules" style={{ textAlign: 'left', background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '10px' }}>
                        <p>✅ Correcta: <strong>+{CORRECT_BONUS}s</strong></p>
                        <p>❌ Incorrecta: <strong>-{INCORRECT_PENALTY}s</strong></p>
                        <p>⏭️ Saltar: <strong>-{SKIP_PENALTY}s</strong></p>
                    </div>
                    <button className="start-btn" onClick={startGame} disabled={loading}>
                        {loading ? 'Preparando...' : '¡Iniciar Defuse!'}
                    </button>
                    <button className="secondary-button" style={{ marginTop: '1rem' }} onClick={() => navigate('/desafios')}>Volver</button>
                </div>
            </div>
        );
    }

    if (gameState === 'EXPLODED') {
        return (
            <div className="explosion-overlay">
                <div className="bomb-final-screen fade-in">
                    <h1 style={{ fontSize: '4rem', color: '#ef4444' }}>¡BOOM! 💥</h1>
                    <p style={{ fontSize: '1.5rem', marginBottom: '2rem' }}>Puntaje: {score}</p>
                    <div className="mini-stats" style={{ display: 'flex', gap: '2rem', marginBottom: '3rem' }}>
                        <div><span>Correctas</span><h3>{stats.correct}</h3></div>
                        <div><span>Incorrectas</span><h3>{stats.incorrect}</h3></div>
                        <div><span>Saltadas</span><h3>{stats.skipped}</h3></div>
                    </div>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <button className="secondary-button" onClick={() => navigate('/desafios')}>Salir</button>
                        <button className="start-btn" style={{ marginTop: 0 }} onClick={startGame}>Reintentar</button>
                    </div>
                </div>
            </div>
        );
    }

    const currentQ = questions[currentIndex];

    return (
        <div className={`bomb-container ${timeLeft < 20 ? 'danger-zone' : ''}`}>
            <div className="timer-bomb-wrapper">
                <div className={`timer-circle ${timeLeft < 20 ? 'danger' : ''}`}>
                    <span className="time-display">{timeLeft}</span>
                    <span style={{ fontSize: '0.8rem', color: '#666' }}>SEGUNDOS</span>
                </div>
                <div className="bomb-wick"></div>
                <div className="bomb-spark">🔥</div>
                {feedback && (
                    <div className={`time-event ${feedback.type}`}>
                        {feedback.amount}
                    </div>
                )}
            </div>

            <div className="bomb-game-box fade-in">
                {currentQ?.contexto && (
                    <div className="context-mini" style={{ fontSize: '0.9rem', color: '#9ca3af', marginBottom: '1rem', fontStyle: 'italic' }}>
                        {currentQ.contexto.contenido?.substring(0, 100)}...
                    </div>
                )}
                <p className="question-text">{currentQ?.enunciado}</p>

                <div className="bomb-options">
                    {currentQ?.opciones.map((opt, i) => (
                        <button
                            key={opt.id}
                            className="option-button"
                            style={{ background: 'rgba(0,0,0,0.5)', borderColor: '#333' }}
                            onClick={() => handleAnswer(opt.es_correcta)}
                        >
                            <span className="option-letter">{['A', 'B', 'C', 'D'][i]}</span>
                            {opt.texto}
                        </button>
                    ))}
                    <button className="skip-btn" onClick={handleSkip}>
                        ⏭️ Saltar Pregunta (-5s)
                    </button>
                </div>
            </div>

            <div style={{ marginTop: '2rem', color: '#444', fontWeight: 'bold' }}>
                PUNTOS: <span style={{ color: '#fbbf24' }}>{score}</span>
            </div>
        </div>
    );
};

export default BombaDeTiempo;
