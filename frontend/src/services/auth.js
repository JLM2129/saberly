const API_URL = import.meta.env.VITE_API_URL;

export const login = async (email, password) => {
    const response = await fetch(`${API_URL}/users/login/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Error en el inicio de sesión');
    }

    const data = await response.json();
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
        const errorData = await response.json();
        // Mejor manejo de errores para mostrar detalles del formulario
        throw errorData;
    }

    return await response.json();
};

export const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
};

export const isAuthenticated = () => {
    return !!localStorage.getItem('access_token');
};
