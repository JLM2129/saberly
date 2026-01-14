import { OFF_QUESTIONS_DATA } from './questions_data';

// Generar un simulacro localmente
export const generateLocalSimulacro = (tipo = 'general') => {
    let allContexts = [];
    const normalizedTipo = tipo.toLowerCase();

    const isGeneral = normalizedTipo === 'general' || normalizedTipo.includes('%');

    if (isGeneral) {
        // Mezclar contextos de todas las materias
        Object.values(OFF_QUESTIONS_DATA).forEach(materia => {
            allContexts = [...allContexts, ...materia.contextos.map(c => ({ ...c, materia: materia.nombre }))];
        });
    } else {
        // Solo una materia
        // Intentar encontrar la materia por clave exacta o aproximada (sin acentos seria ideal pero busquemos por las claves que definimos)
        const materia = OFF_QUESTIONS_DATA[normalizedTipo];
        if (materia) {
            allContexts = materia.contextos.map(c => ({ ...c, materia: materia.nombre }));
        } else {
            // Fallback: si no se encuentra la materia, usar general
            Object.values(OFF_QUESTIONS_DATA).forEach(materia => {
                allContexts = [...allContexts, ...materia.contextos.map(c => ({ ...c, materia: materia.nombre }))];
            });
        }
    }

    // Seleccionar 15 contextos aleatorios para un simulacro rápido
    const selectedContexts = allContexts.sort(() => 0.5 - Math.random()).slice(0, 15);

    const detalles = [];
    let questionCounter = 1;

    selectedContexts.forEach(ctx => {
        ctx.preguntas.forEach(p => {
            detalles.push({
                id: questionCounter++,
                pregunta: {
                    id: Math.floor(Math.random() * 1000000), // ID falso
                    enunciado: p.enunciado,
                    imagen_url: p.archivo, // En offline buscaremos localmente
                    contexto: {
                        id: Math.floor(Math.random() * 1000000),
                        contenido: ctx.contexto,
                        archivo: ctx.archivo
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

    return {
        id: 'local_' + Date.now(),
        tipo: tipo,
        fecha_creacion: new Date().toISOString(),
        completado: false,
        detalles: detalles.slice(0, 50) // Limitar a 50 preguntas
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
        es_offline: true
    };

    // Guardar en localStorage para persistencia
    const historial = JSON.parse(localStorage.getItem('historial_offline') || '[]');
    historial.push(resultado);
    localStorage.setItem('historial_offline', JSON.stringify(historial));

    return resultado;
};
