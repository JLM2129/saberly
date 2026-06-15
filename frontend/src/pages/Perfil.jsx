import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { isAuthenticated } from '../services/auth';
import './Perfil.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001/api';

const AVATAR_OPTIONS = [
    { style: 'adventurer', label: 'Aventurero' },
    { style: 'adventurer', label: 'Explorador' },
    { style: 'adventurer', label: 'Guardian' },
    { style: 'adventurer', label: 'Samurái' },
    { style: 'adventurer', label: 'Hechicero' },
    { style: 'adventurer', label: 'Detective' },
    { style: 'pixel-art', label: 'Pixel Hero' },
    { style: 'pixel-art', label: 'Cyber Bot' },
    { style: 'pixel-art', label: 'Retro Ninja' },
    { style: 'pixel-art', label: 'Astronauta' },
    { style: 'bottts', label: 'Bot Azul' },
    { style: 'bottts', label: 'Bot Rosa' },
    { style: 'bottts', label: 'Bot Verde' },
    { style: 'adventurer-neutral', label: 'Aventurera' },
    { style: 'human', label: 'Humano' }
];

const getAvatarUrl = (style, seed) => `https://api.dicebear.com/6.x/${style}/svg?seed=${encodeURIComponent(seed)}&size=128`;

const GENDER_OPTIONS = [
    { value: '', label: 'Selecciona género' },
    { value: 'male', label: 'Masculino' },
    { value: 'female', label: 'Femenino' },
    { value: 'non_binary', label: 'No binario' },
    { value: 'prefer_not_to_say', label: 'Prefiero no decirlo' },
];

const LEARNING_STYLE_OPTIONS = [
    { value: '', label: 'Selecciona estilo de aprendizaje' },
    { value: 'visual', label: 'Visual' },
    { value: 'auditory', label: 'Auditivo' },
    { value: 'kinesthetic', label: 'Kinestésico' },
    { value: 'mixed', label: 'Mixto' },
    { value: 'not_sure', label: 'No estoy seguro' },
];

const LANGUAGE_OPTIONS = [
    { value: '', label: 'Selecciona idioma' },
    { value: 'spanish', label: 'Español' },
    { value: 'english', label: 'Inglés' },
    { value: 'other', label: 'Otro' },
];

const DEVICE_ACCESS_OPTIONS = [
    { value: '', label: 'Selecciona acceso a dispositivos' },
    { value: 'home_computer', label: 'Computadora en casa' },
    { value: 'mobile_only', label: 'Solo móvil' },
    { value: 'shared_device', label: 'Dispositivo compartido' },
    { value: 'limited_access', label: 'Acceso limitado' },
    { value: 'no_access', label: 'Sin acceso' },
];

const STUDENT_TYPE_OPTIONS = [
    { value: '', label: 'Selecciona tipo de estudiante' },
    { value: 'regular', label: 'Alumno regular' },
    { value: 'remedial', label: 'Refuerzo' },
    { value: 'recovery', label: 'Recuperación' },
    { value: 'other', label: 'Otro' },
];

