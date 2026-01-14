import api from './api';

const juegosService = {
    getQuickQuestions: async () => {
        const response = await api.get('/juegos/quick-questions/');
        return response.data;
    },

    guardarPartida: async (datos) => {
        const response = await api.post('/juegos/guardar-partida/', datos);
        return response.data;
    },

    getHighScores: async () => {
        const response = await api.get('/juegos/high-scores/');
        return response.data;
    }
};

export default juegosService;
