import React, { useState, useEffect } from 'react';
import api from '../services/api';
import FlashcardDeck from './FlashcardDeck';
import './RefuerzoIA.css';

const STORAGE_KEY = 'flashcards_ia';

const RefuerzoIA = () => {
    const [loading, setLoading] = useState(false);
    const [flashcards, setFlashcards] = useState([]);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);
    const [lastGenerated, setLastGenerated] = useState(null);

    // Load saved flashcards from localStorage on mount
    useEffect(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (parsed.cards && parsed.cards.length > 0) {
                    setFlashcards(parsed.cards);
                    setLastGenerated(parsed.generatedAt || null);
                    setSuccess(true);
                }
            }
        } catch (e) {
            console.warn('Error al cargar flashcards guardadas:', e);
        }
    }, []);

    // Save flashcards to localStorage whenever they change
    const saveToLocal = (cards) => {
        try {
            const now = new Date().toISOString();
            localStorage.setItem(STORAGE_KEY, JSON.stringify({
                cards,
                generatedAt: now
            }));
            setLastGenerated(now);
        } catch (e) {
            console.warn('Error al guardar flashcards:', e);
        }
    };

    const handleGenerate = async () => {
        // Check connectivity first
        if (!navigator.onLine) {
            setError("📴 Sin conexión a internet. Puedes seguir estudiando con tus flashcards guardadas. Conéctate para generar nuevas.");
            return;
        }

        setLoading(true);
        setError(null);

        // Save current cards in case generation fails
        const previousCards = [...flashcards];
        const hadSuccess = success;

        try {
            const response = await api.post('/tutor/flashcards/debilidades/');
            const newCards = response.data;
            setFlashcards(newCards);
            setSuccess(true);
            saveToLocal(newCards);
        } catch (err) {
            console.error("Error al generar refuerzo:", err);
            // Restore previous flashcards if generation failed
            if (previousCards.length > 0) {
                setFlashcards(previousCards);
                setSuccess(hadSuccess);
            }
            setError(err.response?.data?.error || "No pudimos generar tu plan de refuerzo. Asegúrate de tener simulacros completados con algunos errores para analizar.");
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (isoString) => {
        if (!isoString) return '';
        const date = new Date(isoString);
        return date.toLocaleDateString('es-CO', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
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
                    {success && lastGenerated && (
                        <p className="refuerzo-timestamp">
                            <span role="img" aria-label="clock">🕐</span> Último mazo generado: {formatDate(lastGenerated)}
                        </p>
                    )}
                </div>
                <div className="refuerzo-actions">
                    <button 
                        className={`btn-generate-refuerzo ${success ? 'btn-regenerate' : ''}`}
                        onClick={handleGenerate}
                        disabled={loading}
                    >
                        {loading ? 'Analizando debilidades...' : success ? '🔄 Generar nuevas Flashcards' : '✨ Generar Flashcards de Refuerzo'}
                    </button>
                </div>
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
                        <span role="img" aria-label="check">✅</span> ¡Mazo de estudio listo! — {flashcards.length} flashcards disponibles {!navigator.onLine && <span className="offline-badge">📴 Modo Offline</span>}
                    </div>

                    {/* Interactive FlashcardDeck view */}
                    <FlashcardDeck cards={flashcards} />

                    {/* Grid overview of all cards */}
                    <details className="flashcards-overview">
                        <summary className="overview-toggle">
                            📋 Ver todas las flashcards en miniatura ({flashcards.length})
                        </summary>
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
                    </details>
                </div>
            )}
        </div>
    );
};

export default RefuerzoIA;
