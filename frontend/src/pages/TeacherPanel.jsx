import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
// import axios from 'axios'; // Eliminado para evitar problemas de dependencias
import './TeacherPanel.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function TeacherPanel() {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [areas, setAreas] = useState([]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    const [formData, setFormData] = useState({
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
        contexto_data: {
            tipo: 'texto',
            titulo: '',
            contenido: ''
        },
        useContexto: false
    });

    useEffect(() => {
        checkTeacherStatus();
        fetchAreas();
    }, []);

    const checkTeacherStatus = async () => {
        try {
            const token = localStorage.getItem('access_token');
            if (!token) {
                navigate('/login');
                return;
            }

            const response = await fetch(`${API_URL}/users/profile/`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                if (!data.is_teacher) {
                    setMessage({ type: 'error', text: 'No tienes permisos de docente' });
                    setTimeout(() => navigate('/'), 3000);
                    return;
                }
                setUser(data);
            } else {
                navigate('/login');
            }
        } catch (error) {
            console.error('Error verificando status:', error);
            navigate('/login');
        }
    };

    const fetchAreas = async () => {
        try {
            const response = await fetch(`${API_URL}/preguntas/areas/`);
            if (response.ok) {
                const data = await response.json();
                setAreas(data);
            }
        } catch (error) {
            console.error('Error cargando áreas:', error);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleOpcionChange = (index, field, value) => {
        const newOpciones = [...formData.opciones];
        newOpciones[index][field] = value;

        // Si se marca como correcta, desmarcar las demás
        if (field === 'es_correcta' && value) {
            newOpciones.forEach((opcion, i) => {
                if (i !== index) opcion.es_correcta = false;
            });
        }

        setFormData(prev => ({ ...prev, opciones: newOpciones }));
    };

    const handleContextoChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            contexto_data: { ...prev.contexto_data, [field]: value }
        }));
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
        setFormData(prev => ({
            ...prev,
            opciones: prev.opciones.filter((_, i) => i !== index)
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage({ type: '', text: '' });

        try {
            // Validaciones
            if (!formData.enunciado.trim()) {
                throw new Error('El enunciado es obligatorio');
            }

            const opcionesValidas = formData.opciones.filter(op => op.texto.trim());
            if (opcionesValidas.length < 2) {
                throw new Error('Debe haber al menos 2 opciones con texto');
            }

            const correctas = opcionesValidas.filter(op => op.es_correcta);
            if (correctas.length === 0) {
                throw new Error('Debe marcar al menos una opción como correcta');
            }
            if (correctas.length > 1) {
                throw new Error('Solo puede haber una opción correcta');
            }

            // Preparar datos para enviar
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

            // Agregar contexto solo si se está usando
            if (formData.useContexto && formData.contexto_data.contenido.trim()) {
                dataToSend.contexto_data = formData.contexto_data;
            }

            const token = localStorage.getItem('access_token');
            const response = await fetch(`${API_URL}/preguntas/teacher/`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(dataToSend)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Error creando la pregunta');
            }

            setMessage({ type: 'success', text: '¡Pregunta creada exitosamente!' });

            // Resetear formulario
            setFormData({
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
                contexto_data: {
                    tipo: 'texto',
                    titulo: '',
                    contenido: ''
                },
                useContexto: false
            });

            // Scroll al inicio para ver el mensaje
            window.scrollTo({ top: 0, behavior: 'smooth' });

        } catch (error) {
            console.error('Error creando pregunta:', error);
            setMessage({
                type: 'error',
                text: error.response?.data?.detail || error.message || 'Error creando la pregunta'
            });
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } finally {
            setLoading(false);
        }
    };

    const selectedArea = areas.find(a => a.id === parseInt(formData.area));

    return (
        <div className="teacher-panel">
            <div className="teacher-header">
                <h1>Panel de Docente</h1>
                <p>Agregar Nueva Pregunta al Banco de Preguntas</p>
            </div>

            {message.text && (
                <div className={`message ${message.type}`}>
                    {message.text}
                </div>
            )}

            <form onSubmit={handleSubmit} className="question-form glass-card">
                {/* Área y Subárea */}
                <div className="form-section">
                    <h2>Clasificación</h2>
                    <div className="form-row">
                        <div className="form-group">
                            <label htmlFor="area">Área *</label>
                            <select
                                id="area"
                                name="area"
                                value={formData.area}
                                onChange={handleInputChange}
                                required
                            >
                                <option value="">Seleccionar área</option>
                                {areas.map(area => (
                                    <option key={area.id} value={area.id}>
                                        {area.nombre}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {selectedArea && selectedArea.subareas && selectedArea.subareas.length > 0 && (
                            <div className="form-group">
                                <label htmlFor="subarea">Subárea (Opcional)</label>
                                <select
                                    id="subarea"
                                    name="subarea"
                                    value={formData.subarea}
                                    onChange={handleInputChange}
                                >
                                    <option value="">Ninguna</option>
                                    {selectedArea.subareas.map(subarea => (
                                        <option key={subarea.id} value={subarea.id}>
                                            {subarea.nombre}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label htmlFor="tipo">Tipo de Pregunta</label>
                            <select
                                id="tipo"
                                name="tipo"
                                value={formData.tipo}
                                onChange={handleInputChange}
                            >
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
                            <select
                                id="dificultad"
                                name="dificultad"
                                value={formData.dificultad}
                                onChange={handleInputChange}
                            >
                                <option value="facil">Fácil</option>
                                <option value="media">Media</option>
                                <option value="dificil">Difícil</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label htmlFor="competencia">Competencia</label>
                            <select
                                id="competencia"
                                name="competencia"
                                value={formData.competencia}
                                onChange={handleInputChange}
                            >
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

                {/* Contexto */}
                <div className="form-section">
                    <div className="section-header">
                        <h2>Contexto</h2>
                        <label className="checkbox-label">
                            <input
                                type="checkbox"
                                checked={formData.useContexto}
                                onChange={(e) => setFormData(prev => ({ ...prev, useContexto: e.target.checked }))}
                            />
                            <span>Agregar contexto a esta pregunta</span>
                        </label>
                    </div>

                    {formData.useContexto && (
                        <>
                            <div className="form-row">
                                <div className="form-group">
                                    <label htmlFor="contexto-tipo">Tipo de Contexto</label>
                                    <select
                                        id="contexto-tipo"
                                        value={formData.contexto_data.tipo}
                                        onChange={(e) => handleContextoChange('tipo', e.target.value)}
                                    >
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
                                        onChange={(e) => handleContextoChange('titulo', e.target.value)}
                                        placeholder="Ej: Fragmento de 'Cien años de soledad'"
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label htmlFor="contexto-contenido">Contenido del Contexto *</label>
                                <textarea
                                    id="contexto-contenido"
                                    value={formData.contexto_data.contenido}
                                    onChange={(e) => handleContextoChange('contenido', e.target.value)}
                                    placeholder="Ingrese el texto, descripción o contenido del contexto..."
                                    rows="6"
                                />
                            </div>
                        </>
                    )}
                </div>

                {/* Enunciado */}
                <div className="form-section">
                    <h2>Enunciado de la Pregunta</h2>
                    <div className="form-group">
                        <label htmlFor="enunciado">Pregunta *</label>
                        <textarea
                            id="enunciado"
                            name="enunciado"
                            value={formData.enunciado}
                            onChange={handleInputChange}
                            placeholder="Escribe aquí el enunciado de la pregunta..."
                            rows="4"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="imagen_url">URL de Imagen (Opcional)</label>
                        <input
                            type="url"
                            id="imagen_url"
                            name="imagen_url"
                            value={formData.imagen_url}
                            onChange={handleInputChange}
                            placeholder="https://ejemplo.com/imagen.png"
                        />
                    </div>
                </div>

                {/* Opciones de Respuesta */}
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
                                    <button
                                        type="button"
                                        className="btn-remove"
                                        onClick={() => removeOpcion(index)}
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>
                            <div className="opcion-content">
                                <textarea
                                    value={opcion.texto}
                                    onChange={(e) => handleOpcionChange(index, 'texto', e.target.value)}
                                    placeholder="Texto de la opción..."
                                    rows="2"
                                />
                                <label className="checkbox-label">
                                    <input
                                        type="checkbox"
                                        checked={opcion.es_correcta}
                                        onChange={(e) => handleOpcionChange(index, 'es_correcta', e.target.checked)}
                                    />
                                    <span>Correcta</span>
                                </label>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Explicación */}
                <div className="form-section">
                    <h2>Explicación de la Respuesta</h2>
                    <div className="form-group">
                        <label htmlFor="explicacion">Explicación (Recomendado)</label>
                        <textarea
                            id="explicacion"
                            name="explicacion"
                            value={formData.explicacion}
                            onChange={handleInputChange}
                            placeholder="Explica por qué la respuesta correcta es la adecuada..."
                            rows="4"
                        />
                    </div>
                </div>

                {/* Botones */}
                <div className="form-actions">
                    <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => navigate('/')}
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        className="btn-primary"
                        disabled={loading}
                    >
                        {loading ? 'Guardando...' : 'Guardar Pregunta'}
                    </button>
                </div>
            </form>
        </div>
    );
}
