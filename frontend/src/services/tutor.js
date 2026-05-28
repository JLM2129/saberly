import api from './api';

export const getDebilidades = async () => {
    const response = await api.get('/tutor/debilidades/');
    return response.data;
};

export const iniciarEntrenamiento = async (debilidad) => {
    const response = await api.post('/tutor/entrenamiento/iniciar/', { debilidad });
    return response.data;
};

export const responderEntrenamiento = async (preguntaIaId, opcionId) => {
    const response = await api.post('/tutor/entrenamiento/responder/', {
        pregunta_ia_id: preguntaIaId,
        opcion_id: opcionId
    });
    return response.data;
};
