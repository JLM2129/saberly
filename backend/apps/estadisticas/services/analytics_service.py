from django.db.models import Avg, Count, Q, F, FloatField, ExpressionWrapper
from django.contrib.auth import get_user_model
from apps.simulacros.models import Simulacro, DetalleSimulacro
from apps.preguntas.models import Area, Pregunta, ProgresoDebilidad

User = get_user_model()

# Pesos oficiales ICFES Saber 11
PESOS_ICFES = {
    'Lectura_Critica': 3,
    'Matematicas': 3,
    'Ciencias_Naturales': 3,
    'Ciencias_Sociales_y_Competencias_Ciudadanas': 3,
    'Ingles': 1
}

def normalizar_nombre_area(nombre_raw):
    """
    Normaliza el nombre del área para vincularlo con los pesos ICFES.
    """
    if not nombre_raw:
        return 'Otras'
    s = nombre_raw.strip().replace(' ', '_')
    if 'Matematica' in s or 'matematica' in s or 'Math' in s:
        return 'Matematicas'
    if 'Lectura' in s or 'lectura' in s or 'Lenguaje' in s:
        return 'Lectura_Critica'
    if 'Naturales' in s or 'naturales' in s or 'Ciencia' in s and 'Social' not in s:
        return 'Ciencias_Naturales'
    if 'Sociales' in s or 'sociales' in s or 'Ciudadana' in s:
        return 'Ciencias_Sociales_y_Competencias_Ciudadanas'
    if 'Ingles' in s or 'ingles' in s or 'English' in s:
        return 'Ingles'
    return s


def calcular_proyeccion_icfes(simulacros_qs):
    """
    Calcula la proyección estimada de puntaje ICFES (0-500 global y 0-100 por área)
    a partir de los detalles de simulacros completados.
    """
    detalles = DetalleSimulacro.objects.filter(simulacro__in=simulacros_qs)
    total_detalles = detalles.count()

    if total_detalles == 0:
        return {
            'puntaje_global_proyectado': 0,
            'probabilidad_beca_excelencia': 0.0,
            'desglose_areas': {}
        }

    areas_db = Area.objects.all()
    desglose_areas = {}
    suma_ponderada = 0
    peso_total_acumulado = 0

    for area in areas_db:
        key_norm = normalizar_nombre_area(area.nombre)
        detalles_area = detalles.filter(pregunta__area=area)
        total_area = detalles_area.count()

        if total_area > 0:
            correctas_area = detalles_area.filter(es_correcta=True).count()
            porcentaje_acierto = round((correctas_area / total_area) * 100.0, 1)
        else:
            porcentaje_acierto = 0.0

        peso = PESOS_ICFES.get(key_norm, 2)
        desglose_areas[area.nombre] = {
            'puntaje_area_100': porcentaje_acierto,
            'preguntas_evaluadas': total_area,
            'peso': peso
        }

        if total_area > 0:
            suma_ponderada += porcentaje_acierto * peso
            peso_total_acumulado += peso

    if peso_total_acumulado > 0:
        # Escala 0 - 500
        puntaje_global = round((suma_ponderada / peso_total_acumulado) * 5.0, 1)
    else:
        puntaje_global = 0.0

    # Estimación de probabilidad de beca (>350 pts en ICFES real)
    if puntaje_global >= 380:
        prob_beca = 95.0
    elif puntaje_global >= 350:
        prob_beca = 80.0
    elif puntaje_global >= 300:
        prob_beca = 45.0
    else:
        prob_beca = max(0.0, round((puntaje_global / 350.0) * 30.0, 1))

    return {
        'puntaje_global_proyectado': puntaje_global,
        'probabilidad_beca_excelencia': prob_beca,
        'desglose_areas': desglose_areas
    }


