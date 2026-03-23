import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSimulacros } from '../services/simulacros';
import { isAuthenticated } from '../services/auth';
import juegosService from '../services/juegos';

export default function Estadisticas() {
    const [simulacros, setSimulacros] = useState([]);
    const [partidas, setPartidas] = useState([]);
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
            const [onlineSims, userPartidas] = await Promise.all([
                getSimulacros(),
                juegosService.getMisPartidas()
            ]);

            const offlineHistorial = JSON.parse(localStorage.getItem('historial_offline') || '[]');

            const combinedSims = [
                ...onlineSims.map(s => ({ ...s, es_offline: false })),
                ...offlineHistorial.map(s => ({
                    ...s,
                    es_offline: true,
                    fecha_inicio: s.fecha_creacion,
                    puntaje_total: s.puntaje
                }))
            ];

            const sortedSims = combinedSims
                .filter(s => s.completado)
                .sort((a, b) => new Date(b.fecha_inicio) - new Date(a.fecha_inicio));

            setSimulacros(sortedSims);
            setPartidas(userPartidas);
        } catch (error) {
            console.error(error);
            const offlineHistorial = JSON.parse(localStorage.getItem('historial_offline') || '[]');
            setSimulacros(offlineHistorial.map(s => ({
                ...s,
                es_offline: true,
                fecha_inicio: s.fecha_creacion,
                puntaje_total: s.puntaje
            })));
        } finally {
            setLoading(false);
        }
    };

    const calculatePointsAndMedals = () => {
        // Puntos de simulacros: cada % es 10 puntos (ej 100% = 1000 pts)
        const puntosSimulacros = simulacros.reduce((acc, s) => acc + (s.puntaje_total * 10), 0);
        // Puntos de juegos: los guardados directamente
        // Multiplicador x1.5 para Duelo Multijugador (multi) por ser el modo más difícil
        const puntosJuegos = partidas.reduce((acc, p) => {
            const multi = p.tipo_juego === 'multi' ? 1.5 : 1;
            return acc + (p.puntaje_total * multi);
        }, 0);

        const totalPuntos = Math.floor(puntosSimulacros + puntosJuegos);

        // Lógica de medallas
        const medals = [];
        const totalAttempts = simulacros.length + partidas.length;

        if (totalAttempts >= 1) medals.push({ id: 1, name: 'Primer Paso', emoji: '👣', desc: 'Completaste tu primera actividad.' });
        if (totalAttempts >= 10) medals.push({ id: 2, name: 'Veterano', emoji: '🎖️', desc: '10 actividades completadas.' });

        // Racha imbatible medal
        const bestStreak = Math.max(0, ...partidas.filter(p => p.tipo_juego === 'streak').map(p => p.max_combo));
        if (bestStreak >= 5) medals.push({ id: 3, name: 'Racha de Fuego', emoji: '🔥', desc: 'Racha de 5 o más aciertos.' });
        if (bestStreak >= 10) medals.push({ id: 4, name: 'Intocable', emoji: '🛡️', desc: 'Racha de 10 o más aciertos.' });

        // Sabio millonario medal
        const bestMil = Math.max(0, ...partidas.filter(p => p.tipo_juego === 'millionaire').map(p => p.puntaje_total));
        if (bestMil >= 50000) medals.push({ id: 5, name: 'Medio Millonario', emoji: '💰', desc: 'Llegaste a los 50.000 puntos.' });
        if (bestMil >= 1000000) medals.push({ id: 6, name: 'Genio Universal', emoji: '👑', desc: '¡Ganaste el millón!' });

        // Multiplayer Duel medals
        const multiWins = partidas.filter(p => p.tipo_juego === 'multi' && p.puntaje_total > 0).length;
        if (multiWins >= 1) medals.push({ id: 8, name: 'Gladiador', emoji: '⚔️', desc: 'Ganaste tu primer punto en un duelo.' });
        if (multiWins >= 5) medals.push({ id: 9, name: 'Señor del Duelo', emoji: '🏛️', desc: 'Dominaste 5 duelos multijugador.' });

        // Simulacro perfecto
        if (simulacros.some(s => s.puntaje_total === 100)) medals.push({ id: 7, name: 'Perfección', emoji: '💎', desc: '100% en un simulacro.' });

        // Insuperable (High Score general)
        if (totalPuntos >= 50000) medals.push({ id: 10, name: 'Insuperable', emoji: '🌌', desc: 'Alcanzaste los 50.000 puntos globales.' });

        // Level system: 5000 pts per level
        const level = Math.floor(totalPuntos / 5000) + 1;
        const progress = (totalPuntos % 5000) / 5000 * 100;

        return { totalPuntos, medals, level, progress };
    };

    const calculateStats = () => {
        if (simulacros.length === 0) return null;
        const totalPuntaje = simulacros.reduce((acc, s) => acc + s.puntaje_total, 0);
        const promedio = totalPuntaje / simulacros.length;

        const areasStats = {};
        simulacros.forEach(s => {
            if (s.detalles) {
                s.detalles.forEach(d => {
                    const area = d.pregunta.area_nombre || 'General';
                    if (!areasStats[area]) areasStats[area] = { total: 0, correctas: 0 };
                    areasStats[area].total += 1;
                    if (d.es_correcta) areasStats[area].correctas += 1;
                });
            }
        });

        const areaScores = Object.entries(areasStats).map(([name, stat]) => ({
            name,
            score: (stat.correctas / stat.total) * 100
        }));

        return { promedio, areaScores };
    };

    if (loading) return <div style={{ paddingTop: '100px', textAlign: 'center', color: 'white' }}>Cargando estadísticas...</div>;

    const stats = calculateStats();
    const { totalPuntos, medals, level, progress } = calculatePointsAndMedals();

    return (
        <div style={{ paddingTop: '100px', paddingLeft: '2rem', paddingRight: '2rem', paddingBottom: '5rem', minHeight: '100vh', background: 'var(--bg-app)', color: 'white' }}>

            {/* Header: Perfil y Nivel */}
            <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '2rem', padding: '2rem', marginBottom: '2rem', border: '1px solid var(--primary)' }}>
                <div style={{ width: '100px', height: '100px', borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem', boxShadow: '0 0 20px var(--primary-glow)' }}>
                    🎓
                </div>
                <div style={{ flex: 1 }}>
                    <h2 style={{ margin: 0 }}>Nivel {level}</h2>
                    <p style={{ color: 'var(--text-muted)', margin: '5px 0' }}>{totalPuntos} Puntos Totales</p>
                    <div style={{ width: '100%', height: '10px', background: 'rgba(255,255,255,0.1)', borderRadius: '5px', marginTop: '10px' }}>
                        <div style={{ width: `${progress}%`, height: '100%', background: 'var(--primary)', borderRadius: '5px', boxShadow: '0 0 10px var(--primary-glow)' }}></div>
                    </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Próximo Nivel</div>
                    <div style={{ fontWeight: 'bold' }}>{5000 - (totalPuntos % 5000)} pts</div>
                </div>
            </div>

            {/* Grid de Medallas */}
            <h2 style={{ marginBottom: '1rem' }}>Mis Medallas ({medals.length})</h2>
            <div style={{ display: 'flex', gap: '1rem', overflowX: 'auto', paddingBottom: '1rem', marginBottom: '2rem' }}>
                {medals.length === 0 && <p style={{ color: 'var(--text-muted)' }}>Continúa practicando para ganar tu primera medalla.</p>}
                {medals.map(m => (
                    <div key={m.id} className="glass-card" style={{ minWidth: '150px', textAlign: 'center', padding: '1.5rem', border: '1px solid rgba(251, 191, 36, 0.3)' }} title={m.desc}>
                        <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>{m.emoji}</div>
                        <div style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>{m.name}</div>
                    </div>
                ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                {/* Resumen de Simulacros */}
                <div className="glass-card" style={{ padding: '2rem' }}>
                    <h2 style={{ marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>Rendimiento Académico</h2>
                    {stats ? (
                        <>
                            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                                <div style={{ fontSize: '3.5rem', fontWeight: 'bold', color: 'var(--primary)' }}>{stats.promedio.toFixed(1)}%</div>
                                <p style={{ color: 'var(--text-muted)' }}>Promedio en Simulacros</p>
                            </div>
                            {stats.areaScores.map(area => (
                                <div key={area.name} style={{ marginBottom: '1rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem', fontSize: '0.9rem' }}>
                                        <span>{area.name}</span>
                                        <span>{area.score.toFixed(0)}%</span>
                                    </div>
                                    <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px' }}>
                                        <div style={{ width: `${area.score}%`, height: '100%', background: 'var(--primary)', borderRadius: '4px' }}></div>
                                    </div>
                                </div>
                            ))}
                        </>
                    ) : (
                        <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No hay datos suficientes.</p>
                    )}
                </div>

                {/* Resumen de Juegos */}
                <div className="glass-card" style={{ padding: '2rem' }}>
                    <h2 style={{ marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>Actividad en Desafíos</h2>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', textAlign: 'center' }}>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Desafíos Jugados</div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{partidas.length}</div>
                        </div>
                        <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', textAlign: 'center' }}>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Mejor Racha</div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#fbbf24' }}>
                                {Math.max(0, ...partidas.map(p => p.max_combo))}
                            </div>
                        </div>
                    </div>

                    <h3 style={{ marginTop: '2rem', marginBottom: '1rem', fontSize: '1rem' }}>Últimas Partidas:</h3>
                    {partidas.slice(0, 5).map(p => (
                        <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '0.9rem' }}>
                            <span>
                                {p.tipo_juego === 'quick' ? '⚡ Rápido' :
                                    p.tipo_juego === 'millionaire' ? '💰 Sabio' :
                                        p.tipo_juego === 'bomb' ? '💣 Bomba' :
                                            p.tipo_juego === 'multi' ? '⚔️ Duelo' : '🔥 Racha'}
                            </span>
                            <span style={{ fontWeight: 'bold', color: 'var(--primary)' }}>{p.puntaje_total} pts</span>
                        </div>
                    ))}
                </div>

                {/* Historial de Simulacros (Tabla) */}
                <div className="glass-card" style={{ gridColumn: 'span 2', padding: '2rem' }}>
                    <h2 style={{ marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>Historial Completo</h2>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-muted)' }}>
                                <th style={{ padding: '1rem' }}>Fecha</th>
                                <th style={{ padding: '1rem' }}>Actividad</th>
                                <th style={{ padding: '1rem' }}>Puntaje / Resultado</th>
                                <th style={{ padding: '1rem' }}>Acción</th>
                            </tr>
                        </thead>
                        <tbody>
                            {simulacros.map(s => (
                                <tr key={`sim-${s.id}`} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                    <td style={{ padding: '1rem' }}>{new Date(s.fecha_inicio).toLocaleDateString()}</td>
                                    <td>Simulacro</td>
                                    <td style={{ padding: '1rem', fontWeight: 'bold', color: s.puntaje_total > 60 ? '#22c55e' : '#ef4444' }}>
                                        {s.puntaje_total.toFixed(1)}%
                                    </td>
                                    <td>
                                        <button onClick={() => navigate(`/simulacro/${s.id}/resultados`)} style={{ padding: '4px 12px', borderRadius: '4px', background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', cursor: 'pointer' }}>
                                            Ver
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
