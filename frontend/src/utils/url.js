const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001';
const BASE_URL = API_URL.replace('/api', '');

/**
 * Formatea una URL de imagen para asegurar que sea absoluta y apunte al backend si es necesario.
 * @param {string} url - La URL original (puede ser relativa /media/... o absoluta http://...)
 * @returns {string} - La URL final formateada
 */
export const formatImageUrl = (url) => {
    if (!url) return null;
    
    // Si ya es una URL absoluta o base64, no hacer nada
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
        return url;
    }

    // En modo offline, si la ruta empieza por /media, intentamos buscarla en public directamente
    // (Asumiendo que las imágenes se copiaron a public/imagenes o similar sin el prefijo /media)
    const isOffline = localStorage.getItem('preferred_mode') === 'offline';
    
    if (isOffline && url.startsWith('/media/')) {
        return url.replace('/media/', '/');
    }

    // Si la URL es relativa y empieza con /imagenes, le pegamos /media (como espera Django)
    if (url.startsWith('/imagenes/')) {
        return `${BASE_URL}/media${url}`;
    }

    // Si la URL ya incluye /media/, solo pegamos el BASE_URL
    if (url.startsWith('/media/')) {
        return `${BASE_URL}${url}`;
    }

    // Caso por defecto para otras rutas relativas
    if (url.startsWith('/')) {
        return `${BASE_URL}${url}`;
    }
    
    // Caso por si viene sin la barra inicial
    return `${BASE_URL}/${url}`;
};
