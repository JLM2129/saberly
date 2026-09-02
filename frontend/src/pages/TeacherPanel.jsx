import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatImageUrl } from '../utils/url';
import './TeacherPanel.css';

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8001/api').replace(/\/$/, '');

const EMPTY_FORM = {
    area: '',
    subarea: '',
    enunciado: '',
    tipo: 'seleccion_unica',
    dificultad: 'media',
    competencia: 'interpretar',
    explicacion: '',
    imagen_url: '',
    opciones: [
        { texto: '', es_correcta: false, orden: 0 },
        { texto: '', es_correcta: false, orden: 1 },
        { texto: '', es_correcta: false, orden: 2 },
        { texto: '', es_correcta: false, orden: 3 }
    ],
    contexto_data: { tipo: 'texto', titulo: '', contenido: '', archivo: '', url_externa: '' },
    useContexto: false
};

export default function TeacherPanel() {
    const navigate = useNavigate();

    // ── Estado global ─────────────────────────────────────────────────────
    const [user, setUser]           = useState(null);
    const [areas, setAreas]         = useState([]);
    const [loading, setLoading]     = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [uploadingContextImage, setUploadingContextImage] = useState(false);
    const [message, setMessage]     = useState({ type: '', text: '' });

    // ── Modo de la pantalla: "list" | "form" ──────────────────────────────
    const [mode, setMode]           = useState('list');
    const [editingId, setEditingId] = useState(null); // null = crear nuevo

    // ── Estado del listado ────────────────────────────────────────────────
    const [preguntas, setPreguntas]     = useState([]);
    const [loadingList, setLoadingList] = useState(false);
    const [search, setSearch]           = useState('');
    const [filterArea, setFilterArea]   = useState('');
    const [pagination, setPagination]   = useState({ count: 0, next: null, previous: null });
    const [currentPage, setCurrentPage] = useState(1);
    const [debouncedSearch, setDebouncedSearch] = useState('');

    // ── Estado del formulario ─────────────────────────────────────────────
    const [formData, setFormData] = useState(EMPTY_FORM);

    // ── Efectos iniciales ─────────────────────────────────────────────────
    useEffect(() => {
        checkTeacherStatus();
        fetchAreas();
    }, []);

    useEffect(() => {
        const t = setTimeout(() => setDebouncedSearch(search), 350);
        return () => clearTimeout(t);
    }, [search]);

    // Cambiar de área o de búsqueda reinicia la paginación: si no, se puede
    // quedar en una página que ya no existe dentro del nuevo filtro.
    useEffect(() => {
        setCurrentPage(1);
    }, [filterArea, debouncedSearch]);

    useEffect(() => {
        if (mode === 'list') fetchPreguntas();
    }, [mode, currentPage, filterArea, debouncedSearch]);

    // ── Subida de imágenes a la API ────────────────────────────────────────
    const handleImageFileUpload = async (file, target = 'question') => {
        if (!file) return;
        const isContext = target === 'context';
        if (isContext) setUploadingContextImage(true);
        else setUploadingImage(true);
        setMessage({ type: '', text: '' });

        try {
            const token = localStorage.getItem('access_token');
            const bodyData = new FormData();
            bodyData.append('image', file);

            const res = await fetch(`${API_URL}/preguntas/upload-image/`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
                body: bodyData
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || 'Error al subir la imagen');
            }

            const resData = await res.json();
            const imagePath = resData.relative_path || resData.url;

            if (isContext) {
                setFormData(prev => ({
                    ...prev,
                    contexto_data: { ...prev.contexto_data, archivo: imagePath }
                }));
            } else {
                setFormData(prev => ({
                    ...prev,
                    imagen_url: imagePath
                }));
            }
            setMessage({ type: 'success', text: '📷 ¡Imagen subida exitosamente!' });
        } catch (e) {
            setMessage({ type: 'error', text: e.message || 'Error al subir la imagen' });
        } finally {
            if (isContext) setUploadingContextImage(false);
            else setUploadingImage(false);
        }
    };

    // ── Autenticación ─────────────────────────────────────────────────────
    const checkTeacherStatus = async () => {
        try {
            const token = localStorage.getItem('access_token');
            if (!token) { navigate('/login'); return; }
            const res = await fetch(`${API_URL}/users/profile/`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                if (!data.is_teacher) {
                    setMessage({ type: 'error', text: 'No tienes permisos de docente' });
                    setTimeout(() => navigate('/'), 3000);
                    return;
                }
                setUser(data);
            } else {
                navigate('/login');
            }
        } catch { navigate('/login'); }
    };

    // ── Áreas ─────────────────────────────────────────────────────────────
    const fetchAreas = async () => {
        try {
            const res = await fetch(`${API_URL}/preguntas/areas/`);
            if (res.ok) setAreas(await res.json());
        } catch (e) { console.error('Error cargando áreas:', e); }
    };

    // ── Listado de preguntas ──────────────────────────────────────────────
    const fetchPreguntas = useCallback(async () => {
        setLoadingList(true);
        try {
            const token = localStorage.getItem('access_token');
            let url = `${API_URL}/preguntas/teacher/?page=${currentPage}`;
            if (filterArea) url += `&area_id=${filterArea}`;
            if (debouncedSearch) url += `&search=${encodeURIComponent(debouncedSearch)}`;
            const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
            if (res.ok) {
                const data = await res.json();
                if (data.results !== undefined) {
                    setPreguntas(data.results);
                    setPagination({ count: data.count, next: data.next, previous: data.previous });
                } else {
                    setPreguntas(data);
                }
            }
        } catch (e) { console.error('Error cargando preguntas:', e); }
        finally { setLoadingList(false); }
    }, [currentPage, filterArea, debouncedSearch]);

    // El filtrado ya lo hace el backend. Filtrar aquí además solo alcanzaría a la
    // página cargada y escondería resultados de las demás.
    const preguntasFiltradas = preguntas;

    // ── Editar: cargar datos en el formulario ─────────────────────────────
    const handleEdit = async (pregunta) => {
        setMessage({ type: '', text: '' });
        try {
            const token = localStorage.getItem('access_token');
            const res = await fetch(`${API_URL}/preguntas/teacher/${pregunta.id}/`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('No se pudo cargar la pregunta');
            const data = await res.json();

            const areaId = data.subarea?.area?.id || data.area?.id || '';
            const subareaId = data.subarea?.id || '';

            setFormData({
                area: areaId ? String(areaId) : '',
                subarea: subareaId ? String(subareaId) : '',
                enunciado: data.enunciado || '',
                tipo: data.tipo || 'seleccion_unica',
                dificultad: data.dificultad || 'media',
                competencia: data.competencia || 'interpretar',
                explicacion: data.explicacion || '',
                imagen_url: data.imagen_url || '',
                opciones: data.opciones?.length
                    ? data.opciones.map((op, i) => ({
                        id: op.id,
                        texto: op.texto,
                        es_correcta: op.es_correcta,
                        orden: op.orden ?? i
                    }))
                    : EMPTY_FORM.opciones,
                contexto_data: data.contexto
                    ? {
                        tipo: data.contexto.tipo || 'texto',
                        titulo: data.contexto.titulo || '',
                        contenido: data.contexto.contenido || '',
                        archivo: data.contexto.archivo || '',
                        url_externa: data.contexto.url_externa || ''
                    }
                    : { tipo: 'texto', titulo: '', contenido: '', archivo: '', url_externa: '' },
                useContexto: !!(data.contexto?.contenido || data.contexto?.archivo || data.contexto?.url_externa)
            });
            setEditingId(data.id);
            setMode('form');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (e) {
            setMessage({ type: 'error', text: e.message });
        }
    };

    // ── Desactivar pregunta ───────────────────────────────────────────────
    const handleDeactivate = async (id) => {
        if (!window.confirm('¿Desactivar esta pregunta? Dejará de aparecer en simulacros y juegos.')) return;
        try {
            const token = localStorage.getItem('access_token');
            const res = await fetch(`${API_URL}/preguntas/teacher/${id}/`, {
                method: 'PATCH',
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ active: false })
            });
            if (res.ok) {
                setMessage({ type: 'success', text: 'Pregunta desactivada correctamente.' });
                fetchPreguntas();
            } else {
                throw new Error('No se pudo desactivar la pregunta.');
            }
        } catch (e) {
            setMessage({ type: 'error', text: e.message });
        }
    };

    // ── Formulario: handlers ──────────────────────────────────────────────
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleOpcionChange = (index, field, value) => {
        const newOpciones = [...formData.opciones];
        newOpciones[index][field] = value;
        if (field === 'es_correcta' && value) {
            newOpciones.forEach((op, i) => { if (i !== index) op.es_correcta = false; });
        }
        setFormData(prev => ({ ...prev, opciones: newOpciones }));
    };

    const handleContextoChange = (field, value) => {
        setFormData(prev => ({ ...prev, contexto_data: { ...prev.contexto_data, [field]: value } }));
    };

    const addOpcion = () => {
        setFormData(prev => ({
            ...prev,
            opciones: [...prev.opciones, { texto: '', es_correcta: false, orden: prev.opciones.length }]
        }));
    };

    const removeOpcion = (index) => {
        if (formData.opciones.length <= 2) {
            setMessage({ type: 'error', text: 'Debe haber al menos 2 opciones' });
            return;
        }
        setFormData(prev => ({ ...prev, opciones: prev.opciones.filter((_, i) => i !== index) }));
    };

    const goToNewQuestion = () => {
        setEditingId(null);
        setFormData(EMPTY_FORM);
        setMessage({ type: '', text: '' });
        setMode('form');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const goToList = () => {
        setEditingId(null);
        setFormData(EMPTY_FORM);
        setMessage({ type: '', text: '' });
        setMode('list');
    };

    // ── Enviar formulario (crear o actualizar) ────────────────────────────
    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage({ type: '', text: '' });

        try {
            if (!formData.enunciado.trim()) throw new Error('El enunciado es obligatorio');

            const opcionesValidas = formData.opciones.filter(op => op.texto.trim());
            if (opcionesValidas.length < 2) throw new Error('Debe haber al menos 2 opciones con texto');

            const correctas = opcionesValidas.filter(op => op.es_correcta);
            if (correctas.length === 0) throw new Error('Debe marcar al menos una opción como correcta');
            if (correctas.length > 1) throw new Error('Solo puede haber una opción correcta');

            const dataToSend = {
                area: parseInt(formData.area),
                subarea: formData.subarea ? parseInt(formData.subarea) : null,
                enunciado: formData.enunciado,
                tipo: formData.tipo,
                dificultad: formData.dificultad,
                competencia: formData.competencia,
                explicacion: formData.explicacion,
                imagen_url: formData.imagen_url || null,
                opciones: opcionesValidas,
            };

            if (formData.useContexto) {
                const ctx = formData.contexto_data;
                if (ctx.contenido?.trim() || ctx.archivo || ctx.url_externa) {
                    dataToSend.contexto_data = ctx;
                }
            }

            const token = localStorage.getItem('access_token');
            const isEditing = editingId !== null;
            const url = isEditing
                ? `${API_URL}/preguntas/teacher/${editingId}/`
                : `${API_URL}/preguntas/teacher/`;
            const method = isEditing ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(dataToSend)
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.detail || JSON.stringify(errorData) || 'Error al guardar la pregunta');
            }

            setMessage({
                type: 'success',
                text: isEditing ? '✅ ¡Pregunta actualizada exitosamente!' : '✅ ¡Pregunta creada exitosamente!'
            });

            if (isEditing) {
                setTimeout(() => goToList(), 1200);
            } else {
                // Antes solo se limpiaba el formulario: el docente se quedaba sin
                // ninguna señal de que la pregunta se hubiera guardado. Ahora se
                // vuelve al listado, donde aparece primera por fecha de creación.
                const areaCreada = formData.area;
                setFormData(EMPTY_FORM);
                setTimeout(() => {
                    goToList();
                    setCurrentPage(1);
                    // Alinear los filtros con la pregunta recién creada. Si quedara
                    // activo un filtro de otra área, el listado no la mostraría y el
                    // mensaje de confirmación estaría mintiendo.
                    setFilterArea(areaCreada ? String(areaCreada) : '');
                    setSearch('');
                    setMessage({
                        type: 'success',
                        text: '✅ ¡Pregunta creada! Aparece al inicio del listado.'
                    });
                }, 900);
            }

        } catch (error) {
            setMessage({ type: 'error', text: error.message || 'Error al guardar la pregunta' });
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } finally {
            setLoading(false);
        }
    };

    const selectedArea = areas.find(a => a.id === parseInt(formData.area));

    // ─────────────────────────────────────────────────────────────────────
    // RENDER
    // ─────────────────────────────────────────────────────────────────────
    return (
        <div className="teacher-panel">
            {/* ── Encabezado ── */}
            <div className="teacher-header">
                <h1>Panel de Docente</h1>
                <p>{mode === 'list' ? 'Banco de Preguntas' : editingId ? 'Editar Pregunta' : 'Nueva Pregunta'}</p>
            </div>

            {/* ── Tabs de navegación ── */}
            <div className="mode-tabs">
                <button
                    className={`tab-btn ${mode === 'list' ? 'active' : ''}`}
                    onClick={goToList}
                >
                    📋 Ver Preguntas
                </button>
                <button
                    className={`tab-btn ${mode === 'form' && !editingId ? 'active' : ''}`}
                    onClick={goToNewQuestion}
                >
                    ➕ Nueva Pregunta
                </button>
            </div>

            {/* ── Mensaje de estado ── */}
            {message.text && (
                <div className={`message ${message.type}`}>{message.text}</div>
            )}

            {/* ════════════════════════════════════════════════════════════
                MODO LISTA
            ════════════════════════════════════════════════════════════ */}
            {mode === 'list' && (
                <div className="questions-list-container glass-card">
                    {/* Barra de búsqueda y filtros */}
                    <div className="list-toolbar">
                        <input
                            type="text"
                            className="search-input"
                            placeholder="🔍 Buscar por enunciado..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                        <select
                            className="filter-select"
                            value={filterArea}
                            onChange={e => { setFilterArea(e.target.value); setCurrentPage(1); }}
                        >
                            <option value="">Todas las áreas</option>
                            {areas.map(a => (
                                <option key={a.id} value={a.id}>{a.nombre}</option>
                            ))}
                        </select>
                        <span className="questions-count">
                            {preguntasFiltradas.length} pregunta{preguntasFiltradas.length !== 1 ? 's' : ''}
                        </span>
                    </div>

                    {/* Tabla de preguntas */}
                    {loadingList ? (
                        <div className="list-loading">Cargando preguntas...</div>
                    ) : preguntasFiltradas.length === 0 ? (
                        <div className="list-empty">
                            <p>No se encontraron preguntas.</p>
                            <button className="btn-primary" onClick={goToNewQuestion}>
                                ➕ Crear la primera pregunta
                            </button>
                        </div>
                    ) : (
                        <>
                            <div className="questions-table">
                                <div className="table-header">
                                    <span>Enunciado</span>
                                    <span>Área</span>
                                    <span>Dificultad</span>
                                    <span>Acciones</span>
                                </div>
                                {preguntasFiltradas.map(pregunta => (
                                    <div key={pregunta.id} className="question-row">
                                        <span className="row-enunciado" title={pregunta.enunciado}>
                                            {pregunta.enunciado?.length > 90
                                                ? pregunta.enunciado.substring(0, 90) + '…'
                                                : pregunta.enunciado}
                                        </span>
                                        <span className="row-area">
                                            {pregunta.area_nombre || pregunta.subarea_nombre || '—'}
                                        </span>
                                        <span className={`badge-dificultad badge-${pregunta.dificultad}`}>
                                            {pregunta.dificultad}
                                        </span>
                                        <span className="row-actions">
                                            <button
                                                className="btn-edit"
                                                title="Editar pregunta"
                                                onClick={() => handleEdit(pregunta)}
                                            >
                                                ✏️ Editar
                                            </button>
                                            <button
                                                className="btn-deactivate"
                                                title="Desactivar pregunta"
                                                onClick={() => handleDeactivate(pregunta.id)}
                                            >
                                                🚫 Desactivar
                                            </button>
                                        </span>
                                    </div>
                                ))}
                            </div>

                            {/* Paginación */}
                            {(pagination.next || pagination.previous) && (
                                <div className="pagination">
                                    <button
                                        className="btn-page"
                                        disabled={!pagination.previous}
                                        onClick={() => setCurrentPage(p => p - 1)}
                                    >
                                        ← Anterior
                                    </button>
                                    <span>Página {currentPage}</span>
                                    <button
                                        className="btn-page"
                                        disabled={!pagination.next}
                                        onClick={() => setCurrentPage(p => p + 1)}
                                    >
                                        Siguiente →
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}

            {/* ════════════════════════════════════════════════════════════
                MODO FORMULARIO (Crear / Editar)
            ════════════════════════════════════════════════════════════ */}
            {mode === 'form' && (
                <>
                    {editingId && (
                        <button className="btn-back" onClick={goToList}>
                            ← Volver al listado
                        </button>
                    )}

                    <form onSubmit={handleSubmit} className="question-form glass-card">

                        {/* ── Clasificación ── */}
                        <div className="form-section">
                            <h2>Clasificación</h2>
                            <div className="form-row">
                                <div className="form-group">
                                    <label htmlFor="area">Área *</label>
                                    <select id="area" name="area" value={formData.area} onChange={handleInputChange} required>
                                        <option value="">Seleccionar área</option>
                                        {areas.map(area => (
                                            <option key={area.id} value={area.id}>{area.nombre}</option>
                                        ))}
                                    </select>
                                </div>

                                {selectedArea?.subareas?.length > 0 && (
                                    <div className="form-group">
                                        <label htmlFor="subarea">Subárea (Opcional)</label>
                                        <select id="subarea" name="subarea" value={formData.subarea} onChange={handleInputChange}>
                                            <option value="">Ninguna</option>
                                            {selectedArea.subareas.map(s => (
                                                <option key={s.id} value={s.id}>{s.nombre}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label htmlFor="tipo">Tipo de Pregunta</label>
                                    <select id="tipo" name="tipo" value={formData.tipo} onChange={handleInputChange}>
                                        <option value="seleccion_unica">Selección múltiple única</option>
                                        <option value="asociada_contexto">Asociada a contexto</option>
                                        <option value="interpretacion">Interpretación de datos</option>
                                        <option value="analisis">Análisis de situación</option>
                                        <option value="inferencia">Inferencia</option>
                                        <option value="lectura_critica">Lectura crítica</option>
                                        <option value="razonamiento_cuantitativo">Razonamiento cuantitativo</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label htmlFor="dificultad">Dificultad</label>
                                    <select id="dificultad" name="dificultad" value={formData.dificultad} onChange={handleInputChange}>
                                        <option value="facil">Fácil</option>
                                        <option value="media">Media</option>
                                        <option value="dificil">Difícil</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label htmlFor="competencia">Competencia</label>
                                    <select id="competencia" name="competencia" value={formData.competencia} onChange={handleInputChange}>
                                        <option value="interpretar">Interpretar</option>
                                        <option value="argumentar">Argumentar</option>
                                        <option value="proponer">Proponer</option>
                                        <option value="modelar">Modelar</option>
                                        <option value="razonar">Razonar</option>
                                        <option value="comunicar">Comunicar</option>
                                        <option value="inferir">Inferir</option>
                                        <option value="analizar">Analizar</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* ── Contexto ── */}
                        <div className="form-section">
                            <div className="section-header">
                                <h2>Contexto</h2>
                                <label className="checkbox-label">
                                    <input
                                        type="checkbox"
                                        checked={formData.useContexto}
                                        onChange={e => setFormData(prev => ({ ...prev, useContexto: e.target.checked }))}
                                    />
                                    <span>Agregar contexto a esta pregunta</span>
                                </label>
                            </div>

                            {formData.useContexto && (
                                <>
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label htmlFor="contexto-tipo">Tipo de Contexto</label>
                                            <select id="contexto-tipo" value={formData.contexto_data.tipo} onChange={e => handleContextoChange('tipo', e.target.value)}>
                                                <option value="texto">Texto</option>
                                                <option value="imagen">Imagen</option>
                                                <option value="tabla">Tabla</option>
                                                <option value="grafica">Gráfica</option>
                                                <option value="audio">Audio</option>
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label htmlFor="contexto-titulo">Título del Contexto</label>
                                            <input
                                                type="text"
                                                id="contexto-titulo"
                                                value={formData.contexto_data.titulo}
                                                onChange={e => handleContextoChange('titulo', e.target.value)}
                                                placeholder="Ej: Fragmento de 'Cien años de soledad'"
                                            />
                                        </div>
                                    </div>

                                    <div className="form-group">
                                        <label htmlFor="contexto-contenido">Contenido / Descripción del Contexto *</label>
                                        <textarea
                                            id="contexto-contenido"
                                            value={formData.contexto_data.contenido}
                                            onChange={e => handleContextoChange('contenido', e.target.value)}
                                            placeholder="Ingrese el texto, descripción o contenido del contexto..."
                                            rows="4"
                                        />
                                    </div>

                                    {/* Cargar imagen de Contexto */}
                                    <div className="form-group" style={{ marginTop: '1rem' }}>
                                        <label>Imagen del Contexto (Opcional)</label>
                                        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={e => e.target.files?.[0] && handleImageFileUpload(e.target.files[0], 'context')}
                                                disabled={uploadingContextImage}
                                                style={{ flex: 1 }}
                                            />
                                            {uploadingContextImage && <span>Subiendo...</span>}
                                        </div>
                                        {formData.contexto_data.archivo && (
                                            <div style={{ marginTop: '0.75rem' }}>
                                                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                                                    Vista previa de imagen de contexto:
                                                </p>
                                                <img
                                                    src={formatImageUrl(formData.contexto_data.archivo)}
                                                    alt="Vista previa de contexto"
                                                    style={{ maxHeight: '180px', borderRadius: '8px', border: '1px solid var(--glass-border)' }}
                                                />
                                                <div>
                                                    <button
                                                        type="button"
                                                        style={{ background: 'transparent', color: '#f87171', border: 'none', cursor: 'pointer', fontSize: '0.85rem', marginTop: '0.25rem' }}
                                                        onClick={() => handleContextoChange('archivo', '')}
                                                    >
                                                        🗑️ Eliminar imagen de contexto
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>

                        {/* ── Enunciado ── */}
                        <div className="form-section">
                            <h2>Enunciado de la Pregunta</h2>
                            <div className="form-group">
                                <label htmlFor="enunciado">Pregunta *</label>
                                <textarea
                                    id="enunciado" name="enunciado"
                                    value={formData.enunciado} onChange={handleInputChange}
                                    placeholder="Escribe aquí el enunciado de la pregunta..."
                                    rows="4" required
                                />
                            </div>

                            {/* Cargar imagen de la Pregunta */}
                            <div className="form-group" style={{ marginTop: '1rem' }}>
                                <label htmlFor="imagen_url">Imagen de la Pregunta (Opcional)</label>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={e => e.target.files?.[0] && handleImageFileUpload(e.target.files[0], 'question')}
                                            disabled={uploadingImage}
                                            style={{ flex: 1 }}
                                        />
                                        {uploadingImage && <span>Subiendo...</span>}
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>O pega una URL:</span>
                                        <input
                                            type="text" id="imagen_url" name="imagen_url"
                                            value={formData.imagen_url} onChange={handleInputChange}
                                            placeholder="https://ejemplo.com/imagen.png o imagenes/mi_foto.png"
                                            style={{ flex: 1 }}
                                        />
                                    </div>
                                </div>
                                {formData.imagen_url && (
                                    <div style={{ marginTop: '0.75rem' }}>
                                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                                            Vista previa de la imagen:
                                        </p>
                                        <img
                                            src={formatImageUrl(formData.imagen_url)}
                                            alt="Vista previa de pregunta"
                                            style={{ maxHeight: '200px', borderRadius: '8px', border: '1px solid var(--glass-border)' }}
                                        />
                                        <div>
                                            <button
                                                type="button"
                                                style={{ background: 'transparent', color: '#f87171', border: 'none', cursor: 'pointer', fontSize: '0.85rem', marginTop: '0.25rem' }}
                                                onClick={() => setFormData(prev => ({ ...prev, imagen_url: '' }))}
                                            >
                                                🗑️ Eliminar imagen
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* ── Opciones de respuesta ── */}
                        <div className="form-section">
                            <div className="section-header">
                                <h2>Opciones de Respuesta</h2>
                                <button type="button" className="btn-add-option" onClick={addOpcion}>
                                    + Agregar Opción
                                </button>
                            </div>
                            {formData.opciones.map((opcion, index) => (
                                <div key={index} className="opcion-item">
                                    <div className="opcion-header">
                                        <span className="opcion-label">Opción {String.fromCharCode(65 + index)}</span>
                                        {formData.opciones.length > 2 && (
                                            <button type="button" className="btn-remove" onClick={() => removeOpcion(index)}>✕</button>
                                        )}
                                    </div>
                                    <div className="opcion-content">
                                        <textarea
                                            value={opcion.texto}
                                            onChange={e => handleOpcionChange(index, 'texto', e.target.value)}
                                            placeholder="Texto de la opción..."
                                            rows="2"
                                        />
                                        <label className="checkbox-label">
                                            <input
                                                type="checkbox"
                                                checked={opcion.es_correcta}
                                                onChange={e => handleOpcionChange(index, 'es_correcta', e.target.checked)}
                                            />
                                            <span>Correcta</span>
                                        </label>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* ── Explicación ── */}
                        <div className="form-section">
                            <h2>Explicación de la Respuesta</h2>
                            <div className="form-group">
                                <label htmlFor="explicacion">Explicación (Recomendado)</label>
                                <textarea
                                    id="explicacion" name="explicacion"
                                    value={formData.explicacion} onChange={handleInputChange}
                                    placeholder="Explica por qué la respuesta correcta es la adecuada..."
                                    rows="4"
                                />
                            </div>
                        </div>

                        {/* ── Botones ── */}
                        <div className="form-actions">
                            <button type="button" className="btn-secondary" onClick={editingId ? goToList : () => navigate('/')}>
                                {editingId ? '← Volver al listado' : 'Cancelar'}
                            </button>
                            <button type="submit" className="btn-primary" disabled={loading}>
                                {loading
                                    ? 'Guardando...'
                                    : editingId ? '💾 Actualizar Pregunta' : '💾 Guardar Pregunta'}
                            </button>
                        </div>
                    </form>
                </>
            )}
        </div>
    );
}
