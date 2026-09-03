import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getSimulacroById, submitSimulacro } from '../services/simulacros';
import { useMode } from '../context/ModeContext';
import { submitLocalSimulacro } from '../offline/offlineService';
import { formatImageUrl, hasValidImageUrl } from '../utils/url';

export default function SimulacroRunner() {
    const { isOffline } = useMode();
    const { id } = useParams();
    const navigate = useNavigate();

    const [simulacro, setSimulacro] = useState(null);
    const [loading, setLoading] = useState(true);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [respuestas, setRespuestas] = useState({});
    const [elapsedTime, setElapsedTime] = useState(0);
    const [focusedNavBtn, setFocusedNavBtn] = useState('siguiente');
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [confirmMessage, setConfirmMessage] = useState('');
    const [confirmAction, setConfirmAction] = useState(() => () => {});
    const [pageMessage, setPageMessage] = useState(null); // {type:'info'|'success'|'error', text: ''}

    const safeParse = (key, fallback) => {
        try {
            return JSON.parse(localStorage.getItem(key) || 'null');
        } catch {
            return fallback;
        }
    };

    useEffect(() => {
        let isMounted = true;
        const load = async () => {
            try {
                setLoading(true);

                if (isOffline || id.startsWith('local_')) {
                    // Modo Offline
                    const current = safeParse('current_offline_simulacro', null);
                    const historial = safeParse('historial_offline', []);
                    const lastResult = safeParse('last_offline_result', null);

                    let data = null;
                    if (current && String(current.id) === String(id)) {
                        data = current;
                    } else {
                        data = historial.find(s => String(s.id) === String(id));
                        if (!data && lastResult && String(lastResult.id) === String(id)) {
                            data = lastResult;
                        }
                    }

                    if (isMounted) {
                        if (!data) {
                            navigate('/simulacros');
                            return;
                        }
                        setSimulacro(data);
                    }
                } else {
                    // Modo Online
                    const data = await getSimulacroById(id);
                    if (isMounted) {
                        if (data.completado) {
                            setPageMessage({ type: 'info', text: 'Este simulacro ya fue completado.' });
                            navigate('/simulacros');
                            return;
                        }
                        setSimulacro(data);
                    }
                }
            } catch (error) {
                if (isMounted) {
                    console.error("Error cargando simulacro:", error);
                    setPageMessage({ type: 'error', text: 'Error cargando el simulacro.' });
                    navigate('/simulacros');
                }
            } finally {
                if (isMounted) setLoading(false);
            }
        };
        load();
        return () => { isMounted = false; };
    }, [id, navigate, isOffline]);

    // Timer ultra-robusto
    useEffect(() => {
        const timerId = setInterval(() => {
            setElapsedTime(prev => prev + 1);
        }, 1000);
        return () => clearInterval(timerId);
    }, []);

    const handleSelectOption = (preguntaId, opcionId) => {
        setRespuestas(prev => ({ ...prev, [preguntaId]: opcionId }));
    };

    const handleSubmit = async () => {
        // open confirmation modal
        setConfirmMessage('¿Estás seguro de finalizar el examen?');
        setConfirmAction(() => async () => {
            try {
                if (isOffline || id.startsWith('local_')) {
                    const resultado = submitLocalSimulacro(simulacro, respuestas);
                    localStorage.setItem('last_offline_result', JSON.stringify(resultado));
                    navigate(`/simulacro/${id}/resultados`);
                } else {
                    const payloadRespuestas = Object.entries(respuestas).map(([pId, opId]) => ({
                        pregunta_id: parseInt(pId),
                        opcion_id: opId
                    }));
                    await submitSimulacro(id, payloadRespuestas, elapsedTime);
                    navigate(`/simulacro/${id}/resultados`);
                }
            } catch (error) {
                setPageMessage({ type: 'error', text: 'Error enviando respuestas' });
            }
        });
        setConfirmOpen(true);
    };

    if (loading) {
        return (
            <div style={{ paddingTop: '120px', textAlign: 'center', color: 'white' }}>
                <div className="glass-card" style={{ display: 'block', margin: '0 auto', padding: '2rem', maxWidth: '680px' }}>
                    <h2>Cargando Simulacro...</h2>
                    <p>Preparando tus preguntas</p>
                </div>
            </div>
        );
    }

    if (!simulacro || !simulacro.detalles || simulacro.detalles.length === 0) {
        return (
            <div style={{ paddingTop: '120px', textAlign: 'center', color: 'white' }}>
                <div className="glass-card" style={{ display: 'inline-block', padding: '2rem' }}>
                    <h2>No se encontraron preguntas</h2>
                    <p>El simulacro parece estar vacío.</p>
                    <button className="btn-primary" onClick={() => navigate('/simulacros')}>Volver</button>
                </div>
            </div>
        );
    }

    const total = simulacro.detalles.length;
    const currentDetalle = simulacro.detalles[currentIndex];
    const pregunta = currentDetalle?.pregunta;
    const contexto = pregunta?.contexto;

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const handleNext = () => {
        console.log("Moviendo a siguiente pregunta. Index anterior:", currentIndex);
        setCurrentIndex(prev => prev + 1);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handlePrev = () => {
        console.log("Moviendo a pregunta anterior. Index anterior:", currentIndex);
        setCurrentIndex(prev => prev - 1);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    console.log("RENDER - Question Index:", currentIndex, "Total:", total);

    return (
        <div style={{
            paddingTop: '40px', // Reducido porque el Navbar está oculto
            minHeight: '100vh',
            background: 'var(--bg-app)',
            color: 'var(--text-main)',
            paddingBottom: '50px'
        }}>
            <div style={{ maxWidth: '850px', margin: '0 auto', padding: '0 var(--spacing-md)' }}>

                <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'flex-start' }}>
                    <button 
                        onClick={() => {
                            setConfirmMessage('¿Seguro que quieres abandonar el simulacro? Tu progreso no se guardará.');
                            setConfirmAction(() => async () => { navigate('/simulacros'); });
                            setConfirmOpen(true);
                        }}
                        style={{
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            color: 'var(--text-muted)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            fontWeight: '600',
                            padding: '8px 16px',
                            borderRadius: '8px',
                            transition: 'all 0.2s ease'
                        }}
                        onMouseOver={(e) => {
                            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                            e.currentTarget.style.color = '#ef4444';
                            e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.3)';
                        }}
                        onMouseOut={(e) => {
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                            e.currentTarget.style.color = 'var(--text-muted)';
                            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                        }}
                    >
                        <span>←</span> Abandonar Simulacro
                    </button>
                </div>

                {/* Dashboard del Examen */}
                {pageMessage && (
                    <div style={{ marginBottom: '1rem' }}>
                        <div className={`app-message ${pageMessage.type}`}>
                            <div className="msg-icon" aria-hidden>ℹ️</div>
                            <div className="msg-body">
                                <span className="msg-title">Saberly</span>
                                <span className="msg-text">{pageMessage.text}</span>
                            </div>
                            <button className="msg-close" onClick={() => setPageMessage(null)} aria-label="Cerrar">✕</button>
                        </div>
                    </div>
                )}
                <div className="glass-card" style={{ padding: '1.2rem', marginBottom: '1.5rem', borderLeft: '5px solid var(--primary)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ flex: '0 0 auto' }}>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 'bold', margin: '0 0 4px 0' }}>PROGRESO</p>
                            <h3 style={{ margin: 0, fontSize: '1.4rem' }}>
                                Pregunta <span style={{ color: 'var(--primary)', fontWeight: '800' }}>{(currentIndex + 1)}</span> de {total}
                            </h3>
                            <div style={{ 
                                marginTop: '4px', 
                                display: 'inline-block',
                                padding: '2px 8px', 
                                background: 'rgba(37, 99, 235, 0.12)', 
                                border: '1px solid rgba(37, 99, 235, 0.18)',
                                borderRadius: '4px',
                                fontSize: '0.7rem',
                                color: 'var(--primary)',
                                fontWeight: '700',
                                textTransform: 'uppercase'
                            }}>
                                📁 {pregunta?.area_nombre || 'General'}
                            </div>
                        </div>
                        <div style={{ flex: 1, margin: '0 1rem', maxWidth: '300px' }}>
                            <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '10px', overflow: 'hidden' }}>
                                <div style={{
                                    width: `${((currentIndex + 1) / total) * 100}%`,
                                    height: '100%',
                                    background: 'var(--primary)',
                                    boxShadow: '0 0 10px var(--primary-glow)',
                                    transition: 'width 0.3s ease'
                                }}></div>
                            </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 'bold', margin: 0 }}>TIEMPO</p>
                            <h3 style={{ margin: 0, color: 'var(--accent)', fontFamily: 'monospace', fontSize: '1.5rem' }}>
                                {formatTime(elapsedTime)}
                            </h3>
                        </div>
                    </div>
                </div>

                {/* Contenido de la Pregunta - KEY añade reactividad forzada */}
                <div key={`question-${currentIndex}`} className="glass-card fade-in" style={{ padding: '2rem' }}>

                    {confirmOpen && (
                        <div className="modal-overlay" onClick={() => setConfirmOpen(false)}>
                            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                                <div className="modal-header">
                                    <h3 className="hero-text-gradient">Saberly</h3>
                                    <button className="modal-close" onClick={() => setConfirmOpen(false)}>×</button>
                                </div>
                                <div style={{ padding: '8px 0 16px' }}>
                                    <p style={{ margin: 0, color: 'var(--text-muted)' }}>{confirmMessage}</p>
                                </div>
                                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                                    <button className="btn-save-profile" style={{ background: 'var(--border-subtle)' }} onClick={() => setConfirmOpen(false)}>Cancelar</button>
                                    <button className="btn-save-profile" onClick={async () => { setConfirmOpen(false); await confirmAction(); }}>Confirmar</button>
                                </div>
                            </div>
                        </div>
                    )}

                    {contexto && (
                        <div style={{
                            padding: '1.2rem',
                            marginBottom: '1.5rem',
                            background: 'rgba(0,0,0,0.2)',
                            borderLeft: '4px solid var(--primary)',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: '0.95rem'
                        }}>
                            {contexto.contenido && <p style={{ whiteSpace: 'pre-line', lineHeight: '1.6' }}>{contexto.contenido}</p>}
                            {contexto.archivo && hasValidImageUrl(contexto.archivo) && <img src={formatImageUrl(contexto.archivo)} alt="Contexto" style={{ maxWidth: '100%', borderRadius: '8px', marginTop: '10px', display: 'block', margin: '10px auto' }} />}
                        </div>
                    )}

                    <h2 style={{ fontSize: '1.3rem', marginBottom: '2rem', lineHeight: '1.5', fontWeight: '500' }}>
                        {pregunta?.enunciado}
                    </h2>

                    {pregunta?.imagen_url && hasValidImageUrl(pregunta.imagen_url) && (
                        <img src={formatImageUrl(pregunta.imagen_url)} alt="Pregunta" style={{ maxWidth: '100%', borderRadius: '8px', marginBottom: '1.5rem', display: 'block', margin: '0 auto 1.5rem' }} />
                    )}

                    <div style={{ display: 'grid', gap: '0.8rem' }}>
                        {pregunta?.opciones?.map((opcion, idx) => {
                            const isSelected = respuestas[pregunta.id] === opcion.id;
                            return (
                                <div
                                    key={opcion.id}
                                    onClick={() => handleSelectOption(pregunta.id, opcion.id)}
                                    style={{
                                        padding: '1.1rem',
                                        borderRadius: 'var(--radius-md)',
                                        border: `1px solid ${isSelected ? 'var(--primary)' : 'rgba(255,255,255,0.1)'}`,
                                        background: isSelected ? 'rgba(37, 99, 235, 0.14)' : 'rgba(255,255,255,0.03)',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease',
                                        display: 'flex',
                                        gap: '12px'
                                    }}
                                >
                                    <span style={{ fontWeight: '800', color: isSelected ? 'var(--primary)' : 'var(--text-muted)' }}>
                                        {String.fromCharCode(65 + idx)}.
                                    </span>
                                    <span>{opcion.texto}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Botones de Navegación */}
                <div 
                    style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2.5rem' }}
                    onMouseLeave={() => setFocusedNavBtn('siguiente')}
                >
                    <button
                        type="button"
                        className="btn-primary"
                        style={focusedNavBtn === 'anterior' ? {} : { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-muted)' }}
                        disabled={currentIndex === 0}
                        onClick={handlePrev}
                        onMouseEnter={() => setFocusedNavBtn('anterior')}
                        onFocus={() => setFocusedNavBtn('anterior')}
                        onBlur={() => setFocusedNavBtn('siguiente')}
                    >
                        Anterior
                    </button>

                    {currentIndex < total - 1 ? (
                        <button
                            type="button"
                            className="btn-primary"
                            style={focusedNavBtn === 'siguiente' ? {} : { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-muted)', boxShadow: 'none' }}
                            onClick={handleNext}
                            onMouseEnter={() => setFocusedNavBtn('siguiente')}
                            onFocus={() => setFocusedNavBtn('siguiente')}
                        >
                            Siguiente
                        </button>
                    ) : (
                        <button
                            type="button"
                            className="btn-primary"
                            style={{ background: '#22c55e', boxShadow: '0 0 20px rgba(34, 197, 94, 0.3)' }}
                            onClick={handleSubmit}
                        >
                            Finalizar Examen
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
