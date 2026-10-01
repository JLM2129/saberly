import React, { useState, useEffect } from 'react';
import { formatImageUrl } from '../utils/url';
import './TeacherAnalytics.css';

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8001/api').replace(/\/$/, '');

export default function TeacherAnalytics({ user }) {
    const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'student360' | 'workshop' | 'adminGlobal'
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Estado Institucional / Colegio
    const [selectedGrade, setSelectedGrade] = useState('');
    const [dashboardData, setDashboardData] = useState(null);
    const [studentsList, setStudentsList] = useState([]);

    // Estado Estudiante 360°
    const [selectedStudentId, setSelectedStudentId] = useState('');
    const [student360Data, setStudent360Data] = useState(null);
    const [loadingStudent, setLoadingStudent] = useState(false);

    // Estado Taller de Refuerzo
    const [workshopData, setWorkshopData] = useState(null);
    const [generatingWorkshop, setGeneratingWorkshop] = useState(false);

    // Estado Admin Global Saberly
    const [adminMacroData, setAdminMacroData] = useState(null);

    useEffect(() => {
        fetchDashboardData();
        fetchStudentsList();
        if (user?.is_content_admin || user?.is_staff || user?.is_superuser) {
            fetchAdminMacroData();
        }
    }, [selectedGrade]);

    useEffect(() => {
        if (selectedStudentId) {
            fetchStudent360(selectedStudentId);
        }
    }, [selectedStudentId]);

    const fetchDashboardData = async () => {
        setLoading(true);
        setError(null);
        try {
            const token = localStorage.getItem('access_token');
            let url = `${API_URL}/estadisticas/docente/dashboard-general/`;
            if (selectedGrade) url += `?grade=${encodeURIComponent(selectedGrade)}`;

            const res = await fetch(url, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || 'No se pudo cargar la analítica del colegio.');
            }

            const data = await res.json();
            setDashboardData(data);
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    const fetchStudentsList = async () => {
        try {
            const token = localStorage.getItem('access_token');
            let url = `${API_URL}/estadisticas/docente/estudiantes/`;
            if (selectedGrade) url += `?grade=${encodeURIComponent(selectedGrade)}`;

            const res = await fetch(url, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.ok) {
                const data = await res.json();
                setStudentsList(data.estudiantes || []);
            }
        } catch (e) {
            console.error('Error cargando lista de estudiantes:', e);
        }
    };

    const fetchStudent360 = async (studentId) => {
        setLoadingStudent(true);
        try {
            const token = localStorage.getItem('access_token');
            const res = await fetch(`${API_URL}/estadisticas/docente/estudiantes/${studentId}/`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setStudent360Data(data);
            } else {
                setStudent360Data(null);
            }
        } catch (e) {
            console.error('Error cargando ficha 360:', e);
        } finally {
            setLoadingStudent(false);
        }
    };

    const fetchAdminMacroData = async () => {
        try {
            const token = localStorage.getItem('access_token');
            const res = await fetch(`${API_URL}/estadisticas/admin/macro-dashboard/`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                setAdminMacroData(await res.json());
            }
        } catch (e) {
            console.error('Error cargando macro analítica:', e);
        }
    };

    const handleGenerateWorkshop = async () => {
        setGeneratingWorkshop(true);
        try {
            const token = localStorage.getItem('access_token');
            const res = await fetch(`${API_URL}/estadisticas/docente/generar-taller-refuerzo/`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ grade: selectedGrade })
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || 'No se pudo generar el taller');
            }

            const data = await res.json();
            setWorkshopData(data);
        } catch (e) {
            alert(e.message);
        } finally {
            setGeneratingWorkshop(false);
        }
    };

    if (loading) {
        return (
            <div className="teacher-analytics glass-panel" style={{ textAlign: 'center', padding: '3rem' }}>
                <div className="spinner"></div>
                <p style={{ marginTop: '1rem', color: '#94a3b8' }}>Cargando inteligencia de datos y modelo ICFES...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="teacher-analytics glass-panel" style={{ color: '#f87171', textAlign: 'center', padding: '2rem' }}>
                <h3>⚠️ Error al cargar analítica</h3>
                <p>{error}</p>
                <button className="btn-action" onClick={fetchDashboardData} style={{ marginTop: '1rem' }}>
                    🔄 Reintentar
                </button>
            </div>
        );
    }

    const proyeccion = dashboardData?.proyeccion_icfes || {};
    const semaforo = dashboardData?.semaforo_riesgo || {};
    const fatiga = dashboardData?.fatiga_cognitiva || {};
    const debilidades = dashboardData?.top_debilidades || [];

    return (
        <div className="teacher-analytics">
            {/* ── Encabezado y Filtros ── */}
            <div className="analytics-header-card">
                <div className="analytics-title">
                    <h2>📊 Analítica Educativa y Diagnóstico 360°</h2>
                    <p>Institución: <strong>{dashboardData?.colegio || 'Mi Colegio'}</strong></p>
                </div>

                <div className="filter-bar">
                    <label htmlFor="select-grade">Filtrar por Grado/Curso:</label>
                    <select
                        id="select-grade"
                        value={selectedGrade}
                        onChange={e => setSelectedGrade(e.target.value)}
                    >
                        <option value="">Todos los grados</option>
                        {dashboardData?.grados_disponibles?.map(g => (
                            <option key={g} value={g}>{g}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* ── Pestañas ── */}
            <div className="analytics-tabs">
                <button
                    className={`analytics-tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
                    onClick={() => setActiveTab('overview')}
                >
                    🏛️ Resumen Institucional y Proyección
                </button>
                <button
                    className={`analytics-tab-btn ${activeTab === 'student360' ? 'active' : ''}`}
                    onClick={() => setActiveTab('student360')}
                >
                    👤 Ficha 360° por Estudiante
                </button>
                <button
                    className={`analytics-tab-btn ${activeTab === 'workshop' ? 'active' : ''}`}
                    onClick={() => setActiveTab('workshop')}
                >
                    📄 Generador de Talleres de Refuerzo
                </button>

                {(user?.is_content_admin || user?.is_staff || user?.is_superuser) && (
                    <button
                        className={`analytics-tab-btn ${activeTab === 'adminGlobal' ? 'active' : ''}`}
                        onClick={() => setActiveTab('adminGlobal')}
                        style={{ marginLeft: 'auto', background: 'rgba(234, 179, 8, 0.2)', color: '#fde047' }}
                    >
                        🌐 Macro-Analítica Saberly (Admin)
                    </button>
                )}
            </div>

            {/* ════════════════════════════════════════════════════════════
                TAB 1: RESUMEN INSTITUCIONAL Y PROYECCIÓN ICFES
            ════════════════════════════════════════════════════════════ */}
            {activeTab === 'overview' && (
                <>
                    {/* KPIs Principales */}
                    <div className="kpi-grid">
                        <div className="kpi-card">
                            <span className="kpi-title">Proyección Puntaje ICFES</span>
                            <span className="kpi-value" style={{ color: '#38bdf8' }}>
                                {proyeccion.puntaje_global_proyectado || 0} <small style={{ fontSize: '1rem', color: '#94a3b8' }}>/ 500</small>
                            </span>
                            <span className="kpi-subtext">Basado en ponderación oficial Saber 11</span>
                        </div>

                        <div className="kpi-card">
                            <span className="kpi-title">Probabilidad Becas Excelencia</span>
                            <span className="kpi-value" style={{ color: '#4ade80' }}>
                                {proyeccion.probabilidad_beca_excelencia || 0}%
                            </span>
                            <span className="kpi-subtext">Estudiantes proyectados {'>'} 350 pts</span>
                        </div>

                        <div className="kpi-card">
                            <span className="kpi-title">Estudiantes Evaluados</span>
                            <span className="kpi-value">{semaforo.total_evaluados || 0}</span>
                            <span className="kpi-subtext">De {dashboardData?.total_estudiantes_registrados || 0} registrados</span>
                        </div>

                        <div className="kpi-card">
                            <span className="kpi-title">Simulacros Completados</span>
                            <span className="kpi-value">{dashboardData?.total_simulacros_completados || 0}</span>
                            <span className="kpi-subtext">Evaluaciones terminadas</span>
                        </div>
                    </div>

                    {/* Gráficos de Áreas y Semáforo de Riesgo */}
                    <div className="analytics-section-grid">
                        {/* Promedio por Área ICFES */}
                        <div className="glass-panel">
                            <h3>📐 Desempeño por Área ICFES (Escala 0-100)</h3>
                            {Object.entries(proyeccion.desglose_areas || {}).map(([areaNombre, info]) => (
                                <div key={areaNombre} className="area-bar-item">
                                    <div className="area-bar-label">
                                        <span>{areaNombre}</span>
                                        <span>{info.puntaje_area_100}%</span>
                                    </div>
                                    <div className="progress-track">
                                        <div
                                            className="progress-fill"
                                            style={{
                                                width: `${info.puntaje_area_100}%`,
                                                background: info.puntaje_area_100 >= 70 ? '#4ade80' : info.puntaje_area_100 >= 50 ? '#fde047' : '#f87171'
                                            }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Semáforo de Alerta Temprana */}
                        <div className="glass-panel">
                            <h3>🚦 Semáforo de Alerta Temprana</h3>
                            <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '1rem' }}>
                                Clasificación del alumnado según su desempeño general en la plataforma.
                            </p>
                            <div className="traffic-light-grid">
                                <div className="light-box red">
                                    <div className="light-count">{semaforo.alto_riesgo || 0}</div>
                                    <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>Riesgo Alto</div>
                                    <div style={{ fontSize: '0.75rem' }}>{'<'} 50% Acierto</div>
                                </div>
                                <div className="light-box yellow">
                                    <div className="light-count">{semaforo.en_desarrollo || 0}</div>
                                    <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>En Desarrollo</div>
                                    <div style={{ fontSize: '0.75rem' }}>50% - 70% Acierto</div>
                                </div>
                                <div className="light-box green">
                                    <div className="light-count">{semaforo.avanzado || 0}</div>
                                    <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>Avanzado</div>
                                    <div style={{ fontSize: '0.75rem' }}>{'>'} 70% Acierto</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Psicometría de Fatiga Cognitiva y Mapa de Debilidades */}
                    <div className="analytics-section-grid">
                        {/* Curva de Fatiga Cognitiva */}
                        <div className="glass-panel">
                            <h3>🧠 Psicometría: Curva de Fatiga Cognitiva</h3>
                            <div className="fatigue-comparison">
                                <div className="fatigue-stat">
                                    <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Precisión 1ª Mitad</div>
                                    <div className="fatigue-val">{fatiga.precision_primera_mitad || 0}%</div>
                                </div>
                                <div style={{ fontSize: '1.5rem', color: '#94a3b8' }}>➔</div>
                                <div className="fatigue-stat">
                                    <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Precisión 2ª Mitad</div>
                                    <div className="fatigue-val" style={{ color: fatiga.caida_rendimiento_porcentaje > 10 ? '#f87171' : '#38bdf8' }}>
                                        {fatiga.precision_segunda_mitad || 0}%
                                    </div>
                                </div>
                            </div>
                            <div className="fatigue-diag">
                                <strong>Diagnóstico Psicométrico:</strong> {fatiga.diagnostico || 'Sin datos suficientes'}
                            </div>
                        </div>

                        {/* Top 10 Debilidades Críticas */}
                        <div className="glass-panel">
                            <h3>🔥 Mapa de Calor: Debilidades Críticas del Colegio</h3>
                            {debilidades.length === 0 ? (
                                <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>No hay registradas debilidades recurrentes aún.</p>
                            ) : (
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Tema / Concepto</th>
                                            <th>Área</th>
                                            <th>Alumnos Afectados</th>
                                            <th>Precisión Prom.</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {debilidades.map((deb, idx) => (
                                            <tr key={idx}>
                                                <td><strong>{deb.debilidad}</strong></td>
                                                <td>{deb.area_nombre}</td>
                                                <td><span className="badge-risk red">{deb.estudiantes_afectados} alumnos</span></td>
                                                <td>{deb.precision_promedio}%</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </>
            )}

            {/* ════════════════════════════════════════════════════════════
                TAB 2: FICHA 360° POR ESTUDIANTE
            ════════════════════════════════════════════════════════════ */}
            {activeTab === 'student360' && (
                <div className="glass-panel">
                    <h3>👤 Diagnóstico Individual 360° por Estudiante</h3>
                    <div className="student-selector-box">
                        <label htmlFor="student-select">Seleccionar Estudiante:</label>
                        <select
                            id="student-select"
                            value={selectedStudentId}
                            onChange={e => setSelectedStudentId(e.target.value)}
                            style={{ flex: 1, maxWidt: '400px' }}
                        >
                            <option value="">-- Elige un estudiante de {dashboardData?.colegio} --</option>
                            {studentsList.map(st => (
                                <option key={st.id} value={st.id}>
                                    {st.full_name} ({st.grade || 'Sin grado'}) - Promedio: {st.promedio_puntaje}%
                                </option>
                            ))}
                        </select>
                    </div>

                    {loadingStudent ? (
                        <div style={{ textAlign: 'center', padding: '2rem' }}>Cargando ficha del estudiante...</div>
                    ) : !selectedStudentId ? (
                        <p style={{ color: '#94a3b8', textAlign: 'center', padding: '2rem' }}>
                            Por favor selecciona un estudiante del listado superior para ver su diagnóstico pedagógico completo.
                        </p>
                    ) : student360Data ? (
                        <>
                            {/* Ficha técnica */}
                            <div className="student-info-grid">
                                <div className="info-chip">
                                    <div className="info-chip-label">Nombre Completo</div>
                                    <div className="info-chip-val">{student360Data.estudiante.full_name}</div>
                                </div>
                                <div className="info-chip">
                                    <div className="info-chip-label">Correo Electrónico</div>
                                    <div className="info-chip-val">{student360Data.estudiante.email}</div>
                                </div>
                                <div className="info-chip">
                                    <div className="info-chip-label">Grado / Curso</div>
                                    <div className="info-chip-val">{student360Data.estudiante.grade || '—'}</div>
                                </div>
                                <div className="info-chip">
                                    <div className="info-chip-label">Estilo de Aprendizaje</div>
                                    <div className="info-chip-val" style={{ color: '#38bdf8' }}>{student360Data.estudiante.learning_style}</div>
                                </div>
                            </div>

                            {/* Competencias y Proyección Individual */}
                            <div className="analytics-section-grid">
                                <div className="glass-panel">
                                    <h4>🎯 Competencias Pedagógicas (Acierto %)</h4>
                                    <table className="data-table">
                                        <thead>
                                            <tr>
                                                <th>Competencia</th>
                                                <th>Porcentaje Acierto</th>
                                                <th>Evaluadas</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {Object.entries(student360Data.competencias_radar || {}).map(([key, info]) => (
                                                <tr key={key}>
                                                    <td>{info.nombre}</td>
                                                    <td>
                                                        <span className={`badge-risk ${info.porcentaje_acierto >= 70 ? 'green' : info.porcentaje_acierto >= 50 ? 'yellow' : 'red'}`}>
                                                            {info.porcentaje_acierto}%
                                                        </span>
                                                    </td>
                                                    <td>{info.preguntas_evaluadas}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                <div className="glass-panel">
                                    <h4>🔥 Debilidades Específicas del Alumno</h4>
                                    {student360Data.debilidades_individuales.length === 0 ? (
                                        <p style={{ color: '#94a3b8' }}>No se registraron debilidades activas para este alumno.</p>
                                    ) : (
                                        <table className="data-table">
                                            <thead>
                                                <tr>
                                                    <th>Debilidad</th>
                                                    <th>Área</th>
                                                    <th>Precisión</th>
                                                    <th>Nivel</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {student360Data.debilidades_individuales.map((deb, i) => (
                                                    <tr key={i}>
                                                        <td><strong>{deb.debilidad}</strong></td>
                                                        <td>{deb.area}</td>
                                                        <td>{deb.precision}%</td>
                                                        <td><span className="badge-risk yellow">{deb.nivel_actual}</span></td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    )}
                                </div>
                            </div>
                        </>
                    ) : null}
                </div>
            )}

            {/* ════════════════════════════════════════════════════════════
                TAB 3: GENERADOR DE TALLERES DE REFUERZO
            ════════════════════════════════════════════════════════════ */}
            {activeTab === 'workshop' && (
                <div className="glass-panel">
                    <h3>📄 Generador Inteligente de Talleres de Nivelación</h3>
                    <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                        Crea automáticamente un taller impreso o digital compuesto por preguntas dirigidas específicamente
                        a los temas en que los estudiantes de <strong>{dashboardData?.colegio}</strong> presentaron mayor índice de fallo.
                    </p>

                    <button
                        className="btn-action"
                        onClick={handleGenerateWorkshop}
                        disabled={generatingWorkshop}
                    >
                        {generatingWorkshop ? 'Generando taller...' : '⚡ Generar Taller de Refuerzo Automático'}
                    </button>

                    {workshopData && (
                        <div className="workshop-preview">
                            <div className="workshop-header">
                                <h3 style={{ margin: 0 }}>{workshopData.titulo_taller}</h3>
                                <p style={{ color: '#94a3b8', margin: '0.25rem 0 0 0' }}>
                                    Destinado a: Grado {workshopData.grado_destinado} | Total Preguntas: {workshopData.total_preguntas}
                                </p>
                                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.75rem' }}>
                                    {workshopData.temas_reforzados.map((tema, i) => (
                                        <span key={i} className="badge-risk yellow">Refuerzo: {tema}</span>
                                    ))}
                                </div>
                            </div>

                            <button
                                className="btn-action"
                                style={{ background: '#334155', marginBottom: '1rem' }}
                                onClick={() => window.print()}
                            >
                                🖨️ Imprimir / Guardar en PDF
                            </button>

                            <div>
                                {workshopData.preguntas.map((preg, idx) => (
                                    <div key={preg.id} style={{ marginBottom: '1.25rem', padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '10px' }}>
                                        <p style={{ fontWeight: 600, margin: '0 0 0.5rem 0' }}>
                                            {idx + 1}. {preg.enunciado}
                                        </p>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.5rem' }}>
                                            {preg.opciones.map((op, oidx) => (
                                                <div key={oidx} style={{ fontSize: '0.85rem', color: op.es_correcta ? '#4ade80' : '#cbd5e1' }}>
                                                    {String.fromCharCode(65 + oidx)}. {op.texto} {op.es_correcta ? '✓' : ''}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ════════════════════════════════════════════════════════════
                TAB 4: MACRO-ANALÍTICA GLOBAL SABERLY (ADMIN)
            ════════════════════════════════════════════════════════════ */}
            {activeTab === 'adminGlobal' && adminMacroData && (
                <div className="glass-panel">
                    <h3 style={{ color: '#fde047' }}>🌐 Macro-Analítica Nacional y Salud de Plataforma</h3>
                    <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                        Estadísticas globales para el equipo administrador de Saberly.
                    </p>

                    <div className="kpi-grid" style={{ marginBottom: '1.5rem' }}>
                        <div className="kpi-card">
                            <span className="kpi-title">Colegios Registrados</span>
                            <span className="kpi-value" style={{ color: '#fde047' }}>{adminMacroData.adopcion_plataforma.colegios_activos}</span>
                        </div>
                        <div className="kpi-card">
                            <span className="kpi-title">Total Estudiantes Nacional</span>
                            <span className="kpi-value">{adminMacroData.adopcion_plataforma.total_estudiantes}</span>
                        </div>
                        <div className="kpi-card">
                            <span className="kpi-title">Simulacros Evaluados</span>
                            <span className="kpi-value">{adminMacroData.adopcion_plataforma.total_simulacros_completados}</span>
                        </div>
                        <div className="kpi-card">
                            <span className="kpi-title">Promedio Nacional</span>
                            <span className="kpi-value">{adminMacroData.adopcion_plataforma.promedio_nacional_simulacros}%</span>
                        </div>
                    </div>

                    <h4>⚠️ Preguntas con Anomalías de Redacción o Dificultad Extrema</h4>
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Enunciado</th>
                                <th>Área</th>
                                <th>Acierto %</th>
                                <th>Motivo Detectado</th>
                            </tr>
                        </thead>
                        <tbody>
                            {adminMacroData.salud_banco_preguntas.preguntas_anomalas.map(anom => (
                                <tr key={anom.pregunta_id}>
                                    <td>#{anom.pregunta_id}</td>
                                    <td>{anom.enunciado}</td>
                                    <td>{anom.area}</td>
                                    <td><span className="badge-risk red">{anom.tasa_acierto_porcentaje}%</span></td>
                                    <td>{anom.motivo}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