def calcular_semaforo_riesgo(estudiantes_qs):
    """
    Clasifica a los estudiantes en 3 niveles de riesgo según el promedio
    de sus simulacros completados.
    """
    estudiantes_list = []
    riesgo_alto = 0
    en_desarrollo = 0
    avanzado = 0

    for est in estudiantes_qs:
        sims = Simulacro.objects.filter(usuario=est, completado=True)
        count = sims.count()
        if count > 0:
            prom = sims.aggregate(Avg('puntaje_total'))['puntaje_total__avg'] or 0.0
            prom = round(prom, 1)
        else:
            prom = 0.0

        if count == 0:
            nivel = 'sin_datos'
            color = 'gray'
        elif prom < 50.0:
            nivel = 'alto_riesgo'
            color = 'red'
            riesgo_alto += 1
        elif prom <= 70.0:
            nivel = 'en_desarrollo'
            color = 'yellow'
            en_desarrollo += 1
        else:
            nivel = 'avanzado'
            color = 'green'
            avanzado += 1

        estudiantes_list.append({
            'id': est.id,
            'full_name': est.full_name or est.email.split('@')[0],
            'email': est.email,
            'grade': est.grade,
            'school': est.school,
            'learning_style': est.learning_style or 'No especificado',
            'simulacros_completados': count,
            'promedio_puntaje': prom,
            'nivel_riesgo': nivel,
            'color_riesgo': color
        })

    total_evaluados = riesgo_alto + en_desarrollo + avanzado
    return {
        'resumen_niveles': {
            'alto_riesgo': riesgo_alto,
            'en_desarrollo': en_desarrollo,
            'avanzado': avanzado,
            'total_evaluados': total_evaluados
        },
        'estudiantes': estudiantes_list
    }


def obtener_rendimiento_por_competencia(simulacros_qs):
    """
    Calcula el porcentaje de acierto del grupo agrupado por Competencia pedagógica.
    """
    detalles = DetalleSimulacro.objects.filter(simulacro__in=simulacros_qs)
    competencias = Pregunta.COMPETENCIA_CHOICES
    resultado = {}

    for comp_key, comp_label in competencias:
        detalles_comp = detalles.filter(pregunta__competencia=comp_key)
        total = detalles_comp.count()
        if total > 0:
            correctas = detalles_comp.filter(es_correcta=True).count()
            porcentaje = round((correctas / total) * 100.0, 1)
        else:
            porcentaje = 0.0

        resultado[comp_key] = {
            'nombre': comp_label,
            'porcentaje_acierto': porcentaje,
            'preguntas_evaluadas': total
        }

    return resultado


def analizar_fatiga_cognitiva(simulacros_qs):
    """
    Compara la precisión del grupo en la 1ª mitad vs 2ª mitad de las preguntas
    para detectar pérdida de concentración o fatiga.
    """
    sims = simulacros_qs.filter(completado=True)
    total_sims = sims.count()
    if total_sims == 0:
        return {
            'precision_primera_mitad': 0.0,
            'precision_segunda_mitad': 0.0,
            'caida_rendimiento_porcentaje': 0.0,
            'diagnostico': 'Sin suficientes datos de simulacros.'
        }

    correctas_1ra = 0
    total_1ra = 0
    correctas_2da = 0
    total_2da = 0

    for sim in sims:
        detalles = list(sim.detalles.all().order_by('id'))
        n = len(detalles)
        if n >= 2:
            mitad = n // 2
            det_1ra = detalles[:mitad]
            det_2da = detalles[mitad:]

            total_1ra += len(det_1ra)
            correctas_1ra += sum(1 for d in det_1ra if d.es_correcta)

            total_2da += len(det_2da)
            correctas_2da += sum(1 for d in det_2da if d.es_correcta)

    prec_1ra = round((correctas_1ra / total_1ra) * 100.0, 1) if total_1ra > 0 else 0.0
    prec_2da = round((correctas_2da / total_2da) * 100.0, 1) if total_2da > 0 else 0.0
    caida = round(prec_1ra - prec_2da, 1)

    if caida > 15.0:
        diag = "🔴 Alta fatiga cognitiva detectada. El grupo pierde más del 15% de precisión en el tramo final."
    elif caida > 5.0:
        diag = "🟡 Leve fatiga cognitiva. Se sugiere practicar técnicas de gestión de tiempo y pausa activa."
    else:
        diag = "🟢 Buena resistencia mental. El grupo mantiene la precisión constante a lo largo de la prueba."

    return {
        'precision_primera_mitad': prec_1ra,
        'precision_segunda_mitad': prec_2da,
        'caida_rendimiento_porcentaje': caida,
        'diagnostico': diag
    }


