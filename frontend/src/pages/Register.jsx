import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { register } from '../services/auth';

export default function Register() {
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        first_name: '',
        last_name: ''
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await register(formData);
            // Tras registro exitoso, redirigimos al login
            navigate('/login');
        } catch (err) {
            // Manejo básico de errores del objeto de respuesta
            const errorMsg = typeof err === 'object'
                ? Object.values(err).flat().join(', ')
                : 'Error en el registro';
            setError(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    const inputStyle = {
        width: '100%',
        padding: '12px',
        borderRadius: 'var(--radius-sm)',
        border: '1px solid var(--border-subtle)',
        background: 'rgba(30, 41, 59, 0.5)',
        color: 'white',
        outline: 'none'
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'radial-gradient(circle at 50% 10%, #1e293b 0%, #0f172a 100%)',
        }}>
            <div className="glass-card fade-in" style={{ width: '100%', maxWidth: '500px', padding: 'var(--spacing-xl)' }}>
                <h2 style={{ textAlign: 'center', marginBottom: 'var(--spacing-lg)', fontSize: '2rem' }}>Crear Cuenta</h2>

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

                <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Nombre</label>
                            <input name="first_name" type="text" style={inputStyle} required onChange={handleChange} />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Apellido</label>
                            <input name="last_name" type="text" style={inputStyle} required onChange={handleChange} />
                        </div>
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Correo Electrónico</label>
                        <input name="email" type="email" style={inputStyle} required onChange={handleChange} />
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Contraseña</label>
                        <input name="password" type="password" style={inputStyle} required onChange={handleChange} />
                    </div>

                    <button
                        type="submit"
                        className="btn-primary"
                        disabled={loading}
                        style={{ marginTop: '1rem', width: '100%', opacity: loading ? 0.7 : 1 }}
                    >
                        {loading ? 'Registrando...' : 'Registrarse'}
                    </button>
                </form>
                <p style={{ textAlign: 'center', marginTop: '1.5rem', color: 'var(--text-muted)' }}>
                    ¿Ya tienes cuenta? <Link to="/login" style={{ color: 'var(--primary)' }}>Inicia sesión</Link>
                </p>
            </div>
        </div>
    );
}
