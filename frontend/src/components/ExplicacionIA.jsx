import React, { useState, useEffect } from 'react';
import api from '../services/api';
import './ExplicacionIA.css';

const MOTIVATIONAL_MESSAGES = [
    "Analizando tu respuesta con sabiduría digital...",
    "Buscando la mejor explicación para tu aprendizaje...",
    "¡Casi listo! El conocimiento está en camino...",
    "Reflexionando sobre los conceptos clave para ti...",
    "¡No te rindas! Cada error es un paso hacia el éxito...",
    "Desglosando la lógica detrás de esta pregunta...",
    "Conectando neuronas artificiales para ayudarte..."
];

const ExplicacionIA = ({ questionId, questionText, userAnswer, correctAnswer }) => {
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState(0); // 0: init, 1: diagnosticado, 2: pista, 3: ejemplo, 4: explicacion
    
    const [diagnostic, setDiagnostic] = useState(null);
    const [pista, setPista] = useState(null);
    const [ejemplo, setEjemplo] = useState(null);
    const [explicacion, setExplicacion] = useState(null);
    
    const [messageIndex, setMessageIndex] = useState(0);
    const [error, setError] = useState(null);

    useEffect(() => {
        let interval;
        if (loading) {
            interval = setInterval(() => {
                setMessageIndex((prev) => (prev + 1) % MOTIVATIONAL_MESSAGES.length);
            }, 3000);
        } else {
            setMessageIndex(0);
        }
        return () => clearInterval(interval);
    }, [loading]);

    const handleAction = async (actionType) => {
        setLoading(true);
        setError(null);

        try {
            const payload = { action: actionType };
            
            if (actionType === 'diagnosticar') {
                payload.pregunta = questionText || `Pregunta ID: ${questionId}`;
                payload.respuesta_correcta = correctAnswer;
                payload.respuesta_estudiante = userAnswer;
            } else {
                payload.tipo_error = diagnostic?.tipo_error || 'conceptual';
                payload.pregunta = questionText || `Pregunta ID: ${questionId}`;
                if (actionType === 'explicacion') {
                    payload.respuesta_estudiante = userAnswer;
                    payload.respuesta_correcta = correctAnswer;
                }
            }

            const response = await api.post('/tutor/interaccion/', payload);
            
            if (actionType === 'diagnosticar') {
                setDiagnostic(response.data);
                setStep(1);
            } else if (actionType === 'pista') {
                setPista(response.data.pista);
                setStep(2);
            } else if (actionType === 'ejemplo') {
                setEjemplo(response.data.ejemplo);
                setStep(3);
            } else if (actionType === 'explicacion') {
                setExplicacion(response.data.explicacion);
                setStep(4);
            }
            
        } catch (err) {
            console.error(`Error en la acción ${actionType}:`, err);
            setError("No pudimos conectar con el Tutor IA en este momento. Inténtalo de nuevo.");
        } finally {
            setLoading(false);
        }
    };

    const getErrorBadgeColor = (tipo) => {
        switch(tipo?.toLowerCase()) {
            case 'conceptual': return '#ef4444'; // Red
            case 'procedimental': return '#f59e0b'; // Orange
            case 'lectura': return '#3b82f6'; // Blue
            case 'descuido': return '#8b5cf6'; // Purple
            default: return '#6b7280'; // Gray
        }
    };

    return (
        <div className="explicacion-ia-container">
            {step === 0 && !loading && (
                <button 
                    className="btn-explicacion-ia" 
                    onClick={() => handleAction('diagnosticar')}
                >
                    <span role="img" aria-label="sparkles">✨</span>
                    Analizar mi error con IA
                </button>
            )}

            {loading && (
                <div className="spinner-container">
                    <div className="spinner"></div>
                    <p className="motivational-text">
                        {MOTIVATIONAL_MESSAGES[messageIndex]}
                    </p>
                </div>
            )}

            {error && (
                <div className="explanation-card" style={{ borderLeftColor: '#ef4444' }}>
                    <p style={{ color: '#ef4444' }}>{error}</p>
                    <button className="btn-close-explanation" onClick={() => setError(null)}>Cerrar</button>
                </div>
            )}

            {step >= 1 && diagnostic && (
                <div className="explanation-card interactive-tutor">
                    <h4>
                        <span role="img" aria-label="brain">🧠</span>
                        Análisis del Tutor IA
                    </h4>
                    
                    {/* Diagnóstico */}
                    <div className="tutor-section diagnostic">
                        <span className="badge" style={{ backgroundColor: getErrorBadgeColor(diagnostic.tipo_error) }}>
                            Error {diagnostic.tipo_error}
                        </span>
                        <p>{diagnostic.explicacion_corta}</p>
                    </div>

                    {/* Pista (Nivel 1) */}
                    {step === 1 && !loading && (
                        <div className="tutor-actions">
                            <button className="btn-secondary" onClick={() => handleAction('pista')}>
                                💡 Dame una pista
                            </button>
                        </div>
                    )}

                    {step >= 2 && pista && (
                        <div className="tutor-section pista">
                            <h5>💡 Pista:</h5>
                            <p>{pista}</p>
                            
                            {step === 2 && !loading && (
                                <div className="tutor-actions">
                                    <button className="btn-secondary" onClick={() => handleAction('ejemplo')}>
                                        📝 Ver un ejemplo guiado
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Ejemplo (Nivel 2) */}
                    {step >= 3 && ejemplo && (
                        <div className="tutor-section ejemplo">
                            <h5>📝 Ejemplo Guiado:</h5>
                            <div style={{ whiteSpace: 'pre-wrap', padding: '10px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                                {ejemplo}
                            </div>
                            
                            {step === 3 && !loading && (
                                <div className="tutor-actions" style={{ marginTop: '1rem' }}>
                                    <button className="btn-secondary" onClick={() => handleAction('explicacion')}>
                                        🎯 Mostrar explicación final
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Explicación Final (Nivel 3) */}
                    {step >= 4 && explicacion && (
                        <div className="tutor-section explicacion-final">
                            <h5>🎯 Explicación Completa:</h5>
                            <div style={{ whiteSpace: 'pre-wrap' }}>
                                {explicacion}
                            </div>
                        </div>
                    )}

                    <button 
                        className="btn-close-explanation" 
                        onClick={() => {
                            setStep(0);
                            setDiagnostic(null);
                            setPista(null);
                            setEjemplo(null);
                            setExplicacion(null);
                        }}
                        style={{ marginTop: '1rem' }}
                    >
                        Cerrar tutor
                    </button>
                </div>
            )}
        </div>
    );
};

export default ExplicacionIA;
