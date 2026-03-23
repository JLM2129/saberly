import { OFF_QUESTIONS_DATA } from './questions_data';

// Generar un simulacro localmente
export const generateLocalSimulacro = (tipo = '20%') => {
    const normalizedTipo = tipo.toUpperCase();

    // Mapeo de porcentajes al total de 278 preguntas (Mismo que en Backend)
    const TOTAL_BASE = 278;
    const mapping = {
        '100%': TOTAL_BASE,
        '80%': Math.floor(TOTAL_BASE * 0.8),
        '60%': Math.floor(TOTAL_BASE * 0.6),
        '40%': Math.floor(TOTAL_BASE * 0.4),
        '20%': Math.floor(TOTAL_BASE * 0.2),
    };

    let totalPreguntasTarget = mapping[normalizedTipo] || mapping['20%'];

    // Si no es un tipo de porcentaje, podria ser una materia especifica
    const isSubjectSpecific = !mapping[normalizedTipo];

    let areasToUse = [];
    if (isSubjectSpecific) {
        // Buscar materia especifica
        const subjectKey = tipo.toLowerCase().replace(' ', '_');
        const materia = OFF_QUESTIONS_DATA[subjectKey];
        if (materia) {
            areasToUse = [materia];
            // Para materias especificas, cargamos todas sus preguntas o un tope razonable
            totalPreguntasTarget = 100; // O el total de la materia si es menor
        } else {
            // Fallback a general
            areasToUse = Object.values(OFF_QUESTIONS_DATA);
        }
    } else {
        areasToUse = Object.values(OFF_QUESTIONS_DATA);
    }

    const numAreas = areasToUse.length;
    if (numAreas === 0) return null;

    const preguntasPorArea = Math.floor(totalPreguntasTarget / numAreas);
    let restante = totalPreguntasTarget % numAreas;

    const detalles = [];
    let questionCounter = 1;

    areasToUse.forEach((area, index) => {
        const cantidadATomar = preguntasPorArea + (index === 0 ? restante : 0);

        // Obtener todas las preguntas del area (aplanar contextos)
        let poolPreguntas = [];
        area.contextos.forEach(ctx => {
            ctx.preguntas.forEach(p => {
                poolPreguntas.push({
                    ...p,
                    contexto_obj: {
                        contenido: ctx.contexto,
                        archivo: ctx.archivo
                    }
                });
            });
        });

        // Mezclar usando Fisher-Yates para asegurar verdadera aleatoriedad
        const shuffleArray = (array) => {
            const arr = [...array];
            for (let i = arr.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [arr[i], arr[j]] = [arr[j], arr[i]];
            }
            return arr;
        };

        const mezcladas = shuffleArray(poolPreguntas);
        const seleccionadas = mezcladas.slice(0, cantidadATomar);

        seleccionadas.forEach(p => {
            detalles.push({
                id: questionCounter++,
                pregunta: {
                    id: Math.floor(Math.random() * 1000000),
                    enunciado: p.enunciado,
                    imagen_url: p.archivo,
                    contexto: {
                        id: Math.floor(Math.random() * 1000000),
                        contenido: p.contexto_obj.contenido,
                        archivo: p.contexto_obj.archivo
                    },
                    opciones: p.opciones.map((o, idx) => ({
                        id: idx + 1,
                        texto: o.texto,
                        es_correcta: o.es_correcta
                    }))
                },
                respuesta_usuario: null
            });
        });
    });

    // Barajar el resultado final para mezclar las áreas
    const shuffleArray = (array) => {
        const arr = [...array];
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    };
    const detallesFinales = shuffleArray(detalles);

    return {
        id: 'local_' + Date.now(),
        tipo: tipo,
        fecha_creacion: new Date().toISOString(),
        completado: false,
        detalles: detallesFinales
    };
};

// Calificar un simulacro local
export const submitLocalSimulacro = (simulacro, respuestas) => {
    let correctasCount = 0;
    const total = simulacro.detalles.length;

    const detallesActualizados = simulacro.detalles.map(detalle => {
        const pId = detalle.pregunta.id;
        const respId = respuestas[pId];
        const opcionCorrecta = detalle.pregunta.opciones.find(o => o.es_correcta);
        const esCorrecta = respId === opcionCorrecta?.id;

        if (esCorrecta) correctasCount++;

        return {
            ...detalle,
            opcion_seleccionada: respId,
            es_correcta: esCorrecta
        };
    });

    const resultado = {
        ...simulacro,
        detalles: detallesActualizados,
        completado: true,
        fecha_finalizacion: new Date().toISOString(),
        puntaje: Math.round((correctasCount / total) * 100),
        correctas: correctasCount,
        total,
        es_offline: true,
        sincronizado: false, // Nuevo: para saber si está en el servidor
        usuario_email: localStorage.getItem('user_email') // Guardamos quién lo hizo
    };

    // Guardar en localStorage para persistencia
    const historial = JSON.parse(localStorage.getItem('historial_offline') || '[]');
    historial.push(resultado);
    localStorage.setItem('historial_offline', JSON.stringify(historial));

    return resultado;
};

// Función para sincronizar pendientes
export const syncOfflineResults = async () => {
    const historial = JSON.parse(localStorage.getItem('historial_offline') || '[]');
    const pendientes = historial.filter(r => !r.sincronizado);

    if (pendientes.length === 0) return;

    for (const resultado of pendientes) {
        try {
            // Aquí llamarías a un nuevo endpoint en el backend que acepte simulacros completos
            // Por ahora simularemos la lógica de envío
            const response = await fetch(`${import.meta.env.VITE_API_URL}/simulacros/sincronizar_offline/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`
                },
                body: JSON.stringify(resultado)
            });

            if (response.ok) {
                resultado.sincronizado = true;
            }
        } catch (error) {
            console.error('Error sincronizando:', error);
            break; // Si falla uno (ej. sigue sin internet real), paramos
        }
    }

    localStorage.setItem('historial_offline', JSON.stringify(historial));
};
