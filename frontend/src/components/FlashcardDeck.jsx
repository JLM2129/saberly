import React, { useState } from 'react';
import './FlashcardDeck.css';

const FlashcardDeck = ({ cards = [] }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);

    if (!cards || cards.length === 0) {
        return (
            <div className="flashcard-empty">
                <p>✨ ¡Aún no tienes cartas de repaso, realiza un simulacro para generarlas!</p>
            </div>
        );
    }

    const currentCard = cards[currentIndex];

    const handleFlip = () => {
        setIsFlipped(!isFlipped);
    };

    const handleNext = () => {
        setIsFlipped(false);
        setCurrentIndex((prev) => (prev + 1) % cards.length);
    };

    const handlePrev = () => {
        setIsFlipped(false);
        setCurrentIndex((prev) => (prev - 1 + cards.length) % cards.length);
    };

    return (
        <div className="flashcard-deck-container">
            <div className="flashcard-scene" onClick={handleFlip}>
                <div className={`flashcard-card ${isFlipped ? 'is-flipped' : ''}`}>
                    {/* Front */}
                    <div className="flashcard-face flashcard-front">
                        <div className="flashcard-content">
                            <span className="flashcard-badge">Pregunta Concepto</span>
                            <h3>{currentCard.frente}</h3>
                            <p className="flashcard-hint">Haz clic para ver la respuesta</p>
                        </div>
                    </div>
                    {/* Back */}
                    <div className="flashcard-face flashcard-back">
                        <div className="flashcard-content">
                            <span className="flashcard-badge badge-success">Respuesta & Tip</span>
                            <div className="flashcard-text-dorso">
                                {currentCard.dorso}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flashcard-controls">
                <button 
                    className="control-btn" 
                    onClick={(e) => { e.stopPropagation(); handlePrev(); }}
                    disabled={cards.length <= 1}
                >
                    Anterior
                </button>
                <div className="flashcard-counter">
                    {currentIndex + 1} / {cards.length}
                </div>
                <button 
                    className="control-btn" 
                    onClick={(e) => { e.stopPropagation(); handleNext(); }}
                    disabled={cards.length <= 1}
                >
                    Siguiente
                </button>
            </div>
        </div>
    );
};

export default FlashcardDeck;