const THEMES = {
    dark: {
        name: 'Oscuro Premium',
        variables: {
            '--bg-app': '#0f172a',
            '--bg-card': '#1e293b',
            '--bg-card-hover': '#334155',
            '--text-main': '#f8fafc',
            '--text-muted': '#94a3b8',
            '--primary': '#6366f1',
            '--primary-hover': '#818cf8',
            '--primary-glow': 'rgba(99, 102, 241, 0.5)',
            '--accent': '#ec4899',
            '--border-subtle': '#334155',
            '--glass-border': 'rgba(255, 255, 255, 0.1)'
        }
    },
    cyber: {
        name: 'Cyberpunk Neon',
        variables: {
            '--bg-app': '#090514',
            '--bg-card': '#120b24',
            '--bg-card-hover': '#21143f',
            '--text-main': '#f8fafc',
            '--text-muted': '#a855f7',
            '--primary': '#d946ef',
            '--primary-hover': '#f472b6',
            '--primary-glow': 'rgba(217, 70, 239, 0.5)',
            '--accent': '#39ff14',
            '--border-subtle': '#d946ef',
            '--glass-border': 'rgba(217, 70, 239, 0.25)'
        }
    },
    forest: {
        name: 'Bosque Esmeralda',
        variables: {
            '--bg-app': '#022c22',
            '--bg-card': '#064e3b',
            '--bg-card-hover': '#0f766e',
            '--text-main': '#f0fdf4',
            '--text-muted': '#a7f3d0',
            '--primary': '#10b981',
            '--primary-hover': '#34d399',
            '--primary-glow': 'rgba(16, 185, 129, 0.5)',
            '--accent': '#f59e0b',
            '--border-subtle': '#065f46',
            '--glass-border': 'rgba(16, 185, 129, 0.15)'
        }
    },
    light: {
        name: 'Claro Elegante',
        variables: {
            '--bg-app': '#f1f5f9',
            '--bg-card': '#ffffff',
            '--bg-card-hover': '#e2e8f0',
            '--text-main': '#0f172a',
            '--text-muted': '#475569',
            '--primary': '#4f46e5',
            '--primary-hover': '#6366f1',
            '--primary-glow': 'rgba(79, 70, 229, 0.3)',
            '--accent': '#db2777',
            '--border-subtle': '#cbd5e1',
            '--glass-border': 'rgba(0, 0, 0, 0.08)'
        }
    }
};

// Helper function to apply a theme
export const applyTheme = (themeName, glassGlow, glassOpacity) => {
    const theme = THEMES[themeName] || THEMES.dark;
    
    // Apply theme base colors
    Object.entries(theme.variables).forEach(([property, value]) => {
        document.documentElement.style.setProperty(property, value);
    });

    // Handle Light Mode specifics for Glassmorphism
    let glassBgValue;
    if (themeName === 'light') {
        glassBgValue = `rgba(255, 255, 255, ${glassOpacity})`;
    } else {
        const rgb = themeName === 'forest' ? '6, 78, 59' : (themeName === 'cyber' ? '18, 11, 36' : '30, 41, 59');
        glassBgValue = `rgba(${rgb}, ${glassOpacity})`;
    }

    const glowStrength = Math.max(0, Math.min(1, glassGlow / 24));
    const glowColor = themeName === 'light' ? '255, 255, 255' : (themeName === 'forest' ? '16, 185, 129' : (themeName === 'cyber' ? '217, 70, 239' : '99, 102, 241'));
    const shadowOpacity = 0.05 + glowStrength * 0.35;
    const borderOpacity = 0.08 + glowStrength * 0.18;

    document.documentElement.style.setProperty('--glass-bg', glassBgValue);
    document.documentElement.style.setProperty('--glass-blur', '12px');
    document.documentElement.style.setProperty('--glass-border', `rgba(${glowColor}, ${borderOpacity})`);
    document.documentElement.style.setProperty('--glass-card-shadow', `0 15px 45px rgba(${glowColor}, ${shadowOpacity})`);
};

