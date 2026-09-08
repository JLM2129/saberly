import api from './api';

export const getDebilidades = async () => {
    const response = await api.get('/tutor/debilidades/');
    return response.data;
};

export const iniciarEntrenamiento = async (debilidad, sesionId = null) => {
    const response = await api.post('/tutor/entrenamiento/iniciar/', {
        debilidad,
        ...(sesionId ? { sesion_id: sesionId } : {})
    });
    return response.data;
};

export const responderEntrenamiento = async (preguntaIaId, opcionId, sesionId, metadata = {}) => {
    const response = await api.post('/tutor/entrenamiento/responder/', {
        pregunta_ia_id: preguntaIaId,
        opcion_id: opcionId,
        sesion_id: sesionId,
        ...metadata
    });
    return response.data;
};
