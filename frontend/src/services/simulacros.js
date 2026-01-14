const API_URL = import.meta.env.VITE_API_URL;

const getHeaders = () => {
    const token = localStorage.getItem('access_token');
    return {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
    };
};

export const getSimulacros = async () => {
    const response = await fetch(`${API_URL}/simulacros/historial/`, {
        headers: getHeaders()
    });

    if (response.status === 401) {
        throw new Error('No autorizado');
    }

    return await response.json();
};

export const createSimulacro = async (tipo = 'general') => {
    const response = await fetch(`${API_URL}/simulacros/generar/`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ tipo })
    });

    if (response.status === 401) throw new Error('No autorizado');

    if (!response.ok) throw new Error('Error creando simulacro');
    return await response.json();
};

export const getSimulacroById = async (id) => {
    const response = await fetch(`${API_URL}/simulacros/historial/${id}/`, {
        headers: getHeaders()
    });

    if (response.status === 401) throw new Error('No autorizado');

    if (!response.ok) throw new Error('Error obteniendo simulacro');
    return await response.json();
};

export const submitSimulacro = async (id, respuestas, tiempoSegundos) => {
    const response = await fetch(`${API_URL}/simulacros/${id}/finalizar/`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
            respuestas, // array [ { pregunta_id: 1, opcion_id: 10 } ]
            tiempo_segundos: tiempoSegundos
        })
    });

    if (response.status === 401) throw new Error('No autorizado');

    if (!response.ok) throw new Error('Error enviando respuestas');
    return await response.json();
};
