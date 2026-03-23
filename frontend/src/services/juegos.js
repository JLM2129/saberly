import api from './api';

const juegosService = {
    getQuickQuestions: async () => {
        const response = await api.get('/juegos/quick-questions/');
        return response.data;
    },

    getMillionaireQuestions: async () => {
        const response = await api.get('/juegos/millionaire-questions/');
        return response.data;
    },

    getStreakQuestions: async () => {
        const response = await api.get('/juegos/streak-questions/');
        return response.data;
    },

    guardarPartida: async (datos) => {
        const response = await api.post('/juegos/guardar-partida/', datos);
        return response.data;
    },

    getHighScores: async () => {
        const response = await api.get('/juegos/high-scores/');
        return response.data;
    },

    getMisPartidas: async () => {
        const response = await api.get('/juegos/mis-partidas/');
        return response.data;
    },

    // Multiplayer
    crearSala: async (config) => {
        const response = await api.post('/juegos/salas/crear/', config);
        return response.data;
    },
    unirseSala: async (codigo) => {
        const response = await api.post('/juegos/salas/unirse/', { codigo });
        return response.data;
    },
    getSalaStatus: async (codigo) => {
        const response = await api.get(`/juegos/salas/${codigo}/status/`);
        return response.data;
    },
    iniciarJuegoSala: async (codigo) => {
        const response = await api.post(`/juegos/salas/${codigo}/iniciar/`);
        return response.data;
    },
    responderMulti: async (codigo, es_correcta) => {
        const response = await api.post(`/juegos/salas/${codigo}/responder/`, { es_correcta });
        return response.data;
    }
};

export default juegosService;
