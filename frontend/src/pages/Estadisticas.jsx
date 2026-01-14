import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSimulacros } from '../services/simulacros';
import { isAuthenticated } from '../services/auth';

export default function Estadisticas() {
    const [simulacros, setSimulacros] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const isAuth = isAuthenticated();

    useEffect(() => {
        if (!isAuth) {
            navigate('/login');
            return;
        }
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const data = await getSimulacros();
            // Filtrar solo los completados
            setSimulacros(data.filter(s => s.completado));
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const calculateStats = () => {
        if (simulacros.length === 0) return null;

        const totalPuntaje = simulacros.reduce((acc, s) => acc + s.puntaje_total, 0);
        const promedio = totalPuntaje / simulacros.length;

        // Estadísticas por área
        const areasStats = {};
        simulacros.forEach(s => {
            s.detalles.forEach(d => {
                const area = d.pregunta.area_nombre || 'General';
                if (!areasStats[area]) {
                    areasStats[area] = { total: 0, correctas: 0 };
                }
                areasStats[area].total += 1;
                if (d.es_correcta) {
                    areasStats[area].correctas += 1;
                }
            });
        });

        const areaScores = Object.entries(areasStats).map(([name, stat]) => ({
            name,
            score: (stat.correctas / stat.total) * 100
        }));

        return { promedio, areaScores };
    };

    const getTips = (promedio, areaScores) => {
        const tips = [];
        if (promedio < 40) {
            tips.push("📚 Te recomendamos revisar los fundamentos básicos. No te desanimes, la constancia es la clave.");
        } else if (promedio < 70) {
            tips.push("💡 Vas por buen camino. Identifica los temas que más se te dificultan y dedica tiempo extra a ellos.");
        } else {
            tips.push("🌟 ¡Excelente rendimiento! Continúa realizando simulacros para mantener tu agilidad mental.");
        }

        // Tips por área
        areaScores.forEach(area => {
            if (area.score < 50) {
                tips.push(`🚩 Refuerza el área de ${area.name}. Es tu punto más bajo actualmente.`);
            }
        });

        return tips;
    };

    if (loading) return <div style={{ paddingTop: '100px', textAlign: 'center', color: 'white' }}>Cargando estadísticas...</div>;

    const stats = calculateStats();
    const tips = stats ? getTips(stats.promedio, stats.areaScores) : [];

    return (
        <div style={{ paddingTop: '100px', paddingLeft: '2rem', paddingRight: '2rem', minHeight: '100vh', background: 'var(--bg-app)', color: 'white' }}>
            <h1 style={{ marginBottom: '2rem', fontSize: '2.5rem' }}>Mis Estadísticas</h1>

            {!stats ? (
                <div className="glass-card" style={{ textAlign: 'center', padding: '3rem' }}>
                    <h3>Aún no has completado ningún simulacro</h3>
                    <p style={{ color: 'var(--text-muted)' }}>Realiza tu primera prueba para ver tus estadísticas y recibir consejos.</p>
                    <button className="btn-primary" onClick={() => navigate('/simulacros')} style={{ marginTop: '1rem' }}>Ir a Simulacros</button>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                    {/* Resumen General */}
                    <div className="glass-card" style={{ padding: '2rem' }}>
                        <h2 style={{ marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>Resumen General</h2>
                        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                            <div style={{ fontSize: '3.5rem', fontWeight: 'bold', color: 'var(--primary)' }}>
                                {stats.promedio.toFixed(1)}%
                            </div>
                            <p style={{ color: 'var(--text-muted)' }}>Promedio Global</p>
                        </div>

                        <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>Por Área:</h3>
                        {stats.areaScores.map(area => (
                            <div key={area.name} style={{ marginBottom: '1rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem', fontSize: '0.9rem' }}>
                                    <span>{area.name}</span>
                                    <span>{area.score.toFixed(0)}%</span>
                                </div>
                                <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px' }}>
                                    <div style={{ width: `${area.score}%`, height: '100%', background: 'var(--primary)', borderRadius: '4px', transition: 'width 1s ease' }}></div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Consejos y Tips */}
                    <div className="glass-card" style={{ padding: '2rem', background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.05), rgba(0, 0, 0, 0))' }}>
                        <h2 style={{ marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>Consejos Personalizados</h2>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {tips.map((tip, i) => (
                                <div key={i} style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', borderLeft: '4px solid var(--primary)' }}>
                                    {tip}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Historial Reciente */}
                    <div className="glass-card" style={{ gridColumn: 'span 2', padding: '2rem' }}>
                        <h2 style={{ marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>Historial de Simulacros</h2>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-muted)' }}>
                                    <th style={{ padding: '1rem' }}>Fecha</th>
                                    <th style={{ padding: '1rem' }}>Puntaje</th>
                                    <th style={{ padding: '1rem' }}>Tiempo</th>
                                    <th style={{ padding: '1rem' }}>Acción</th>
                                </tr>
                            </thead>
                            <tbody>
                                {simulacros.map(s => (
                                    <tr key={s.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                        <td style={{ padding: '1rem' }}>{new Date(s.fecha_inicio).toLocaleDateString()}</td>
                                        <td style={{ padding: '1rem', fontWeight: 'bold', color: s.puntaje_total > 60 ? '#22c55e' : '#ef4444' }}>
                                            {s.puntaje_total.toFixed(1)}%
                                        </td>
                                        <td style={{ padding: '1rem' }}>{Math.floor(s.tiempo_usado_segundos / 60)} min</td>
                                        <td style={{ padding: '1rem' }}>
                                            <button
                                                style={{ padding: '4px 12px', borderRadius: '4px', background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', cursor: 'pointer' }}
                                                onClick={() => navigate(`/simulacro/${s.id}/resultados`)}
                                            >
                                                Ver Detalle
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
