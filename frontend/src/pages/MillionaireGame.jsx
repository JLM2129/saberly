import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import juegosService from '../services/juegos';
import { formatImageUrl } from '../utils/url';
import './MillionaireGame.css';

const PRIZES = [
    '1.000', '2.000', '3.000', '5.000', '10.000',
    '20.000', '40.000', '50.000', '100.000', '250.000',
    '400.000', '500.000', '600.000', '800.000', '1.000.000'
];

const SAFE_LEVELS = [4, 9]; // Level index (0-based) where money is guaranteed

const MillionaireGame = () => {
    const [gameState, setGameState] = useState('START'); // START, PLAYING, WON, LOST, RETIRED
    const [questions, setQuestions] = useState([]);
    const [currentLevel, setCurrentLevel] = useState(0);
    const [selectedOption, setSelectedOption] = useState(null);
    const [isChecking, setIsChecking] = useState(false);
    const [lifelines, setLifelines] = useState({
        fiftyFifty: { used: false },
        phone: { used: false },
        public: { used: false }
    });
    const [removedOptions, setRemovedOptions] = useState([]);
    const [hint, setHint] = useState(null);
    const [loading, setLoading] = useState(false);

    const navigate = useNavigate();

    const fetchQuestions = async () => {
        setLoading(true);
        try {
            const data = await juegosService.getMillionaireQuestions();
            setQuestions(data);
            setGameState('PLAYING');
            setCurrentLevel(0);
            setLifelines({
                fiftyFifty: { used: false },
                phone: { used: false },
                public: { used: false }
            });
            setRemovedOptions([]);
            setHint(null);
        } catch (error) {
            console.error("Error fetching questions:", error);
            alert("No pudimos cargar el juego. Intenta de nuevo.");
        } finally {
            setLoading(false);
        }
    };

    const handleAnswer = (option) => {
        if (isChecking) return;
        setSelectedOption(option);
        setIsChecking(true);

        // Delay to show selected color before correct/wrong
        setTimeout(async () => {
            if (option.es_correcta) {
                if (currentLevel === 14) {
                    setGameState('WON');
                    await savePartida(getCurrentPoints(14));
                } else {
                    // Next level
                    setTimeout(() => {
                        setCurrentLevel(prev => prev + 1);
                        setSelectedOption(null);
                        setIsChecking(false);
                        setRemovedOptions([]);
                        setHint(null);
                    }, 1000);
                }
            } else {
                setGameState('LOST');
                await savePartida(getSafePoints());
            }
        }, 1500);
    };

    const getCurrentPoints = (level) => {
        return parseInt(PRIZES[level].replace(/\./g, ''));
    };

    const getSafePoints = () => {
        let safeLevel = -1;
        SAFE_LEVELS.forEach(lvl => {
            if (currentLevel > lvl) safeLevel = lvl;
        });
        return safeLevel === -1 ? 0 : getCurrentPoints(safeLevel);
    };

    const savePartida = async (finalScore) => {
        try {
            await juegosService.guardarPartida({
                tipo_juego: 'millionaire',
                puntaje_total: finalScore,
                preguntas_correctas: currentLevel + (gameState === 'WON' ? 1 : 0),
                preguntas_incorrectas: gameState === 'LOST' ? 1 : 0,
                max_combo: 0 // Not relevant for this mode
            });
        } catch (e) {
            console.error("Error saving game:", e);
        }
    };

    const handleRetire = async () => {
        const points = currentLevel === 0 ? 0 : getCurrentPoints(currentLevel - 1);
        setGameState('RETIRED');
        await savePartida(points);
    };

    // Lifeline: 50/50
    const useFiftyFifty = () => {
        if (lifelines.fiftyFifty.used || isChecking) return;
        const currentQ = questions[currentLevel];
        const wrongOptions = currentQ.opciones
            .filter(o => !o.es_correcta)
            .sort(() => Math.random() - 0.5)
            .slice(0, 2);

        setRemovedOptions(wrongOptions.map(o => o.id));
        setLifelines(prev => ({ ...prev, fiftyFifty: { used: true } }));
    };

    // Lifeline: Phone a friend
    const usePhoneAFriend = () => {
        if (lifelines.phone.used || isChecking) return;
        const currentQ = questions[currentLevel];
        const correctOpt = currentQ.opciones.find(o => o.es_correcta);
        const prefix = ['A', 'B', 'C', 'D'][currentQ.opciones.indexOf(correctOpt)];

        setHint(`Tu amigo dice: "Estoy un 80% seguro de que la respuesta es la ${prefix}"`);
        setLifelines(prev => ({ ...prev, phone: { used: true } }));
    };

    // Lifeline: Public Vote
    const usePublicVote = () => {
        if (lifelines.public.used || isChecking) return;
        const currentQ = questions[currentLevel];
        const correctIdx = currentQ.opciones.findIndex(o => o.es_correcta);

        const votes = [0, 0, 0, 0];
        let remaining = 100;

        // Give the correct one a majority
        const mainPercentage = Math.floor(Math.random() * (75 - 45) + 45);
        votes[correctIdx] = mainPercentage;
        remaining -= mainPercentage;

        // Distribute remaining
        for (let i = 0; i < 3; i++) {
            const idx = votes.findIndex((v, index) => v === 0 && index !== correctIdx);
            if (idx === -1) break;
            if (i === 2) {
                votes[idx] = remaining;
            } else {
                const p = Math.floor(Math.random() * remaining);
                votes[idx] = p;
                remaining -= p;
            }
        }

        const hintText = votes.map((v, i) => `${['A', 'B', 'C', 'D'][i]}: ${v}%`).join(' | ');
        setHint(`Votación del público: ${hintText}`);
        setLifelines(prev => ({ ...prev, public: { used: true } }));
    };

    if (loading) return <div className="millionaire-container"><h1>Cargando el Desafío...</h1></div>;

    if (gameState === 'START') {
        return (
            <div className="millionaire-container">
                <div className="screen-card glass-card fade-in">
                    <h1 className="hero-text-gradient" style={{ fontSize: '3rem' }}>El Sabio Millonario</h1>
                    <p style={{ marginTop: '1rem', fontSize: '1.2rem' }}>
                        Supera los 15 niveles de conocimiento para ganar 1.000.000 de puntos.
                        <br /><br />
                        ⚠️ Un error y el juego termina.
                    </p>
                    <button className="start-btn" onClick={fetchQuestions}>¡Aceptar el Reto!</button>
                </div>
            </div>
        );
    }

    if (gameState === 'WON' || gameState === 'LOST' || gameState === 'RETIRED') {
        const finalPoints = gameState === 'WON' ? '1.000.000' :
            gameState === 'RETIRED' ? (currentLevel === 0 ? '0' : PRIZES[currentLevel - 1]) :
                getSafePoints().toLocaleString();

        return (
            <div className="millionaire-container">
                <div className="screen-card glass-card fade-in">
                    <h1 className={gameState === 'WON' ? 'hero-text-gradient' : ''}>
                        {gameState === 'WON' ? '¡FELICIDADES MILLONARIO!' :
                            gameState === 'RETIRED' ? 'Te retiraste a tiempo' : 'Juego Terminado'}
                    </h1>
                    <p style={{ fontSize: '1.5rem', margin: '2rem 0' }}>
                        Puntaje obtenido: <span style={{ color: '#fbbf24', fontWeight: 'bold' }}>{finalPoints} pts</span>
                    </p>
                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                        <button className="secondary-button" onClick={() => navigate('/')}>Inicio</button>
                        <button className="start-btn" onClick={fetchQuestions} style={{ marginTop: 0 }}>Jugar de Nuevo</button>
                    </div>
                </div>
            </div>
        );
    }

    const currentQ = questions[currentLevel];

    return (
        <div className="millionaire-container">
            <div className="game-layout">
                {/* Left side: Questions and Lifelines */}
                <div className="question-section">
                    <div className="lifelines">
                        <button
                            className={`lifeline-btn ${lifelines.fiftyFifty.used ? 'used' : ''}`}
                            onClick={useFiftyFifty}
                            disabled={lifelines.fiftyFifty.used || isChecking}
                        >
                            50:50
                        </button>
                        <button
                            className={`lifeline-btn ${lifelines.phone.used ? 'used' : ''}`}
                            onClick={usePhoneAFriend}
                            disabled={lifelines.phone.used || isChecking}
                        >
                            📞
                        </button>
                        <button
                            className={`lifeline-btn ${lifelines.public.used ? 'used' : ''}`}
                            onClick={usePublicVote}
                            disabled={lifelines.public.used || isChecking}
                        >
                            👥
                        </button>
                    </div>

                    <div className="millionaire-card fade-in" key={currentLevel}>
                        <div className="level-indicator">Nivel {currentLevel + 1} - Area: {currentQ.area_nombre}</div>

                        {/* Contexto de la pregunta */}
                        {currentQ.contexto && (
                            <div className="millionaire-context" style={{
                                background: 'rgba(0, 0, 0, 0.3)',
                                padding: '1.5rem',
                                borderRadius: '15px',
                                marginBottom: '1.5rem',
                                maxHeight: '300px',
                                overflowY: 'auto',
                                fontSize: '1rem',
                                border: '1px solid rgba(59, 130, 246, 0.3)',
                                textAlign: 'left'
                            }}>
                                {currentQ.contexto.contenido && (
                                    <p style={{ whiteSpace: 'pre-line', marginBottom: currentQ.contexto.archivo ? '1rem' : 0 }}>
                                        {currentQ.contexto.contenido}
                                    </p>
                                )}
                                {currentQ.contexto.archivo && (
                                    <img
                                        src={formatImageUrl(currentQ.contexto.archivo)}
                                        alt="Contexto"
                                        style={{ maxWidth: '100%', borderRadius: '8px', display: 'block', margin: '0 auto' }}
                                    />
                                )}
                            </div>
                        )}

                        {currentQ.imagen_url && (
                             <img 
                                src={formatImageUrl(currentQ.imagen_url)} 
                                alt="Pregunta" 
                                style={{ maxWidth: '100%', borderRadius: '12px', display: 'block', margin: '0 auto 1.5rem' }} 
                            />
                        )}
                        <p className="millionaire-question">{currentQ.enunciado}</p>

                        {hint && <div className="hint-box" style={{
                            background: 'rgba(59, 130, 246, 0.2)',
                            padding: '10px',
                            borderRadius: '10px',
                            textAlign: 'center',
                            marginBottom: '1rem',
                            border: '1px solid #3b82f6'
                        }}>
                            {hint}
                        </div>}

                        <div className="millionaire-options">
                            {currentQ.opciones.map((opt, i) => {
                                const isRemoved = removedOptions.includes(opt.id);
                                let className = "mil-option";
                                if (selectedOption?.id === opt.id) {
                                    className += " selected";
                                    if (isChecking) {
                                        className += opt.es_correcta ? " correct" : " wrong";
                                    }
                                } else if (isChecking && opt.es_correcta) {
                                    className += " correct";
                                }

                                return (
                                    <button
                                        key={opt.id}
                                        className={className}
                                        style={{ visibility: isRemoved ? 'hidden' : 'visible' }}
                                        onClick={() => handleAnswer(opt)}
                                        disabled={isChecking || isRemoved}
                                    >
                                        <span className="option-prefix">{['A', 'B', 'C', 'D'][i]}</span>
                                        <span className="option-text">{opt.texto}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div style={{ textAlign: 'center' }}>
                        <button className="retire-btn" onClick={handleRetire} disabled={isChecking}>
                            Retirarse con {currentLevel === 0 ? '0' : PRIZES[currentLevel - 1]} pts
                        </button>
                    </div>
                </div>

                {/* Right side: Prize Ladder */}
                <div className="prize-ladder">
                    {PRIZES.map((prize, i) => {
                        let className = "ladder-step";
                        if (currentLevel === i) className += " active";
                        else if (currentLevel > i) className += " completed";
                        if (SAFE_LEVELS.includes(i)) className += " safe";

                        return (
                            <div key={i} className={className}>
                                <span>{i + 1}</span>
                                <span>{prize}</span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default MillionaireGame;