def obtener_mapa_debilidades(estudiantes_qs):
    """
    Retorna el Top 10 de temas/debilidades más críticas del grupo de estudiantes.
    """
    progresos = ProgresoDebilidad.objects.filter(usuario__in=estudiantes_qs)
    debilidades_map = {}

    for p in progresos:
        deb = p.debilidad
        if deb not in debilidades_map:
            debilidades_map[deb] = {
                'debilidad': deb,
                'area_nombre': p.area.nombre if p.area else 'General',
                'estudiantes_afectados': 0,
                'intentos_totales': 0,
                'aciertos_totales': 0
            }
        debilidades_map[deb]['estudiantes_afectados'] += 1
        debilidades_map[deb]['intentos_totales'] += p.intentos_totales
        debilidades_map[deb]['aciertos_totales'] += p.aciertos_totales

    resultado = []
    for deb, item in debilidades_map.items():
        tot = item['intentos_totales']
        prec = round((item['aciertos_totales'] / tot) * 100.0, 1) if tot > 0 else 0.0
        resultado.append({
            'debilidad': item['debilidad'],
            'area_nombre': item['area_nombre'],
            'estudiantes_afectados': item['estudiantes_afectados'],
            'precision_promedio': prec
        })

    # Ordenar por mayor número de estudiantes afectados y menor precisión
    resultado.sort(key=lambda x: (-x['estudiantes_afectados'], x['precision_promedio']))
    return resultado[:10]


def obtener_salud_banco_preguntas():
    """
    Para Administradores Globales de Saberly: Identifica preguntas con posibles anomalías
    (tasa de acierto < 20% o > 95% a nivel nacional).
    """
    preguntas = Pregunta.objects.filter(active=True)
    anomalias = []

    for preg in preguntas:
        detalles = DetalleSimulacro.objects.filter(pregunta=preg)
        total = detalles.count()
        if total >= 5: # Mínimo 5 respuestas para poder evaluar estadísticamente
            correctas = detalles.filter(es_correcta=True).count()
            tasa_acierto = round((correctas / total) * 100.0, 1)

            if tasa_acierto < 20.0 or tasa_acierto > 95.0:
                motivo = "Extremadamente difícil o ambigua" if tasa_acierto < 20.0 else "Demasiado fácil o trivial"
                anomalias.append({
                    'pregunta_id': preg.id,
                    'enunciado': preg.enunciado[:80] + '…',
                    'area': preg.area.nombre if preg.area else 'General',
                    'respuestas_totales': total,
                    'tasa_acierto_porcentaje': tasa_acierto,
                    'motivo': motivo
                })

    anomalias.sort(key=lambda x: x['tasa_acierto_porcentaje'])
    return {
        'total_preguntas_evaluadas': preguntas.count(),
        'total_anomalias_detectadas': len(anomalias),
        'preguntas_anomalas': anomalias[:15]
    }


def obtener_adopcion_global():
    """
    Para Administradores Globales de Saberly: Retorna estadísticas macro de uso nacional.
    """
    total_estudiantes = User.objects.filter(is_teacher=False, is_staff=False, is_superuser=False).count()
    total_docentes = User.objects.filter(is_teacher=True).count()
    colegios_registrados = User.objects.exclude(school='').values('school').distinct().count()
    total_simulacros = Simulacro.objects.filter(completado=True).count()
    
    promedio_nacional = Simulacro.objects.filter(completado=True).aggregate(Avg('puntaje_total'))['puntaje_total__avg'] or 0.0

    return {
        'colegios_activos': colegios_registrados,
        'total_estudiantes': total_estudiantes,
        'total_docentes': total_docentes,
        'total_simulacros_completados': total_simulacros,
        'promedio_nacional_simulacros': round(promedio_nacional, 1)
    }
