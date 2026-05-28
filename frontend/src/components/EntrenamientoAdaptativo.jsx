import React, { useState, useEffect } from 'react';
import { getDebilidades, iniciarEntrenamiento, responderEntrenamiento } from '../services/tutor';
import './EntrenamientoAdaptativo.css';

export default function EntrenamientoAdaptativo() {
    const [debilidades, setDebilidades] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedDebilidad, setSelectedDebilidad] = useState(null);
    const [trainingQuestion, setTrainingQuestion] = useState(null);
    const [selectedOption, setSelectedOption] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [trainingError, setTrainingError] = useState(null);
    
    // Scaffolding status
    const [attemptsCount, setAttemptsCount] = useState(0);
    const [showPista, setShowPista] = useState(false);
    const [showEjemplo, setShowEjemplo] = useState(false);
    const [feedback, setFeedback] = useState(null); // { es_correcta, explicacion, microvictoria }

    useEffect(() => {
        loadDebilidades();
    }, []);

    const loadDebilidades = async () => {
        setLoading(true);
        try {
            const data = await getDebilidades();
            setDebilidades(data);
        } catch (e) {
            console.error("Error cargando debilidades:", e);
        } finally {
            setLoading(false);
        }
    };

    const handleStartTraining = async (debilidad) => {
        setSelectedDebilidad(debilidad);
        setTrainingQuestion(null);
        setSelectedOption(null);
        setAttemptsCount(0);
        setShowPista(false);
        setShowEjemplo(false);
        setFeedback(null);
        setTrainingError(null);
        
        try {
            const data = await iniciarEntrenamiento(debilidad.debilidad);
            setTrainingQuestion(data);
        } catch (e) {
            console.error("Error iniciando entrenamiento:", e);
            setTrainingError("No pudimos generar el entrenamiento con Gemma 4 en este momento. Inténtalo de nuevo.");
        }
    };

    const handleSubmitAnswer = async () => {
        if (!selectedOption || submitting) return;
        setSubmitting(true);
        setTrainingError(null);
        try {
            const result = await responderEntrenamiento(trainingQuestion.id, selectedOption);
            setFeedback(result);
            setAttemptsCount(prev => prev + 1);
            
            if (result.es_correcta) {
                // Refresh debilidades in background
                loadDebilidades();
            } else {
                // If incorrect, prompt socratic help automatically
                if (attemptsCount === 0) {
                    setShowPista(true);
                } else if (attemptsCount === 1) {
                    setShowEjemplo(true);
                }
            }
        } catch (e) {
            console.error("Error respondiendo ejercicio:", e);
            setTrainingError("Hubo un error al calificar la respuesta. Inténtalo de nuevo.");
        } finally {
            setSubmitting(false);
        }
    };

    const handleNextQuestion = () => {
        if (selectedDebilidad) {
            handleStartTraining(selectedDebilidad);
        }
    };

    const getMasteryColor = (level) => {
        switch (level) {
            case 'alto': return '#10b981'; // Green
            case 'medio': return '#3b82f6'; // Blue
            case 'bajo': return '#ef4444'; // Red
            default: return '#f59e0b';
        }
    };

    return (
        <div className="entrenamiento-adaptativo-section">
            <h2 className="section-title">
                <span role="img" aria-label="brain">🧠</span> Entrenamiento Adaptativo Inteligente (Modo Refuerzo IA)
            </h2>
            <p className="section-subtitle">
                Gemma 4 detecta tus debilidades en los simulacros y genera preguntas personalizadas con andamiaje de aprendizaje interactivo.
            </p>

            {loading ? (
                <div className="loading-card glass-card">
                    <div className="pulse-loader"></div>
                    <p>Cargando tu perfil cognitivo y debilidades...</p>
                </div>
            ) : selectedDebilidad ? (
                // --- INMERSIVE TRAINING INTERFACE ---
                <div className="training-card glass-card">
                    <div className="training-card-header">
                        <div>
                            <span className="badge-debilidad">Entrenando: {selectedDebilidad.debilidad}</span>
                            <span className="badge-dificultad" style={{ backgroundColor: getMasteryColor(selectedDebilidad.nivel_actual) }}>
                                Nivel: {selectedDebilidad.nivel_actual.toUpperCase()}
                            </span>
                        </div>
                        <button className="btn-close-training" onClick={() => { setSelectedDebilidad(null); loadDebilidades(); }}>
                            ✕ Salir del entrenamiento
                        </button>
                    </div>

                    {trainingError && <div className="error-banner">{trainingError}</div>}

                    {!trainingQuestion && !trainingError ? (
                        <div className="generating-container">
                            <div className="gemma-pulse"></div>
                            <h4>Gemma 4 está formulando una pregunta adaptada a tu perfil...</h4>
                            <p className="pedagogical-hint">
                                Analizando tus errores comunes de tipo <em>conceptual</em> y <em>procedimental</em> para crear distractores inteligentes.
                            </p>
                        </div>
                    ) : trainingQuestion ? (
                        <div className="question-workspace">
                            <div className="question-area">
                                <p className="question-meta">Área: {trainingQuestion.area_nombre} • Nivel: {trainingQuestion.dificultad}</p>
                                <h3 className="question-enunciado">{trainingQuestion.enunciado}</h3>

                                <div className="options-grid">
                                    {trainingQuestion.opciones.map((opt) => {
                                        let optionClass = "option-btn";
                                        if (selectedOption === opt.id) optionClass += " selected";
                                        
                                        // Show correct/incorrect styles after submission
                                        if (feedback) {
                                            if (opt.es_correcta) {
                                                optionClass += " correct";
                                            } else if (selectedOption === opt.id && !feedback.es_correcta) {
                                                optionClass += " incorrect";
                                            }
                                        }

                                        return (
                                            <button 
                                                key={opt.id}
                                                className={optionClass}
                                                onClick={() => !feedback && setSelectedOption(opt.id)}
                                                disabled={!!feedback && feedback.es_correcta}
                                            >
                                                {opt.texto}
                                            </button>
                                        );
                                    })}
                                </div>

                                {!feedback && (
                                    <div className="submit-action-container">
                                        <button 
                                            className="btn-submit-answer"
                                            disabled={!selectedOption || submitting}
                                            onClick={handleSubmitAnswer}
                                        >
                                            {submitting ? 'Enviando...' : 'Enviar Respuesta'}
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* --- SCAFFOLDING / ANDAMIAJE PEDAGÓGICO --- */}
                            <div className="scaffolding-area">
                                <h4 className="scaffolding-title">📚 Ayudas del Tutor Socrático (Gemma 4)</h4>
                                
                                <div className="scaffolding-buttons">
                                    <button 
                                        className={`scaffold-toggle-btn ${showPista ? 'active' : ''}`}
                                        onClick={() => setShowPista(prev => !prev)}
                                        disabled={!trainingQuestion.pista}
                                    >
                                        💡 {showPista ? 'Ocultar Pista' : 'Pedir Pista (Nivel 1)'}
                                    </button>
                                    <button 
                                        className={`scaffold-toggle-btn ${showEjemplo ? 'active' : ''}`}
                                        onClick={() => setShowEjemplo(prev => !prev)}
                                        disabled={!trainingQuestion.ejemplo}
                                    >
                                        📖 {showEjemplo ? 'Ocultar Ejemplo' : 'Ver Ejemplo Similar (Nivel 2)'}
                                    </button>
                                </div>

                                {showPista && (
                                    <div className="scaffold-content-card pista-card active-pulse">
                                        <h5>💡 Pista Socrática:</h5>
                                        <p>{trainingQuestion.pista}</p>
                                    </div>
                                )}

                                {showEjemplo && (
                                    <div className="scaffold-content-card ejemplo-card">
                                        <h5>📖 Ejercicio Guiado Similar:</h5>
                                        <div className="markdown-content">
                                            {trainingQuestion.ejemplo.split('\n').map((line, i) => (
                                                <p key={i}>{line}</p>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* --- FEEDBACK & EXPLICACIÓN --- */}
                                {feedback && (
                                    <div className={`feedback-card ${feedback.es_correcta ? 'correct-feed' : 'incorrect-feed'}`}>
                                        {feedback.es_correcta ? (
                                            <div className="success-feedback">
                                                <h4>🎉 {feedback.microvictoria || '¡Excelente trabajo!'}</h4>
                                                <div className="explicacion-block">
                                                    <h5>Explicación Pedagógica Completa (Nivel 3):</h5>
                                                    <p>{feedback.explicacion}</p>
                                                </div>
                                                <div className="post-action-buttons">
                                                    <button className="btn-next-question" onClick={handleNextQuestion}>
                                                        🔄 Practicar otro ejercicio
                                                    </button>
                                                    <button className="btn-finish" onClick={() => { setSelectedDebilidad(null); loadDebilidades(); }}>
                                                        Volver al Panel
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="error-feedback">
                                                <h4>❌ Respuesta incorrecta</h4>
                                                <p>
                                                    No te preocupes. Analiza la pista o el ejemplo similar arriba para corregir tu error conceptual y vuelve a intentarlo.
                                                </p>
                                                {attemptsCount >= 3 && (
                                                    <div className="explicacion-block">
                                                        <h5>Explicación Completa para aprender del error:</h5>
                                                        <p>{feedback.explicacion}</p>
                                                    </div>
                                                )}
                                                <button className="btn-retry" onClick={() => setFeedback(null)}>
                                                    ✍️ Volver a intentar la pregunta
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : null}
                </div>
            ) : (
                // --- WEAKNESS LIST OVERVIEW ---
                <div className="debilidades-dashboard-grid">
                    {debilidades.length === 0 ? (
                        <div className="glass-card empty-state">
                            <p>¡Felicitaciones! No tienes debilidades críticas detectadas. Sigue realizando simulacros para actualizar tu perfil.</p>
                        </div>
                    ) : (
                        debilidades.map((deb) => (
                            <div key={deb.id} className="weakness-card glass-card">
                                <div className="weakness-card-header">
                                    <h4>{deb.debilidad}</h4>
                                    <span className="badge-area">{deb.area_nombre}</span>
                                </div>
                                
                                <div className="weakness-card-body">
                                    <div className="stat-row">
                                        <span>Nivel de Maestría:</span>
                                        <span className="mastery-level" style={{ color: getMasteryColor(deb.nivel_actual) }}>
                                            {deb.nivel_actual.toUpperCase()}
                                        </span>
                                    </div>
                                    <div className="stat-row">
                                        <span>Ejercicios realizados:</span>
                                        <span>{deb.intentos_totales}</span>
                                    </div>
                                    <div className="stat-row">
                                        <span>Tasa de acierto:</span>
                                        <span>{deb.precision ? `${deb.precision.toFixed(0)}%` : '0%'}</span>
                                    </div>
                                    <div className="stat-row">
                                        <span>Mejora reciente:</span>
                                        <span className={deb.porcentaje_mejora >= 0 ? 'text-success' : 'text-danger'}>
                                            {deb.porcentaje_mejora >= 0 ? `+${deb.porcentaje_mejora.toFixed(0)}%` : `${deb.porcentaje_mejora.toFixed(0)}%`}
                                        </span>
                                    </div>
                                </div>

                                <div className="weakness-card-footer">
                                    <button 
                                        className="btn-start-training"
                                        onClick={() => handleStartTraining(deb)}
                                    >
                                        🔥 Practicar esta debilidad
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}
