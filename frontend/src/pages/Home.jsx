import React from 'react';
import { Link } from 'react-router-dom';

export default function Home() {
    return (
        <main style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            textAlign: 'center',
            background: 'radial-gradient(circle at 50% 10%, #1e293b 0%, #0f172a 100%)',
            paddingTop: '80px'
        }}>
            <div style={{ maxWidth: '800px', padding: '0 var(--spacing-md)' }}>
                <div className="glass-card fade-in">
                    <h1 style={{
                        fontSize: '3.5rem',
                        lineHeight: '1.1',
                        marginBottom: 'var(--spacing-md)',
                        letterSpacing: '-0.02em'
                    }}>
                        Domina el <span className="hero-text-gradient">ICFES</span> con Inteligencia
                    </h1>
                    <p style={{
                        fontSize: '1.25rem',
                        color: 'var(--text-muted)',
                        marginBottom: 'var(--spacing-lg)',
                        maxWidth: '600px',
                        marginLeft: 'auto',
                        marginRight: 'auto'
                    }}>
                        Prepárate para la prueba Saber 11 con nuestra plataforma adaptativa.
                        Simulacros personalizados, feedback instantáneo y estadísticas detalladas.
                    </p>
                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                        <Link to="/simulacros" className="btn-primary" style={{ textDecoration: 'none', display: 'inline-block' }}>
                            Comenzar Simulacro
                        </Link>
                        <Link to="/desafio-rapido" className="btn-primary" style={{
                            textDecoration: 'none',
                            display: 'inline-block',
                            background: 'linear-gradient(135deg, var(--accent), #f472b6)',
                            border: 'none'
                        }}>
                            Modo Desafío 🔥
                        </Link>
                    </div>
                </div>
            </div>
        </main>
    );
}
