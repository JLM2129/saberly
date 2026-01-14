import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { checkBackendConnection } from '../services/api';
import { isAuthenticated, logout } from '../services/auth';
import { useMode } from '../context/ModeContext';

export default function Navbar() {
    const { isOffline, toggleMode } = useMode();
    const [isConnected, setIsConnected] = useState(null);
    const [isAuth, setIsAuth] = useState(isAuthenticated());
    const navigate = useNavigate();

    useEffect(() => {
        checkBackendConnection().then(setIsConnected);
        // Verificar auth periódicamente o al montar
        setIsAuth(isAuthenticated());
    }, []);

    const handleLogout = () => {
        logout();
        setIsAuth(false);
        navigate('/login');
    };

    return (
        <header style={{
            padding: 'var(--spacing-md) var(--spacing-xl)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            position: 'fixed',
            width: '100%',
            top: 0,
            zIndex: 10,
            backdropFilter: 'blur(10px)',
            borderBottom: '1px solid var(--glass-border)'
        }}>
            <Link to="/" style={{ textDecoration: 'none' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: '800', letterSpacing: '-0.05em', color: 'var(--text-main)' }}>
                    Saber<span style={{ color: 'var(--primary)' }}>ly</span>
                </h2>
            </Link>
            <nav style={{ display: 'flex', gap: 'var(--spacing-md)', alignItems: 'center' }}>
                <Link to="/" style={{ color: 'var(--text-main)', fontWeight: '500' }}>Inicio</Link>
                <Link to="/simulacros" style={{ color: 'var(--text-muted)' }}>Simulacros</Link>
                <Link to="/desafio-rapido" style={{ color: 'var(--text-muted)' }}>Desafío</Link>
                <Link to="/estadisticas" style={{ color: 'var(--text-muted)' }}>Estadísticas</Link>

                <div style={{ width: '1px', height: '20px', background: 'var(--glass-border)', margin: '0 8px' }}></div>

                {isAuth ? (
                    <>
                        <button
                            onClick={handleLogout}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--text-muted)',
                                cursor: 'pointer',
                                fontWeight: '500'
                            }}
                        >
                            Cerrar Sesión
                        </button>
                    </>
                ) : (
                    <>
                        <Link to="/login" style={{ color: 'var(--text-muted)', fontWeight: '500' }}>Ingresar</Link>
                        <Link to="/registro" className="btn-primary" style={{
                            padding: '8px 16px',
                            fontSize: '0.85rem',
                            textDecoration: 'none'
                        }}>
                            Registrarse
                        </Link>
                    </>
                )}

                {/* Status Indicator */}
                <div
                    onClick={() => toggleMode()}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        background: isOffline ? 'rgba(234, 179, 8, 0.1)' : 'var(--bg-card)',
                        padding: '4px 12px',
                        borderRadius: '20px',
                        border: `1px solid ${isOffline ? '#eab308' : 'var(--border-subtle)'}`,
                        fontSize: '0.8rem',
                        color: isOffline ? '#eab308' : 'var(--text-muted)',
                        marginLeft: '8px',
                        cursor: 'pointer'
                    }}
                    title={isOffline ? "Cambiar a Modo Online" : "Cambiar a Modo Offline"}
                >
                    <span style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: isOffline ? '#eab308' : (isConnected === true ? '#22c55e' : (isConnected === false ? '#ef4444' : '#eab308')),
                        boxShadow: (isConnected === true && !isOffline) ? '0 0 8px #22c55e' : 'none'
                    }}></span>
                    {isOffline ? 'Modo Offline ⚡' : (isConnected === true ? 'Online' : (isConnected === false ? 'Offline' : 'Conectando...'))}
                </div>
            </nav>
        </header>
    );
}

