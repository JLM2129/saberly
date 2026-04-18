import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getSimulacroById } from '../services/simulacros';
import { useMode } from '../context/ModeContext';
import { formatImageUrl } from '../utils/url';
import ExplicacionIA from '../components/ExplicacionIA';

export default function ResultadosSimulacro() {
    const { isOffline } = useMode();
    const { id } = useParams();
    const navigate = useNavigate();
    const [simulacro, setSimulacro] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, [id]);

    const loadData = async () => {
        try {
            if (isOffline || id.startsWith('local_')) {
                const data = JSON.parse(localStorage.getItem('last_offline_result'));
                if (!data) {
                    navigate('/simulacros');
                    return;
                }
                setSimulacro(data);
            } else {
                const data = await getSimulacroById(id);
                setSimulacro(data);
                const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
                const BASE_URL = API_URL.replace('/api', '');
            }
        } catch (error) {
            console.error(error);
            alert('Error cargando resultados');
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div style={{ paddingTop: '100px', textAlign: 'center', color: 'white' }}>Cargando resultados...</div>;
    if (!simulacro) return <div style={{ paddingTop: '100px', textAlign: 'center', color: 'white' }}>No se encontró el simulacro.</div>;

    const totalPreguntas = simulacro.detalles.length;
    const correctas = simulacro.detalles.filter(d => d.es_correcta).length;
    const porcentaje = Math.round((correctas / totalPreguntas) * 100) || 0;

    return (
        <div style={{ paddingTop: '100px', paddingBottom: '50px', minHeight: '100vh', background: 'var(--bg-app)', color: 'var(--text-main)' }}>
            <div style={{ maxWidth: '800px', margin: '0 auto', padding: '0 var(--spacing-md)' }}>

                <h1 style={{ textAlign: 'center', marginBottom: 'var(--spacing-lg)', fontSize: '2.5rem' }}>Resultados del Simulacro</h1>

                {/* Score Card */}
                <div className="glass-card" style={{ textAlign: 'center', marginBottom: 'var(--spacing-xl)', padding: '2rem' }}>
                    <div style={{ fontSize: '4rem', fontWeight: 'bold', color: 'var(--primary)', marginBottom: '1rem' }}>
                        {isOffline ? simulacro.puntaje : simulacro.puntaje_total} / 100
                    </div>
                    <p style={{ fontSize: '1.2rem', color: 'var(--text-muted)' }}>
                        Respondiste correctamente {correctas} de {totalPreguntas} preguntas.
                    </p>
                    <div style={{ marginTop: '1rem', height: '10px', width: '100%', background: 'rgba(255,255,255,0.1)', borderRadius: '5px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${porcentaje}%`, background: 'var(--gradient-primary)', transition: 'width 1s ease' }}></div>
                    </div>
                    <div style={{ marginTop: '1rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                        Tiempo usado: {Math.floor(simulacro.tiempo_usado_segundos / 60)} min {simulacro.tiempo_usado_segundos % 60} s
                    </div>
                </div>

                {/* Question Review */}
                <h3 style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem' }}>Revisión de Preguntas</h3>

                <div style={{ display: 'grid', gap: '1rem' }}>
                    {simulacro.detalles.map((detalle, index) => {
                        const correctOption = detalle.pregunta.opciones?.find(o => o.es_correcta);
                        const selectedOption = detalle.pregunta.opciones?.find(o => o.id === detalle.opcion_seleccionada);

                        return (
                            <div key={detalle.id} className="glass-card" style={{ borderLeft: detalle.es_correcta ? '4px solid #22c55e' : '4px solid #ef4444' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                    <span style={{ fontWeight: 'bold' }}>Pregunta {index + 1}</span>
                                    <span style={{ color: detalle.es_correcta ? '#22c55e' : '#ef4444', fontWeight: 'bold' }}>
                                        {detalle.es_correcta ? 'Correcta' : 'Incorrecta'}
                                    </span>
                                </div>
                                <div className="status-badge" style={{ marginBottom: '1rem' }}>
                                    <span>{detalle.pregunta.area_nombre}</span>
                                </div>

                                {detalle.pregunta.contexto && (
                                    <div className="context-review" style={{
                                        padding: '1rem',
                                        background: 'rgba(0,0,0,0.2)',
                                        borderRadius: '8px',
                                        marginBottom: '1rem',
                                        borderLeft: '4px solid var(--primary)'
                                    }}>
                                        {detalle.pregunta.contexto.contenido && <p style={{ fontSize: '0.9rem' }}>{detalle.pregunta.contexto.contenido}</p>}
                                        {detalle.pregunta.contexto.archivo && (
                                            <img
                                                src={formatImageUrl(detalle.pregunta.contexto.archivo)}
                                                alt="Contexto"
                                                style={{ maxWidth: '100%', borderRadius: '8px', marginTop: '0.5rem' }}
                                            />
                                        )}
                                    </div>
                                )}

                                <p style={{ marginBottom: '1rem', fontWeight: 'bold' }}>{detalle.pregunta.enunciado}</p>
                                {detalle.pregunta.imagen_url && (
                                    <img
                                        src={formatImageUrl(detalle.pregunta.imagen_url)}
                                        alt="Pregunta"
                                        style={{ maxWidth: '100%', borderRadius: '8px', marginBottom: '1rem', display: 'block' }}
                                    />
                                )}

                                {/* Opciones */}
                                {detalle.pregunta.opciones && (
                                    <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                                        {detalle.pregunta.opciones.map(op => {
                                            const isSelected = detalle.opcion_seleccionada === op.id;
                                            const isCorrect = op.es_correcta;

                                            let style = {};
                                            if (isCorrect) style = { color: '#22c55e', fontWeight: 'bold' };
                                            if (isSelected && !isCorrect) style = { color: '#ef4444', textDecoration: 'line-through' };

                                            return (
                                                <div key={op.id} style={style}>
                                                    - {op.texto} {isSelected ? '(Tu respuesta)' : ''} {isCorrect ? '✓' : ''}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}

                                {/* AI Explanation Tool */}
                                {!isOffline && (
                                    <ExplicacionIA 
                                        questionId={detalle.pregunta.id}
                                        userAnswer={selectedOption?.texto || 'No respondida'}
                                        correctAnswer={correctOption?.texto || 'N/A'}
                                    />
                                )}
                            </div>
                        );
                    })}
                </div>

                <div style={{ marginTop: '2rem', textAlign: 'center' }}>
                    <button className="btn-primary" onClick={() => navigate('/simulacros')}>Volver a Simulacros</button>
                </div>

            </div>
        </div>
    );
}

