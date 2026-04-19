import React, { useState } from 'react';
import api from '../services/api';
import './RefuerzoIA.css';

const RefuerzoIA = () => {
    const [loading, setLoading] = useState(false);
    const [flashcards, setFlashcards] = useState([]);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);

    const handleGenerate = async () => {
        setLoading(true);
        setError(null);
        setFlashcards([]);
        setSuccess(false);

        try {
            const response = await api.post('/tutor/flashcards/debilidades/');
            setFlashcards(response.data);
            setSuccess(true);
        } catch (err) {
            console.error("Error al generar refuerzo:", err);
            setError(err.response?.data?.error || "No pudimos generar tu plan de refuerzo. Asegúrate de tener simulacros completados con algunos errores para analizar.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="refuerzo-ia-container glass-card">
            <div className="refuerzo-header">
                <div className="refuerzo-info">
                    <h3>
                        <span role="img" aria-label="magic">✨</span> 
                        Refuerzo Personalizado con Gemma
                    </h3>
                    <p>Analizamos tus últimas debilidades para crear un mazo de estudio enfocado en lo que más necesitas.</p>
                </div>
                {!success && (
                    <button 
                        className="btn-generate-refuerzo"
                        onClick={handleGenerate}
                        disabled={loading}
                    >
                        {loading ? 'Analizando debilidades...' : 'Generar Flashcards de Refuerzo'}
                    </button>
                )}
            </div>

            {loading && (
                <div className="refuerzo-loading">
                    <div className="ai-pulse"></div>
                    <p>Gemma está procesando tus resultados y extrayendo conceptos clave...</p>
                </div>
            )}

            {error && (
                <div className="refuerzo-error">
                    <p>{error}</p>
                </div>
            )}

            {success && flashcards.length > 0 && (
                <div className="refuerzo-results">
                    <div className="success-banner">
                        ¡Mazo de estudio generado con éxito!
                    </div>
                    <div className="flashcards-grid">
                        {flashcards.map((card, index) => (
                            <div key={card.id || index} className="mini-card concept-card">
                                <div className="mini-card-front">
                                    <span className="concept-label">Concepto Clave</span>
                                    <p>{card.frente}</p>
                                </div>
                                <div className="mini-card-back">
                                    <div className="concept-explanation">
                                        {card.dorso}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                    <button className="btn-reset-refuerzo" onClick={() => setSuccess(false)}>
                        Generar nuevo mazo
                    </button>
                </div>
            )}
        </div>
    );
};

export default RefuerzoIA;