const Perfil = () => {
    const [profile, setProfile] = useState({
        full_name: '',
        email: '',
        birthdate: '',
        gender: '',
        school: '',
        grade: '',
        learning_style: '',
        study_habits: '',
        language_preference: '',
        special_education_needs: '',
        extra_support: false,
        access_to_devices: '',
        student_type: '',
        learning_goals: ''
    });
    const [passwordData, setPasswordData] = useState({ password: '', new_password: '', confirm_password: '' });
    const [theme, setTheme] = useState(localStorage.getItem('app_theme') || 'dark');
    const [glassGlow, setGlassGlow] = useState(parseInt(localStorage.getItem('app_glass_glow') || localStorage.getItem('app_glass_blur') || '12'));
    const [glassOpacity, setGlassOpacity] = useState(parseFloat(localStorage.getItem('app_glass_opacity') || '0.7'));
    const [avatarUrl, setAvatarUrl] = useState('');
    const [avatarModalOpen, setAvatarModalOpen] = useState(false);
    const [avatarSaved, setAvatarSaved] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    
    const [profileStatus, setProfileStatus] = useState(null); // { type: 'success'|'error', text: '' }
    const [passwordStatus, setPasswordStatus] = useState(null);
    const [loadingProfile, setLoadingProfile] = useState(true);
    const [submittingProfile, setSubmittingProfile] = useState(false);
    const [submittingPassword, setSubmittingPassword] = useState(false);

    const navigate = useNavigate();

    useEffect(() => {
        if (!isAuthenticated()) {
            navigate('/login');
            return;
        }

        const fetchProfile = async () => {
            try {
                const token = localStorage.getItem('access_token');
                const response = await fetch(`${API_URL}/users/profile/`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (response.ok) {
                    const data = await response.json();
                    setProfile({
                        full_name: data.full_name || '',
                        email: data.email || '',
                        birthdate: data.birthdate || '',
                        gender: data.gender || '',
                        school: data.school || '',
                        grade: data.grade || '',
                        learning_style: data.learning_style || '',
                        study_habits: data.study_habits || '',
                        language_preference: data.language_preference || '',
                        special_education_needs: data.special_education_needs || '',
                        extra_support: data.extra_support || false,
                        access_to_devices: data.access_to_devices || '',
                        student_type: data.student_type || '',
                        learning_goals: data.learning_goals || ''
                    });
                    setAvatarUrl(data.avatar_url || '');
                }
            } catch (error) {
                console.error("Error al cargar perfil:", error);
            } finally {
                setLoadingProfile(false);
            }
        };

        fetchProfile();
    }, [navigate]);

    // Apply configurations in real-time when inputs change
    useEffect(() => {
        applyTheme(theme, glassGlow, glassOpacity);
    }, [theme, glassGlow, glassOpacity]);

    const notifyProfileUpdated = (updatedData) => {
        if (typeof window !== 'undefined' && window.dispatchEvent) {
            window.dispatchEvent(new CustomEvent('userProfileUpdated', { detail: updatedData }));
        }
    };

    const saveProfileUpdates = async (updates = {}) => {
        const token = localStorage.getItem('access_token');
        const response = await fetch(`${API_URL}/users/profile/`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                full_name: updates.full_name ?? profile.full_name,
                email: updates.email ?? profile.email,
                birthdate: updates.birthdate ?? profile.birthdate ?? null,
                gender: updates.gender ?? profile.gender ?? '',
                school: updates.school ?? profile.school ?? '',
                grade: updates.grade ?? profile.grade ?? '',
                learning_style: updates.learning_style ?? profile.learning_style ?? '',
                study_habits: updates.study_habits ?? profile.study_habits ?? '',
                language_preference: updates.language_preference ?? profile.language_preference ?? '',
                special_education_needs: updates.special_education_needs ?? profile.special_education_needs ?? '',
                extra_support: updates.extra_support ?? profile.extra_support ?? false,
                access_to_devices: updates.access_to_devices ?? profile.access_to_devices ?? '',
                student_type: updates.student_type ?? profile.student_type ?? '',
                learning_goals: updates.learning_goals ?? profile.learning_goals ?? '',
                avatar_url: updates.hasOwnProperty('avatar_url') ? updates.avatar_url : (avatarUrl || null)
            })
        });
        return response;
    };

    const handleAvatarSave = async (newAvatarUrl) => {
        setSubmittingProfile(true);
        setProfileStatus(null);

        const avatarValue = newAvatarUrl === undefined ? avatarUrl : newAvatarUrl;

        try {
            const response = await saveProfileUpdates({ avatar_url: avatarValue });
            const data = await response.json();

            if (response.ok) {
                setProfileStatus({ type: 'success', text: 'Avatar actualizado correctamente.' });
                setAvatarSaved(true);
                setAvatarUrl(data.avatar_url || '');
                setProfile(prev => ({
                    ...prev,
                    full_name: data.full_name || prev.full_name,
                    email: data.email || prev.email
                }));
                notifyProfileUpdated(data);
            } else {
                setProfileStatus({ type: 'error', text: data.email || 'Error al actualizar avatar.' });
            }
        } catch (error) {
            setProfileStatus({ type: 'error', text: 'Error de conexión con el servidor.' });
        } finally {
            setSubmittingProfile(false);
        }
    };

    const handleProfileSubmit = async (e) => {
        e.preventDefault();
        setSubmittingProfile(true);
        setProfileStatus(null);

        try {
            const response = await saveProfileUpdates();
            const data = await response.json();

            if (response.ok) {
                setProfileStatus({ type: 'success', text: 'Datos actualizados correctamente.' });
                setAvatarUrl(data.avatar_url || '');
                setProfile(prev => ({
                    ...prev,
                    full_name: data.full_name || prev.full_name,
                    email: data.email || prev.email,
                    birthdate: data.birthdate || prev.birthdate,
                    gender: data.gender || prev.gender,
                    school: data.school || prev.school,
                    grade: data.grade || prev.grade,
                    learning_style: data.learning_style || prev.learning_style,
                    study_habits: data.study_habits || prev.study_habits,
                    language_preference: data.language_preference || prev.language_preference,
                    special_education_needs: data.special_education_needs || prev.special_education_needs,
                    extra_support: data.extra_support ?? prev.extra_support,
                    access_to_devices: data.access_to_devices || prev.access_to_devices,
                    student_type: data.student_type || prev.student_type,
                    learning_goals: data.learning_goals || prev.learning_goals
                }));
                notifyProfileUpdated(data);
            } else {
                setProfileStatus({ type: 'error', text: data.email || 'Error al actualizar perfil.' });
            }
        } catch (error) {
            setProfileStatus({ type: 'error', text: 'Error de conexión con el servidor.' });
        } finally {
            setSubmittingProfile(false);
        }
    };

    const handlePasswordSubmit = async (e) => {
        e.preventDefault();
        setPasswordStatus(null);

        if (passwordData.new_password !== passwordData.confirm_password) {
            setPasswordStatus({ type: 'error', text: 'Las nuevas contraseñas no coinciden.' });
            return;
        }

        setSubmittingPassword(true);

        try {
            const token = localStorage.getItem('access_token');
            const response = await fetch(`${API_URL}/users/profile/`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    password: passwordData.password,
                    new_password: passwordData.new_password
                })
            });

            if (response.ok) {
                setPasswordStatus({ type: 'success', text: 'Contraseña actualizada correctamente.' });
                setPasswordData({ password: '', new_password: '', confirm_password: '' });
            } else {
                const data = await response.json();
                const errorMsg = data.password || data.non_field_errors || 'Error al actualizar contraseña. Verifica tu clave actual.';
                setPasswordStatus({ type: 'error', text: Array.isArray(errorMsg) ? errorMsg[0] : errorMsg });
            }
        } catch (error) {
            setPasswordStatus({ type: 'error', text: 'Error de conexión con el servidor.' });
        } finally {
            setSubmittingPassword(false);
        }
    };

    const saveThemeConfiguration = () => {
        localStorage.setItem('app_theme', theme);
        localStorage.setItem('app_glass_glow', glassGlow.toString());
        localStorage.setItem('app_glass_opacity', glassOpacity.toString());
        alert("¡Configuración de apariencia guardada con éxito!");
    };

    if (loadingProfile) {
        return (
            <div className="perfil-container" style={{ textAlign: 'center', marginTop: '150px' }}>
                <h2>Cargando perfil...</h2>
            </div>
        );
    }

    return (
        <div className="perfil-container fade-in">
            <div className="perfil-hero">
                <h1 className="hero-text-gradient" style={{ fontSize: '3rem' }}>Configuración</h1>
                <p style={{ color: 'var(--text-muted)' }}>Gestiona tu cuenta, fortalece tu perfil académico y personaliza la experiencia como estudiante.</p>
            </div>

            <div className="perfil-intro-card">
                <div className="intro-left">
                    {avatarUrl ? (
                        <img src={avatarUrl} alt="Avatar usuario" className="intro-avatar" />
                    ) : (
                        <div className="intro-avatar placeholder">{profile.full_name ? profile.full_name[0].toUpperCase() : 'U'}</div>
                    )}
                    <div className="intro-copy">
                        <span className="intro-eyebrow">Perfil académico</span>
                        <h2>Tu espacio de aprendizaje personalizado</h2>
                        <p>Un perfil completo ayuda a obtener métricas de avance, recomendaciones de estudio y un seguimiento más inteligente.</p>
                    </div>
                </div>
                <div className="intro-badges">
                    <span className="info-chip">Colegio: {profile.school || 'Sin información'}</span>
                    <span className="info-chip">Grado: {profile.grade || 'Sin información'}</span>
                    <span className="info-chip">Estilo: {profile.learning_style ? LEARNING_STYLE_OPTIONS.find(o => o.value === profile.learning_style)?.label : 'Sin definir'}</span>
                    <span className="info-chip">Idioma: {profile.language_preference ? LANGUAGE_OPTIONS.find(o => o.value === profile.language_preference)?.label : 'Sin definir'}</span>
                </div>
            </div>

            <div className="perfil-grid">
                {/* 1. Datos Personales */}
                <div className="perfil-card">
                    <h3>👤 Datos Personales</h3>
                    {profileStatus && (
                        <div className={`status-alert ${profileStatus.type}`}>
                            {profileStatus.text}
                        </div>
                    )}
                    <form onSubmit={handleProfileSubmit}>
                        <div className="form-group">
                            <label htmlFor="fullname">Nombre Completo</label>
                            <input
                                id="fullname"
                                type="text"
                                className="form-control"
                                value={profile.full_name}
                                onChange={(e) => setProfile(prev => ({ ...prev, full_name: e.target.value }))}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="email">Correo Electrónico</label>
                            <input
                                id="email"
                                type="email"
                                className="form-control"
                                value={profile.email}
                                onChange={(e) => setProfile(prev => ({ ...prev, email: e.target.value }))}
                                required
                            />
                        </div>
                        <button type="submit" className="btn-save-profile" disabled={submittingProfile}>
                            {submittingProfile ? 'Guardando...' : 'Actualizar Datos'}
                        </button>
                    </form>
                </div>

                <div className="perfil-card">
                    <h3>📘 Perfil Educativo</h3>
                    {profileStatus && (
                        <div className={`status-alert ${profileStatus.type}`}>
                            {profileStatus.text}
                        </div>
                    )}
                    <form onSubmit={handleProfileSubmit}>
                        <div className="form-group">
                            <label htmlFor="birthdate">Fecha de Nacimiento</label>
                            <input
                                id="birthdate"
                                type="date"
                                className="form-control"
                                value={profile.birthdate}
                                onChange={(e) => setProfile(prev => ({ ...prev, birthdate: e.target.value }))}
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="gender">Género</label>
                            <select
                                id="gender"
                                name="gender"
                                className="form-control"
                                value={profile.gender}
                                onChange={(e) => setProfile(prev => ({ ...prev, gender: e.target.value }))}
                            >
                                {GENDER_OPTIONS.map(option => (
                                    <option key={option.value} value={option.value} disabled={option.value === ''} hidden={option.value === ''}>{option.label}</option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group">
                            <label htmlFor="school">Institución / Colegio</label>
                            <input
                                id="school"
                                type="text"
                                className="form-control"
                                value={profile.school}
                                onChange={(e) => setProfile(prev => ({ ...prev, school: e.target.value }))}
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="grade">Grado / Curso</label>
                            <input
                                id="grade"
                                type="text"
                                className="form-control"
                                value={profile.grade}
                                onChange={(e) => setProfile(prev => ({ ...prev, grade: e.target.value }))}
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="learning_style">Estilo de Aprendizaje</label>
                            <select
                                id="learning_style"
                                name="learning_style"
                                className="form-control"
                                value={profile.learning_style}
                                onChange={(e) => setProfile(prev => ({ ...prev, learning_style: e.target.value }))}
                            >
                                {LEARNING_STYLE_OPTIONS.map(option => (
                                    <option key={option.value} value={option.value} disabled={option.value === ''} hidden={option.value === ''}>{option.label}</option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group">
                            <label htmlFor="study_habits">Hábitos de Estudio</label>
                            <input
                                id="study_habits"
                                type="text"
                                className="form-control"
                                value={profile.study_habits}
                                onChange={(e) => setProfile(prev => ({ ...prev, study_habits: e.target.value }))}
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="language_preference">Idioma Preferido</label>
                            <select
                                id="language_preference"
                                name="language_preference"
                                className="form-control"
                                value={profile.language_preference}
                                onChange={(e) => setProfile(prev => ({ ...prev, language_preference: e.target.value }))}
                            >
                                {LANGUAGE_OPTIONS.map(option => (
                                    <option key={option.value} value={option.value} disabled={option.value === ''} hidden={option.value === ''}>{option.label}</option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group checkbox-group">
                            <label>
                                <input
                                    type="checkbox"
                                    checked={profile.extra_support}
                                    onChange={(e) => setProfile(prev => ({ ...prev, extra_support: e.target.checked }))}
                                    style={{ marginRight: '0.5rem' }}
                                />
                                Recibo apoyo adicional fuera del aula
                            </label>
                        </div>
                        <div className="form-group">
                            <label htmlFor="access_to_devices">Acceso a dispositivos</label>
                            <select
                                id="access_to_devices"
                                name="access_to_devices"
                                className="form-control"
                                value={profile.access_to_devices}
                                onChange={(e) => setProfile(prev => ({ ...prev, access_to_devices: e.target.value }))}
                            >
                                {DEVICE_ACCESS_OPTIONS.map(option => (
                                    <option key={option.value} value={option.value} disabled={option.value === ''} hidden={option.value === ''}>{option.label}</option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group">
                            <label htmlFor="student_type">Tipo de Estudiante</label>
                            <select
                                id="student_type"
                                name="student_type"
                                className="form-control"
                                value={profile.student_type}
                                onChange={(e) => setProfile(prev => ({ ...prev, student_type: e.target.value }))}
                            >
                                {STUDENT_TYPE_OPTIONS.map(option => (
                                    <option key={option.value} value={option.value} disabled={option.value === ''} hidden={option.value === ''}>{option.label}</option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group">
                            <label htmlFor="special_education_needs">Necesidades Educativas Especiales</label>
                            <textarea
                                id="special_education_needs"
                                className="form-control"
                                value={profile.special_education_needs}
                                onChange={(e) => setProfile(prev => ({ ...prev, special_education_needs: e.target.value }))}
                                rows={3}
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="learning_goals">Objetivos de Aprendizaje</label>
                            <textarea
                                id="learning_goals"
                                className="form-control"
                                value={profile.learning_goals}
                                onChange={(e) => setProfile(prev => ({ ...prev, learning_goals: e.target.value }))}
                                rows={3}
                            />
                        </div>
                        <button type="submit" className="btn-save-profile" disabled={submittingProfile} style={{ marginTop: '12px' }}>
                            {submittingProfile ? 'Guardando...' : 'Guardar Perfil Educativo'}
                        </button>
                    </form>
                </div>

                {/* 2. Seguridad */}
                <div className="perfil-card">
                    <h3>🔒 Seguridad</h3>
                    {passwordStatus && (
                        <div className={`status-alert ${passwordStatus.type}`}>
                            {passwordStatus.text}
                        </div>
                    )}
                    <form onSubmit={handlePasswordSubmit}>
                        <div className="form-group">
                            <label htmlFor="current-pass">Contraseña Actual</label>
                            <input
                                id="current-pass"
                                type="password"
                                className="form-control"
                                value={passwordData.password}
                                onChange={(e) => setPasswordData(prev => ({ ...prev, password: e.target.value }))}
                                required={passwordData.new_password.length > 0}
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="new-pass">Nueva Contraseña</label>
                            <input
                                id="new-pass"
                                type="password"
                                className="form-control"
                                value={passwordData.new_password}
                                onChange={(e) => setPasswordData(prev => ({ ...prev, new_password: e.target.value }))}
                                required={passwordData.password.length > 0}
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="confirm-pass">Confirmar Nueva Contraseña</label>
                            <input
                                id="confirm-pass"
                                type="password"
                                className="form-control"
                                value={passwordData.confirm_password}
                                onChange={(e) => setPasswordData(prev => ({ ...prev, confirm_password: e.target.value }))}
                                required={passwordData.new_password.length > 0}
                            />
                        </div>
                        <button type="submit" className="btn-save-profile" disabled={submittingPassword}>
                            {submittingPassword ? 'Guardando...' : 'Cambiar Contraseña'}
                        </button>
                    </form>
                </div>

                {/* 3. Personalización */}
                <div className="perfil-card">
                    <h3>🎨 Apariencia Visual</h3>
                    
                    <div className="form-group">
                        <label>Avatar Actual</label>
                        <div className="avatar-current-row">
                            {avatarUrl ? (
                                <img src={avatarUrl} alt="Avatar actual" className="current-avatar" />
                            ) : (
                                <div className="current-avatar placeholder">{profile.full_name ? profile.full_name[0].toUpperCase() : 'U'}</div>
                            )}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <button type="button" className="btn-save-profile" style={{ width: 'auto', padding: '10px 14px' }} onClick={() => setAvatarModalOpen(true)}>
                                    Escoger avatar
                                </button>
                                {avatarUrl && (
                                    <button type="button" className="btn-save-profile" style={{ width: 'auto', padding: '10px 14px', background: 'rgba(255,255,255,0.08)', color: 'var(--text-main)', border: '1px solid var(--glass-border)' }} onClick={async () => {
                                        await handleAvatarSave(null);
                                    }}>
                                        Quitar avatar
                                    </button>
                                )}
                            </div>
                        </div>
                        <div style={{ marginTop: '8px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                            Doble clic en el avatar seleccionado para guardarlo inmediatamente.
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Tema de Color</label>
                        <div className="theme-selector-grid">
                            {Object.entries(THEMES).map(([key, value]) => (
                                <button
                                    key={key}
                                    type="button"
                                    className={`theme-option-btn ${theme === key ? 'active' : ''}`}
                                    onClick={() => setTheme(key)}
                                >
                                    <div className={`theme-dot ${key}`}></div>
                                    {value.name}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="range-slider-container">
                        <label>
                            <span>Efecto Glassmorphism (Resplandor)</span>
                            <span>{glassGlow}px</span>
                        </label>
                        <input
                            type="range"
                            min="0"
                            max="24"
                            className="range-slider"
                            value={glassGlow}
                            onChange={(e) => setGlassGlow(parseInt(e.target.value))}
                        />
                    </div>

                    <div className="range-slider-container">
                        <label>
                            <span>Opacidad del Fondo Glass</span>
                            <span>{Math.round(glassOpacity * 100)}%</span>
                        </label>
                        <input
                            type="range"
                            min="0.1"
                            max="0.95"
                            step="0.05"
                            className="range-slider"
                            value={glassOpacity}
                            onChange={(e) => setGlassOpacity(parseFloat(e.target.value))}
                        />
                    </div>

                    <div 
                        className="glass-preview-box" 
                        role="button" 
                        tabIndex={0}
                        onClick={() => setModalOpen(true)}
                        onKeyDown={(e) => { if (e.key === 'Enter') setModalOpen(true); }}
                        title="Abrir vista previa ampliada"
                    >
                        <div style={{ fontWeight: 700 }}>Vista previa de Glassmorphism ✨</div>
                        <div className="preview-tooltip">Resplandor: {glassGlow}px • Opacidad: {Math.round(glassOpacity * 100)}% — haz clic para ampliar</div>
                    </div>

                    {avatarModalOpen && (
                        <div className="modal-overlay" onClick={() => setAvatarModalOpen(false)}>
                            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                                <div className="modal-header">
                                    <h3>Selecciona tu avatar</h3>
                                    <button className="modal-close" onClick={() => setAvatarModalOpen(false)}>×</button>
                                </div>
                                <div className="modal-body">
                                    <p style={{ color: 'var(--text-muted)', marginBottom: '16px' }}>Elige un personaje para tu perfil. Se guardará automáticamente cuando confirmes.</p>
                                    <div className="avatar-picker-grid">
                                        {AVATAR_OPTIONS.map(({ style, label }, index) => {
                                            const seed = `${label}-${index}`;
                                            const url = getAvatarUrl(style, seed);
                                            return (
                                                <button
                                                    key={`${style}-${label}-${index}`}
                                                    type="button"
                                                    className={`avatar-option ${avatarUrl === url ? 'selected' : ''}`}
                                                    onClick={() => setAvatarUrl(url)}
                                                    onDoubleClick={async () => {
                                                        await handleAvatarSave(url);
                                                        setAvatarModalOpen(false);
                                                    }}
                                                >
                                                    <img src={url} alt={label} />
                                                    <span>{label}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                    <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
                                        <button className="btn-save-profile" onClick={async () => {
                                            setAvatarModalOpen(false);
                                            await handleAvatarSave();
                                        }}>
                                            Guardar avatar
                                        </button>
                                        <button className="btn-save-profile" style={{ background: 'var(--border-subtle)' }} onClick={() => setAvatarModalOpen(false)}>
                                            Cerrar
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {modalOpen && (
                        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
                            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                                <div className="modal-header">
                                    <h3>Vista previa ampliada</h3>
                                    <button className="modal-close" onClick={() => setModalOpen(false)}>×</button>
                                </div>
                                <div className="modal-body">
                                    <div className="glass-preview-box large">
                                        <div className="example-cards">
                                            <div className="example-card">Ejemplo 1</div>
                                            <div className="example-card">Ejemplo 2</div>
                                            <div className="example-card">Ejemplo 3</div>
                                        </div>
                                    </div>
                                    <div style={{ marginTop: 12 }}>
                                        <label style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontWeight: 700 }}>
                                            <span>Resplandor: {glassGlow}px</span>
                                            <span>Opacidad: {Math.round(glassOpacity * 100)}%</span>
                                        </label>
                                        <input
                                            type="range"
                                            min="0"
                                            max="24"
                                            className="range-slider"
                                            value={glassGlow}
                                            onChange={(e) => setGlassGlow(parseInt(e.target.value))}
                                        />
                                        <input
                                            type="range"
                                            min="0.1"
                                            max="0.95"
                                            step="0.05"
                                            className="range-slider"
                                            value={glassOpacity}
                                            onChange={(e) => setGlassOpacity(parseFloat(e.target.value))}
                                        />
                                        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                                            <button className="btn-save-profile" onClick={() => { saveThemeConfiguration(); setModalOpen(false); }}>
                                                Guardar y Cerrar
                                            </button>
                                            <button className="btn-save-profile" style={{ background: 'var(--border-subtle)' }} onClick={() => setModalOpen(false)}>
                                                Cerrar
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <button 
                        type="button" 
                        className="btn-save-profile" 
                        style={{ marginTop: '20px', background: 'var(--accent)', boxShadow: '0 4px 12px rgba(236, 72, 153, 0.4)' }}
                        onClick={saveThemeConfiguration}
                    >
                        Guardar Apariencia
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Perfil;
