import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import juegosService from '../services/juegos';
import './DesafioRapido.css';

const GAME_DURATION = 60;

const DesafioRapido = () => {
    const [gameState, setGameState] = useState('START'); // START, PLAYING, FINISHED
    const [questions, setQuestions] = useState([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [score, setScore] = useState(0);
    const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
    const [combo, setCombo] = useState(0);
    const [maxCombo, setMaxCombo] = useState(0);
    const [stats, setStats] = useState({ correct: 0, incorrect: 0 });
    const [feedback, setFeedback] = useState(null); // 'correct', 'incorrect'
    const [loading, setLoading] = useState(false);

    const navigate = useNavigate();

    const startGame = async () => {
        setLoading(true);
        try {
            const data = await juegosService.getQuickQuestions();
            if (!data || data.length === 0) {
                alert("No se encontraron preguntas rápidas disponibles en este momento.");
                setLoading(false);
                return;
            }
            setQuestions(data);
            setGameState('PLAYING');
            setScore(0);
            setTimeLeft(GAME_DURATION);
            setCombo(0);
            setMaxCombo(0);
            setStats({ correct: 0, incorrect: 0 });
            setCurrentQuestionIndex(0);
        } catch (error) {
            console.error("Error al cargar preguntas:", error);
            if (error.message.includes('401') || error.message.includes('No autorizado')) {
                alert("Tu sesión ha expirado o no has iniciado sesión.");
                navigate('/login');
            } else {
                alert("Hubo un error al cargar el desafío. Por favor, intenta de nuevo.");
            }
        } finally {
            setLoading(false);
        }
    };


    const finishGame = useCallback(async () => {
        setGameState('FINISHED');
        try {
            await juegosService.guardarPartida({
                puntaje_total: score,
                preguntas_correctas: stats.correct,
                preguntas_incorrectas: stats.incorrect,
                max_combo: maxCombo
            });
        } catch (error) {
            console.error("Error al guardar partida:", error);
        }
    }, [score, stats, maxCombo]);

    useEffect(() => {
        let timer;
        if (gameState === 'PLAYING' && timeLeft > 0) {
            timer = setInterval(() => {
                setTimeLeft(prev => prev - 1);
            }, 1000);
        } else if (timeLeft === 0 && gameState === 'PLAYING') {
            finishGame();
        }
        return () => clearInterval(timer);
    }, [gameState, timeLeft, finishGame]);

    const handleAnswer = (isCorrect) => {
        if (feedback) return; // Prevent double clicking

        if (isCorrect) {
            const newCombo = combo + 1;
            setCombo(newCombo);
            if (newCombo > maxCombo) setMaxCombo(newCombo);

            let pointsToAdd = 100;
            if (newCombo >= 3) pointsToAdd += 50; // Combo bonus

            setScore(prev => prev + pointsToAdd);
            setStats(prev => ({ ...prev, correct: prev.correct + 1 }));
            setFeedback('correct');
        } else {
            setCombo(0);
            setScore(prev => Math.max(0, prev - 50));
            setStats(prev => ({ ...prev, incorrect: prev.incorrect + 1 }));
            setFeedback('incorrect');
        }

        setTimeout(() => {
            setFeedback(null);
            if (currentQuestionIndex < questions.length - 1) {
                setCurrentQuestionIndex(prev => prev + 1);
            } else {
                // If we run out of fetched questions, we could fetch more or just end
                finishGame();
            }
        }, 600);
    };

    if (gameState === 'START') {
        return (
            <div className="game-container start-screen fade-in">
                <h1>Desafío Rápido</h1>
                <p>Responde tantas preguntas como puedas en 60 segundos.</p>
                <div className="rules">
                    <ul>
                        <li>✅ Respuesta correcta: +100 puntos</li>
                        <li>❌ Respuesta incorrecta: -50 puntos</li>
                        <li>🔥 Combo (3+ seguidas): +50 puntos extra</li>
                    </ul>
                </div>
                <button
                    className="start-button"
                    onClick={startGame}
                    disabled={loading}
                >
                    {loading ? 'Cargando...' : '¡Comenzar!'}
                </button>
            </div>
        );
    }

    if (gameState === 'FINISHED') {
        return (
            <div className="game-container finished-screen fade-in">
                <h1>¡Tiempo Agotado!</h1>
                <div className="final-stats">
                    <div className="stat-card">
                        <span className="stat-label">Puntaje Final</span>
                        <span className="stat-value highlight">{score}</span>
                    </div>
                    <div className="stat-grid">
                        <div className="mini-stat">
                            <span>Correctas</span>
                            <span>{stats.correct}</span>
                        </div>
                        <div className="mini-stat">
                            <span>Incorrectas</span>
                            <span>{stats.incorrect}</span>
                        </div>
                        <div className="mini-stat">
                            <span>Máximo Combo</span>
                            <span>{maxCombo}</span>
                        </div>
                    </div>
                </div>
                <div className="actions">
                    <button className="secondary-button" onClick={() => navigate('/')}>Volver al Inicio</button>
                    <button className="start-button" onClick={startGame}>Jugar de Nuevo</button>
                </div>
            </div>
        );
    }

    const currentQuestion = questions[currentQuestionIndex];

    return (
        <div className="game-container playing-screen">
            <div className="game-header">
                <div className="timer-container">
                    <div className="timer-bar" style={{ width: `${(timeLeft / GAME_DURATION) * 100}%` }}></div>
                    <span className="timer-text">{timeLeft}s</span>
                </div>
                <div className="score-container">
                    <span className="score-label">Puntos:</span>
                    <span className="score-value">{score}</span>
                    {combo >= 2 && <span className="combo-badge">🔥 {combo} COMBO</span>}
                </div>
            </div>

            <div className={`question-card ${feedback ? `feedback-${feedback}` : ''}`}>
                {currentQuestion.contexto && (
                    <div className="context-box">
                        {currentQuestion.contexto.contenido && (
                            <p style={{ whiteSpace: 'pre-line', marginBottom: currentQuestion.contexto.archivo ? '1rem' : 0 }}>
                                {currentQuestion.contexto.contenido}
                            </p>
                        )}
                        {currentQuestion.contexto.archivo && (
                            <img
                                src={currentQuestion.contexto.archivo}
                                alt="Contexto"
                                style={{ maxWidth: '100%', borderRadius: '8px', display: 'block', margin: '0 auto' }}
                            />
                        )}
                    </div>
                )}
                <div className="question-area">
                    <span className="area-tag">{currentQuestion.area_nombre}</span>
                    <p className="question-text">{currentQuestion.enunciado}</p>
                </div>



                <div className="options-grid">
                    {currentQuestion.opciones.map((opcion, idx) => (
                        <button
                            key={opcion.id}
                            className="option-button"
                            onClick={() => handleAnswer(opcion.es_correcta)}
                            disabled={!!feedback}
                        >
                            <span className="option-letter">{String.fromCharCode(65 + idx)}</span>
                            <span className="option-text">{opcion.texto}</span>
                        </button>
                    ))}
                </div>
            </div>

            {feedback && (
                <div className={`feedback-overlay ${feedback}`}>
                    {feedback === 'correct' ? '¡Correcto! +100' : 'Incorrecto -50'}
                </div>
            )}
        </div>
    );
};

export default DesafioRapido;
