const API_URL = import.meta.env.VITE_API_URL;

const getHeaders = () => {
    const token = localStorage.getItem('access_token');
    return {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
    };
};

const api = {
    get: async (endpoint) => {
        const response = await fetch(`${API_URL}${endpoint}`, {
            headers: getHeaders()
        });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        return { data };
    },
    post: async (endpoint, body) => {
        const response = await fetch(`${API_URL}${endpoint}`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(body)
        });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        return { data };
    }
};

export const checkBackendConnection = async () => {
    try {
        const response = await fetch(`${API_URL}/health/`);
        return response.ok;
    } catch (error) {
        console.error("Error conectando con el backend:", error);
        return false;
    }
};

export default api;
