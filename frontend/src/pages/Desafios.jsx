import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Desafios.css';

const Desafios = () => {
    const navigate = useNavigate();

    const gameModes = [
        {
            id: 'quick',
            title: 'Desafío Rápido',
            description: '60 segundos para responder la mayor cantidad de preguntas. ¡Agilidad mental pura!',
            icon: '⚡',
            path: '/desafio-rapido',
            badge: 'Agilidad'
        },
        {
            id: 'millionaire',
            title: 'Sabio Millonario',
            description: '15 niveles de dificultad ascendente. Usa comodines y llega al final sin fallar.',
            icon: '💰',
            path: '/millionaire',
            badge: 'Estrategia'
        },
        {
            id: 'bomb',
            title: 'Bomba de Tiempo',
            description: '¡Desactiva la bomba! Las correctas dan tiempo, las incorrectas te lo roban.',
            icon: '💣',
            path: '/bomba-tiempo',
            badge: 'Presión'
        },
        {
            id: 'streak',
            title: 'Racha Imbatible',
            description: '¿Hasta dónde puedes llegar? Responde sin fallar para romper el récord.',
            icon: '🔥',
            path: '/racha-imbatible',
            badge: 'Excelencia'
        },
        {
            id: 'multi',
            title: 'Duelo Multijugador',
            description: 'Crea una sala y compite contra tus amigos en tiempo real.',
            icon: '⚔️',
            path: '/duelo-multijugador',
            badge: 'Social'
        }
    ];

    return (
        <div className="desafios-container">
            <header className="desafios-header">
                <h1>Zona de Desafíos</h1>
                <p>Elige tu modo de entrenamiento dinámico.</p>
            </header>

            <div className="desafios-grid">
                {gameModes.map(mode => (
                    <div key={mode.id} className="glass-card desafio-card">
                        <div>
                            <div className="desafio-icon-wrapper">
                                {mode.icon}
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-xs)' }}>
                                <h3>{mode.title}</h3>
                                <span style={{
                                    background: 'rgba(56, 189, 248, 0.1)',
                                    color: 'var(--primary)',
                                    padding: '2px 8px',
                                    borderRadius: '12px',
                                    fontSize: '0.75rem',
                                    fontWeight: 'bold'
                                }}>
                                    {mode.badge}
                                </span>
                            </div>
                            <p>{mode.description}</p>
                        </div>
                        <button
                            className="btn-primary desafio-btn"
                            onClick={() => navigate(mode.path)}
                        >
                            Jugar Ahora
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Desafios;
