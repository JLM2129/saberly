import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { login } from '../services/auth';
import { useMode } from '../context/ModeContext';

export default function Login() {
    const { toggleMode } = useMode();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleOffline = () => {
        toggleMode(true);
        navigate('/simulacros');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await login(email, password);
            navigate('/simulacros');
            window.location.reload(); // Para actualizar el estado de autenticación en el Navbar (temporal)
        } catch (err) {
            setError(err.message || 'Credenciales inválidas');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'radial-gradient(circle at 50% 10%, #1e293b 0%, #0f172a 100%)',
        }}>
            <div className="glass-card fade-in" style={{ width: '100%', maxWidth: '400px', padding: 'var(--spacing-xl)' }}>
                <h2 style={{ textAlign: 'center', marginBottom: 'var(--spacing-lg)', fontSize: '2rem' }}>Bienvenido</h2>

                {error && (
                    <div style={{
                        background: 'rgba(239, 68, 68, 0.2)',
                        border: '1px solid #ef4444',
                        color: '#fca5a5',
                        padding: '10px',
                        borderRadius: 'var(--radius-sm)',
                        marginBottom: '1rem',
                        fontSize: '0.9rem'
                    }}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Correo Electrónico</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            style={{
                                width: '100%',
                                padding: '12px',
                                borderRadius: 'var(--radius-sm)',
                                border: '1px solid var(--border-subtle)',
                                background: 'rgba(30, 41, 59, 0.5)',
                                color: 'white',
                                outline: 'none'
                            }}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Contraseña</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            style={{
                                width: '100%',
                                padding: '12px',
                                borderRadius: 'var(--radius-sm)',
                                border: '1px solid var(--border-subtle)',
                                background: 'rgba(30, 41, 59, 0.5)',
                                color: 'white',
                                outline: 'none'
                            }}
                        />
                    </div>

                    <button
                        type="submit"
                        className="btn-primary"
                        disabled={loading}
                        style={{ marginTop: '1rem', width: '100%', opacity: loading ? 0.7 : 1 }}
                    >
                        {loading ? 'Ingresando...' : 'Iniciar Sesión'}
                    </button>
                </form>

                <div style={{ margin: '1.5rem 0', display: 'flex', alignItems: 'center', gap: '10px', opacity: 0.5 }}>
                    <div style={{ flex: 1, height: '1px', background: 'white' }}></div>
                    <span>O</span>
                    <div style={{ flex: 1, height: '1px', background: 'white' }}></div>
                </div>

                <button
                    onClick={handleOffline}
                    style={{
                        width: '100%',
                        padding: '12px',
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        color: 'white',
                        borderRadius: 'var(--radius-sm)',
                        cursor: 'pointer',
                        fontWeight: 'bold'
                    }}
                >
                    Continuar como Invitado (Offline) ⚡
                </button>

                <p style={{ textAlign: 'center', marginTop: '1.5rem', color: 'var(--text-muted)' }}>
                    ¿No tienes cuenta? <Link to="/registro" style={{ color: 'var(--primary)' }}>Regístrate aquí</Link>
                </p>
            </div>
        </div>
    );
}
