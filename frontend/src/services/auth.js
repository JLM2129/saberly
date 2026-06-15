const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001/api';

export const login = async (email, password) => {
    const response = await fetch(`${API_URL}/users/login/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
        let errorText = 'Error en el inicio de sesión';
        try {
            const errorData = await response.json();
            errorText = errorData.detail || JSON.stringify(errorData) || errorText;
        } catch (err) {
            try { errorText = await response.text(); } catch (e) { /* ignore */ }
        }
        throw new Error(errorText);
    }

    let data;
    try {
        data = await response.json();
    } catch (err) {
        throw new Error('Respuesta inválida del servidor');
    }
    localStorage.setItem('access_token', data.access);
    localStorage.setItem('refresh_token', data.refresh);
    return data;
};

export const register = async (userData) => {
    // userData debe incluir: email, password, first_name, last_name
    const response = await fetch(`${API_URL}/users/register/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
    });

    if (!response.ok) {
        try {
            const errorData = await response.json();
            throw errorData;
        } catch (err) {
            const txt = await response.text().catch(() => 'Error desconocido');
            throw { detail: txt };
        }
    }

    try {
        return await response.json();
    } catch (err) {
        throw { detail: 'Respuesta inválida del servidor' };
    }
};

export const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
};

export const isAuthenticated = () => {
    return !!localStorage.getItem('access_token');
};
