import React, { useState, useEffect } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { checkBackendConnection } from '../services/api';
import { isAuthenticated, logout } from '../services/auth';
import { useMode } from '../context/ModeContext';
// import axios from 'axios'; // Eliminado para evitar problemas de dependencias

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001/api';

export default function Navbar() {
    const { isOffline, toggleMode } = useMode();
    const [isConnected, setIsConnected] = useState(null);
    const [isAuth, setIsAuth] = useState(isAuthenticated());
    const [isTeacher, setIsTeacher] = useState(false);
    const navigate = useNavigate();

    const navLinkStyle = ({ isActive }) => ({
        color: isActive ? 'var(--primary)' : 'var(--text-muted)',
        fontWeight: isActive ? '700' : '500',
        textDecoration: 'none',
        transition: 'all 0.2s ease'
    });

    useEffect(() => {
        checkBackendConnection().then(setIsConnected);
        // Verificar auth periódicamente o al montar
        const authStatus = isAuthenticated();
        setIsAuth(authStatus);

        // Verificar si es docente
        if (authStatus) {
            checkTeacherStatus();
        }

        // Sincronizar resultados offline si estamos online
        if (!isOffline && authStatus) {
            import('../offline/offlineService').then(module => {
                module.syncOfflineResults();
            });
        }
    }, [isOffline]);

    const checkTeacherStatus = async () => {
        try {
            const token = localStorage.getItem('access_token');
            const response = await fetch(`${API_URL}/users/profile/`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setIsTeacher(data.is_teacher || false);
            }
        } catch (error) {
            console.error('Error verificando status de docente:', error);
        }
    };

    const handleLogout = () => {
        logout();
        setIsAuth(false);
        setIsTeacher(false);
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
                <NavLink to="/" style={navLinkStyle} className="nav-item" end>Inicio</NavLink>
                <NavLink to="/simulacros" style={navLinkStyle} className="nav-item">Simulacros</NavLink>
                <NavLink to="/desafios" style={navLinkStyle} className="nav-item">Desafíos</NavLink>
                <NavLink to="/estadisticas" style={navLinkStyle} className="nav-item">Estadísticas</NavLink>

                {/* Mostrar enlace al panel de docentes si el usuario es docente */}
                {isAuth && isTeacher && (
                    <Link
                        to="/teacher-panel"
                        style={{
                            color: 'var(--accent)',
                            fontWeight: '600',
                            padding: '6px 12px',
                            background: 'rgba(168, 85, 247, 0.1)',
                            borderRadius: '6px',
                            border: '1px solid rgba(168, 85, 247, 0.2)'
                        }}
                    >
                        📚 Panel Docente
                    </Link>
                )}

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

