import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createSimulacro } from '../services/simulacros';
import { isAuthenticated } from '../services/auth';
import { useMode } from '../context/ModeContext';
import { generateLocalSimulacro } from '../offline/offlineService';

export default function Simulacros() {
    const { isOffline } = useMode();
    const [loading, setLoading] = useState(null);
    const navigate = useNavigate();
    const isAuth = isAuthenticated();

    const handleStartSimulacro = async (tipo) => {
        if (!isAuth && !isOffline) {
            navigate('/login');
            return;
        }

        setLoading(tipo);
        try {
            if (isOffline) {
                const nuevo = generateLocalSimulacro(tipo);
                localStorage.setItem('current_offline_simulacro', JSON.stringify(nuevo));
                navigate(`/simulacro/${nuevo.id}`);
            } else {
                const nuevo = await createSimulacro(tipo);
                navigate(`/simulacro/${nuevo.id}`);
            }
        } catch (error) {
            console.error(error);
            if (error.message === 'No autorizado') {
                alert("Tu sesión ha expirado.");
                navigate('/login');
            } else {
                alert('Error al iniciar el simulacro');
            }
        } finally {
            setLoading(null);
        }
    };

    const simulacrosConfig = [
        { id: '100%', title: 'Prueba Completa', questions: 278, desc: 'Simulacro total de 278 preguntas. Todas las áreas incluidas.', icon: '👑' },
        { id: '80%', title: 'Prueba Extendida', questions: 222, desc: 'Focalizado al 80% de la carga real (222 preguntas).', icon: '🔥' },
        { id: '60%', title: 'Prueba Estándar', questions: 167, desc: 'Nivel intermedio con 167 preguntas aleatorias.', icon: '⚡' },
        { id: '40%', title: 'Prueba Media', questions: 111, desc: 'Refuerzo rápido con 111 preguntas de todas las áreas.', icon: '🎯' },
        { id: '20%', title: 'Prueba Rápida', questions: 56, desc: 'Sesión express de 56 preguntas para práctica diaria.', icon: '🚀' },
    ];

    return (
        <div style={{ paddingTop: '100px', paddingLeft: 'var(--spacing-xl)', paddingRight: 'var(--spacing-xl)', minHeight: '100vh', background: 'var(--bg-app)' }}>
            <h1 style={{ marginBottom: 'var(--spacing-lg)', fontSize: '2.5rem', color: 'var(--text-main)' }}>Pruebas Disponibles</h1>

            {!isAuth && (
                <div style={{ marginBottom: '2rem', padding: '1rem', background: 'rgba(234, 179, 8, 0.1)', border: '1px solid #eab308', borderRadius: '8px', color: '#eab308' }}>
                    ⚠️ Debes iniciar sesión para realizar simulacros.
                </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--spacing-md)' }}>
                {simulacrosConfig.map((item) => (
                    <div key={item.id} className="glass-card" style={{
                        padding: 'var(--spacing-lg)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        border: '1px solid rgba(255,255,255,0.05)'
                    }}>
                        <div>
                            <div style={{
                                background: 'var(--primary-glow)',
                                width: '45px',
                                height: '45px',
                                borderRadius: '12px',
                                marginBottom: 'var(--spacing-md)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '1.5rem',
                                color: 'var(--primary)',
                                boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
                            }}>
                                {item.icon}
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-xs)' }}>
                                <h3 style={{ color: 'var(--text-main)', margin: 0 }}>{item.title}</h3>
                                <span style={{
                                    background: 'rgba(56, 189, 248, 0.1)',
                                    color: 'var(--primary)',
                                    padding: '2px 8px',
                                    borderRadius: '12px',
                                    fontSize: '0.75rem',
                                    fontWeight: 'bold'
                                }}>
                                    {item.id}
                                </span>
                            </div>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 'var(--spacing-md)', minHeight: '3rem' }}>
                                {item.desc}
                            </p>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 'var(--spacing-xs)',
                                color: 'var(--text-main)',
                                fontSize: '0.9rem',
                                marginBottom: 'var(--spacing-lg)',
                                fontWeight: '500'
                            }}>
                                📊 {item.questions} preguntas
                            </div>
                        </div>
                        <button
                            className="btn-primary"
                            style={{
                                width: '100%',
                                fontSize: '0.9rem',
                                opacity: loading === item.id ? 0.7 : 1,
                                padding: '12px'
                            }}
                            onClick={() => handleStartSimulacro(item.id)}
                            disabled={loading !== null}
                        >
                            {loading === item.id ? 'Generando...' : ((isAuth || isOffline) ? 'Iniciar Prueba' : 'Iniciar Sesión')}
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}
