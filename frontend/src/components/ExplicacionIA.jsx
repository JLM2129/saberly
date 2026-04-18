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

const ExplicacionIA = ({ questionId, userAnswer, correctAnswer }) => {
    const [loading, setLoading] = useState(false);
    const [explanation, setExplanation] = useState(null);
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

    const handleExplain = async () => {
        setLoading(true);
        setError(null);
        setExplanation(null);

        try {
            const response = await api.post('/tutor/explicar/', {
                question_id: questionId,
                user_answer: userAnswer,
                correct_answer: correctAnswer
            });
            
            // Assuming the backend returns { data: { explanation: "..." } }
            // or directly the object depending on api.js implementation
            setExplanation(response.data.explanation || response.data);
        } catch (err) {
            console.error("Error al obtener explicación:", err);
            setError("No pudimos conectar con el Tutor IA en este momento. Inténtalo de nuevo más tarde.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="explicacion-ia-container">
            {!explanation && !loading && (
                <button 
                    className="btn-explicacion-ia" 
                    onClick={handleExplain}
                    disabled={loading}
                >
                    <span role="img" aria-label="sparkles">✨</span>
                    Explicación IA
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

            {explanation && (
                <div className="explanation-card">
                    <h4>
                        <span role="img" aria-label="brain">🧠</span>
                        Análisis del Tutor IA
                    </h4>
                    <div className="explanation-content">
                        {explanation}
                    </div>
                    <button className="btn-close-explanation" onClick={() => setExplanation(null)}>Cerrar explicación</button>
                </div>
            )}
        </div>
    );
};

export default ExplicacionIA;
