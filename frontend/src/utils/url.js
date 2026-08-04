const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8001/api').replace(/\/$/, '');
const BASE_URL = API_URL.replace('/api', '');

const encodePathSegments = (path) => {
    const segments = Array.isArray(path) ? path : String(path).split('/');
    return segments
        .filter((segment) => segment !== '')
        .map((segment) => encodeURIComponent(segment))
        .join('/');
};

const normalizeLocalPath = (path) => {
    const cleaned = String(path).trim().replace(/\\+/g, '/');
    let clean = cleaned;

    if (clean.startsWith('/media/')) {
        clean = clean.slice(7);
    } else if (clean.startsWith('media/')) {
        clean = clean.slice(6);
    } else if (clean.startsWith('/imagenes/')) {
        clean = clean.slice(10);
    } else if (clean.startsWith('imagenes/')) {
        clean = clean.slice(9);
    } else if (clean.startsWith('/')) {
        clean = clean.slice(1);
    }

    if (!clean.startsWith('imagenes/')) {
        clean = `imagenes/${clean}`;
    }

    return `/${encodePathSegments(clean.split('/'))}`;
};

/**
 * Formatea una URL de imagen para asegurar que sea absoluta y apunte al backend si es necesario.
 * @param {string} url - La URL original (puede ser relativa /media/... o absoluta http://...)
 * @returns {string} - La URL final formateada
 */
export const formatImageUrl = (url) => {
    if (!url) return null;

    const normalized = String(url).trim();

    // Si ya es una URL absoluta o base64, no hacer nada
    if (normalized.startsWith('http://') || normalized.startsWith('https://') || normalized.startsWith('data:')) {
        return normalized;
    }

    const isOffline = localStorage.getItem('preferred_mode') === 'offline';

    if (isOffline) {
        return normalizeLocalPath(normalized);
    }

    const cleaned = normalized.replace(/\\+/g, '/');

    if (cleaned.startsWith('/media/')) {
        return `${BASE_URL}${cleaned}`;
    }

    if (cleaned.startsWith('/imagenes/')) {
        return `${BASE_URL}/media/${encodePathSegments(cleaned.split('/').slice(1))}`;
    }

    if (cleaned.startsWith('imagenes/')) {
        return `${BASE_URL}/media/${encodePathSegments(cleaned.split('/'))}`;
    }

    if (cleaned.startsWith('media/')) {
        return `${BASE_URL}/${encodePathSegments(cleaned.split('/'))}`;
    }

    if (!cleaned.includes('/')) {
        return `${BASE_URL}/media/imagenes/${encodeURIComponent(cleaned)}`;
    }

    return `${BASE_URL}/media/${encodePathSegments(cleaned.split('/'))}`;
};

export const hasValidImageUrl = (url) => {
    if (!url) return false;
    const normalized = String(url).trim();
    if (!normalized) return false;
    if (normalized.startsWith('http://') || normalized.startsWith('https://') || normalized.startsWith('data:')) {
        return true;
    }
    const lower = normalized.toLowerCase();
    return lower.includes('.png') || lower.includes('.jpg') || lower.includes('.jpeg') || lower.includes('.webp') || lower.includes('.gif');
};
