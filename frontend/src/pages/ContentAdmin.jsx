import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { isAuthenticated } from '../services/auth';
import './ContentAdmin.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001/api';

export default function ContentAdmin() {
    const navigate = useNavigate();
    const [file, setFile] = useState(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [previewData, setPreviewData] = useState(null);
    const [importSuccess, setImportSuccess] = useState(null);
    const [ignoreDuplicates, setIgnoreDuplicates] = useState(true);
    const [dbStats, setDbStats] = useState(null);
    const fileInputRef = useRef(null);
    
    useEffect(() => {
        if (!isAuthenticated()) {
            navigate('/login');
            return;
        }
        
        // Comprobar si es content admin (opcional: redireccionar si no lo es, 
        // pero el backend ya lo bloqueará. Lo ideal sería revisar el perfil del usuario actual)
        fetchDbStats();
    }, [navigate]);

    const fetchDbStats = async () => {
        const token = localStorage.getItem('access_token');
        try {
            const response = await fetch(`${API_URL}/preguntas/import/stats/`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setDbStats(data);
            }
        } catch (error) {
            console.error('Error fetching db stats', error);
        }
    };

    const handleDragEnter = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const droppedFile = e.dataTransfer.files[0];
            if (droppedFile.type === "application/json" || droppedFile.name.endsWith(".json")) {
                handleFileSelect(droppedFile);
            } else {
                alert("Por favor, sube solo archivos JSON.");
            }
        }
    };

    const handleFileInput = (e) => {
        if (e.target.files && e.target.files.length > 0) {
            handleFileSelect(e.target.files[0]);
        }
    };

    const handleFileSelect = async (selectedFile) => {
        setFile(selectedFile);
        setIsUploading(true);
        setPreviewData(null);
        setImportSuccess(null);
        
        const token = localStorage.getItem('access_token');
        const formData = new FormData();
        formData.append('file', selectedFile);
        
        try {
            const response = await fetch(`${API_URL}/preguntas/import/validate/`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });
            
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || "Error validando el archivo");
            }
            
            setPreviewData(data);
        } catch (error) {
            alert(error.message);
            setFile(null);
        } finally {
            setIsUploading(false);
        }
    };

    const handleConfirmImport = async () => {
        if (!file) return;
        
        setIsUploading(true);
        const token = localStorage.getItem('access_token');
        const formData = new FormData();
        formData.append('file', file);
        formData.append('ignorar_duplicadas', ignoreDuplicates);
        
        try {
            const response = await fetch(`${API_URL}/preguntas/import/confirm/`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });
            
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || "Error al importar el archivo");
            }
            
            setImportSuccess(data);
            setPreviewData(null);
            fetchDbStats(); // Actualizar las estadisticas despues de importar
        } catch (error) {
            alert(error.message);
        } finally {
            setIsUploading(false);
        }
    };

    const resetImport = () => {
        setFile(null);
        setPreviewData(null);
        setImportSuccess(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    return (
        <div className="content-admin-container">
            <div className="content-admin-header">
                <h1>Importación Masiva</h1>
                <p>Sube archivos JSON con preguntas para actualizar el banco de Saberly.</p>
            </div>
            
            {dbStats && (
                <div style={{ marginBottom: '2rem', padding: '1.5rem', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                    <h3 style={{ marginTop: 0, marginBottom: '1rem', color: 'var(--text-main)', fontSize: '1.1rem' }}>
                        📊 Estado Actual de la Base de Datos (Total: {dbStats.total})
                    </h3>
                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                        {dbStats.areas.map(area => (
                            <div key={area.id} style={{ padding: '0.5rem 1rem', background: 'var(--bg-card)', borderRadius: '8px', border: '1px solid var(--glass-border)', fontSize: '0.9rem' }}>
                                <strong style={{ color: 'var(--primary)' }}>{area.nombre}</strong>: {area.total_preguntas}
                            </div>
                        ))}
                    </div>
                </div>
            )}
            
            {importSuccess ? (
                <div className="success-message">
                    <h2>🎉 ¡Importación Exitosa!</h2>
                    <p>Se han importado <strong>{importSuccess.importadas}</strong> preguntas nuevas.</p>
                    <p style={{ color: 'var(--text-muted)' }}>Preguntas ignoradas (errores o duplicadas): {importSuccess.ignoradas}</p>
                    <button className="btn-confirm" onClick={resetImport} style={{ marginTop: '1.5rem' }}>
                        Importar otro archivo
                    </button>
                </div>
            ) : (
                <>
                    <div 
                        className={`upload-zone ${isDragging ? 'drag-active' : ''} ${(isUploading || previewData) ? 'has-file' : ''}`}
                        onDragEnter={handleDragEnter}
                        onDragLeave={handleDragLeave}
                        onDragOver={handleDragOver}
                        onDrop={handleDrop}
                        onClick={() => !previewData && !isUploading && fileInputRef.current.click()}
                        style={{ display: previewData ? 'none' : 'block' }}
                    >
                        {isUploading && !previewData && (
                            <div className="loader-overlay">
                                <div className="spinner"></div>
                                <span>Validando archivo...</span>
                            </div>
                        )}
                        
                        <div className="upload-icon">📂</div>
                        <div className="upload-text">
                            Arrastra tu archivo JSON aquí
                        </div>
                        <div className="upload-subtext">
                            o haz clic para seleccionar desde tu dispositivo
                        </div>
                        <input 
                            type="file" 
                            accept=".json,application/json" 
                            className="file-input"
                            ref={fileInputRef}
                            onChange={handleFileInput}
                            style={{ display: 'none' }}
                        />
                    </div>
                    
                    {previewData && (
                        <div className="preview-container">
                            <h2>Resumen de Validación</h2>
                            <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Archivo: {file.name}</p>
                            
                            <div className="stats-grid">
                                <div className="stat-card total">
                                    <div className="stat-value">{previewData.stats.total}</div>
                                    <div className="stat-label">Total</div>
                                </div>
                                <div className="stat-card nuevas">
                                    <div className="stat-value" style={{color: '#4ade80'}}>{previewData.stats.nuevas}</div>
                                    <div className="stat-label">Nuevas</div>
                                </div>
                                <div className="stat-card duplicadas">
                                    <div className="stat-value" style={{color: '#fde047'}}>{previewData.stats.duplicadas}</div>
                                    <div className="stat-label">Duplicadas</div>
                                </div>
                                <div className="stat-card errores">
                                    <div className="stat-value" style={{color: '#f87171'}}>{previewData.stats.con_error}</div>
                                    <div className="stat-label">Errores</div>
                                </div>
                            </div>
                            
                            {previewData.errores.length > 0 && (
                                <div className="error-list">
                                    <h3>⚠️ Problemas detectados</h3>
                                    <ul>
                                        {previewData.errores.map((err, i) => (
                                            <li key={i}>{err}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                            
                            <h3>Previsualización de Preguntas</h3>
                            <div className="preview-table-container">
                                <table className="preview-table">
                                    <thead>
                                        <tr>
                                            <th>#</th>
                                            <th>Enunciado</th>
                                            <th>Contexto</th>
                                            <th>Opciones</th>
                                            <th>Estado</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {previewData.preview.map((p, i) => (
                                            <tr key={i}>
                                                <td>{p.id_tmp}</td>
                                                <td style={{ maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    {p.enunciado}
                                                </td>
                                                <td style={{ maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    {p.contexto || '-'}
                                                </td>
                                                <td>{p.opciones_count}</td>
                                                <td>
                                                    <span className={`badge ${p.estado}`}>
                                                        {p.estado === 'ok' ? 'Válida' : p.estado === 'duplicada' ? 'Duplicada' : 'Error'}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            
                            <div className="actions-container">
                                <label className="options-toggle">
                                    <input 
                                        type="checkbox" 
                                        checked={ignoreDuplicates}
                                        onChange={(e) => setIgnoreDuplicates(e.target.checked)}
                                    />
                                    Ignorar preguntas duplicadas o con error
                                </label>
                                
                                <div style={{ flex: 1 }}></div>
                                
                                <button className="btn-secondary" onClick={resetImport} disabled={isUploading}>
                                    Cancelar
                                </button>
                                <button 
                                    className="btn-confirm" 
                                    onClick={handleConfirmImport}
                                    disabled={previewData.stats.nuevas === 0 || isUploading}
                                >
                                    {isUploading ? 'Importando...' : 'Confirmar Importación'}
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
