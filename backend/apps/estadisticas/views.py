from rest_framework import views, status, permissions
from rest_framework.response import Response
from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
from django.db.models import Avg

from apps.simulacros.models import Simulacro, DetalleSimulacro
from apps.preguntas.models import Pregunta, Area, OpcionRespuesta, Contexto, ProgresoDebilidad
from .permissions import IsSchoolMember, IsSaberlyAdmin

from .services.analytics_service import (
    calcular_proyeccion_icfes,
    calcular_semaforo_riesgo,
    obtener_rendimiento_por_competencia,
    analizar_fatiga_cognitiva,
    obtener_mapa_debilidades,
    obtener_salud_banco_preguntas,
    obtener_adopcion_global
)

User = get_user_model()


class ResumenEstadisticasView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        usuario = request.user
        qs = Simulacro.objects.filter(usuario=usuario, completado=True)
        
        total_simulacros = qs.count()
        if total_simulacros == 0:
            return Response({
                "total_simulacros": 0,
                "promedio_global": 0,
                "mensaje": "No hay suficientes datos."
            })

        promedio = qs.aggregate(Avg('puntaje_total'))['puntaje_total__avg']

        return Response({
            "total_simulacros": total_simulacros,
            "promedio_global": round(promedio, 2) if promedio else 0,
        })


class DocenteDashboardGeneralView(views.APIView):
    """
    Retorna la analítica avanzada consolidada del colegio del docente autenticado.
    Si el usuario es un Administrador (sin colegio asignado), retorna datos globales.
    """
    permission_classes = [permissions.IsAuthenticated, IsSchoolMember]

    def get(self, request):
        docente = request.user
        colegio_raw = (docente.school or '').strip()

        is_admin = docente.is_staff or docente.is_superuser or docente.is_content_admin

        # Si no tiene colegio asignado o es admin, consultar todos los estudiantes
        if not colegio_raw or (is_admin and not colegio_raw):
            colegio_nombre = colegio_raw or "Todas las Instituciones (Vista General)"
            estudiantes_qs = User.objects.filter(
                is_teacher=False,
                is_staff=False,
                is_superuser=False
            )
        else:
            colegio_nombre = colegio_raw
            estudiantes_qs = User.objects.filter(
                school__iexact=colegio_raw,
                is_teacher=False,
                is_staff=False,
                is_superuser=False
            )

        grade_filter = request.query_params.get('grade')
        if grade_filter:
            estudiantes_qs = estudiantes_qs.filter(grade__iexact=grade_filter.strip())

        simulacros_qs = Simulacro.objects.filter(
            usuario__in=estudiantes_qs,
            completado=True
        )

        proyeccion = calcular_proyeccion_icfes(simulacros_qs)
        semaforo = calcular_semaforo_riesgo(estudiantes_qs)
        competencias = obtener_rendimiento_por_competencia(simulacros_qs)
        fatiga = analizar_fatiga_cognitiva(simulacros_qs)
        debilidades = obtener_mapa_debilidades(estudiantes_qs)

        # Grados disponibles
        if colegio_raw:
            grados_qs = User.objects.filter(school__iexact=colegio_raw)
        else:
            grados_qs = User.objects.all()

        grados_disponibles = list(
            grados_qs.exclude(grade='')
            .values_list('grade', flat=True)
            .distinct()
        )

        return Response({
            'colegio': colegio_nombre,
            'grado_filtrado': grade_filter or 'Todos',
            'grados_disponibles': grados_disponibles,
            'total_estudiantes_registrados': estudiantes_qs.count(),
            'total_simulacros_completados': simulacros_qs.count(),
            'proyeccion_icfes': proyeccion,
            'semaforo_riesgo': semaforo['resumen_niveles'],
            'competencias': competencias,
            'fatiga_cognitiva': fatiga,
            'top_debilidades': debilidades
        })


class DocenteDebilidadesGrupalesView(views.APIView):
    """
    Retorna el mapa de calor de debilidades críticas del colegio.
    """
    permission_classes = [permissions.IsAuthenticated, IsSchoolMember]

    def get(self, request):
        colegio_raw = (request.user.school or '').strip()
        is_admin = request.user.is_staff or request.user.is_superuser or request.user.is_content_admin

        if not colegio_raw or is_admin:
            estudiantes_qs = User.objects.filter(is_teacher=False, is_staff=False)
            colegio_nombre = colegio_raw or "Todas las Instituciones"
        else:
            estudiantes_qs = User.objects.filter(school__iexact=colegio_raw, is_teacher=False, is_staff=False)
            colegio_nombre = colegio_raw

        grade_filter = request.query_params.get('grade')
        if grade_filter:
            estudiantes_qs = estudiantes_qs.filter(grade__iexact=grade_filter.strip())

        debilidades = obtener_mapa_debilidades(estudiantes_qs)
        return Response({
            'colegio': colegio_nombre,
            'top_debilidades': debilidades
        })


class DocenteEstudiantesListView(views.APIView):
    """
    Retorna el listado de estudiantes del colegio del docente con su nivel de riesgo y promedio.
    """
    permission_classes = [permissions.IsAuthenticated, IsSchoolMember]

    def get(self, request):
        colegio_raw = (request.user.school or '').strip()
        is_admin = request.user.is_staff or request.user.is_superuser or request.user.is_content_admin

        if not colegio_raw or is_admin:
            estudiantes_qs = User.objects.filter(is_teacher=False, is_staff=False, is_superuser=False)
        else:
            estudiantes_qs = User.objects.filter(school__iexact=colegio_raw, is_teacher=False, is_staff=False)

        grade_filter = request.query_params.get('grade')
        if grade_filter:
            estudiantes_qs = estudiantes_qs.filter(grade__iexact=grade_filter.strip())

        resultado = calcular_semaforo_riesgo(estudiantes_qs)
        return Response(resultado)


class DocenteEstudianteDetalleView(views.APIView):
    """
    Ficha 360° individual de un estudiante.
    Verifica aislamiendo salvo si el solicitante es un Administrador de plataforma.
    """
    permission_classes = [permissions.IsAuthenticated, IsSchoolMember]

    def get(self, request, student_id):
        docente_colegio = (request.user.school or '').strip()
        is_admin = request.user.is_staff or request.user.is_superuser or request.user.is_content_admin

        estudiante = get_object_or_404(User, id=student_id)

        # Si no es admin y tiene colegio, verificar coincidencia estricta
        if not is_admin and docente_colegio:
            if not estudiante.school or estudiante.school.strip().lower() != docente_colegio.lower():
                return Response(
                    {"error": "No tienes permiso para acceder a la información de estudiantes de otras instituciones."},
                    status=status.HTTP_403_FORBIDDEN
                )

        simulacros_qs = Simulacro.objects.filter(usuario=estudiante, completado=True).order_by('fecha_fin')
        proyeccion = calcular_proyeccion_icfes(simulacros_qs)
        competencias = obtener_rendimiento_por_competencia(simulacros_qs)
        fatiga = analizar_fatiga_cognitiva(simulacros_qs)

        historial_simulacros = []
        for sim in simulacros_qs:
            historial_simulacros.append({
                'id': sim.id,
                'fecha': sim.fecha_fin.strftime('%Y-%m-%d %H:%M') if sim.fecha_fin else '',
                'puntaje_total': round(sim.puntaje_total, 1),
                'tiempo_usado_minutos': round(sim.tiempo_usado_segundos / 60.0, 1)
            })

        progresos_debilidades = ProgresoDebilidad.objects.filter(usuario=estudiante)
        debilidades_list = []
        for p in progresos_debilidades:
            debilidades_list.append({
                'debilidad': p.debilidad,
                'area': p.area.nombre if p.area else 'General',
                'precision': round(p.calcular_precision(), 1),
                'nivel_actual': p.nivel_actual,
                'intentos': p.intentos_totales
            })

        return Response({
            'estudiante': {
                'id': estudiante.id,
                'full_name': estudiante.full_name or estudiante.email.split('@')[0],
                'email': estudiante.email,
                'school': estudiante.school or 'No asignada',
                'grade': estudiante.grade or '—',
                'learning_style': estudiante.learning_style or 'No especificado',
                'student_type': estudiante.student_type or 'Regular',
                'access_to_devices': estudiante.access_to_devices or 'No especificado',
                'extra_support': estudiante.extra_support,
                'special_education_needs': estudiante.special_education_needs or 'Ninguna'
            },
            'proyeccion_icfes': proyeccion,
            'competencias_radar': competencias,
            'fatiga_cognitiva': fatiga,
            'historial_simulacros': historial_simulacros,
            'debilidades_individuales': debilidades_list
        })


class DocenteGenerarTallerRefuerzoView(views.APIView):
    """
    Genera una propuesta de taller de refuerzo en formato JSON listo para ser impreso o exportado.
    """
    permission_classes = [permissions.IsAuthenticated, IsSchoolMember]

    def post(self, request):
        colegio_raw = (request.user.school or '').strip()
        is_admin = request.user.is_staff or request.user.is_superuser or request.user.is_content_admin

        if not colegio_raw or is_admin:
            estudiantes_qs = User.objects.filter(is_teacher=False, is_staff=False)
            colegio_nombre = colegio_raw or "General"
        else:
            estudiantes_qs = User.objects.filter(school__iexact=colegio_raw, is_teacher=False, is_staff=False)
            colegio_nombre = colegio_raw

        grade_filter = request.data.get('grade')
        if grade_filter:
            estudiantes_qs = estudiantes_qs.filter(grade__iexact=grade_filter.strip())

        debilidades = obtener_mapa_debilidades(estudiantes_qs)
        temas_objetivo = [d['debilidad'] for d in debilidades[:3]] if debilidades else ["General"]
        
        preguntas_taller = Pregunta.objects.filter(active=True).order_by('?')[:10]

        preguntas_data = []
        for p in preguntas_taller:
            preguntas_data.append({
                'id': p.id,
                'enunciado': p.enunciado,
                'area': p.area.nombre if p.area else 'General',
                'tipo': p.tipo,
                'dificultad': p.dificultad,
                'opciones': [{'texto': op.texto, 'es_correcta': op.es_correcta} for op in p.opciones.all()]
            })

        return Response({
            'titulo_taller': f"Taller de Nivelación - {colegio_nombre}",
            'grado_destinado': grade_filter or "General",
            'temas_reforzados': temas_objetivo,
            'total_preguntas': len(preguntas_data),
            'preguntas': preguntas_data
        })


# ==============================================================================
# ENDPOINTS PARA ADMINISTRADORES GLOBALES DE SABERLY (SUPERADMIN / CONTENT ADMIN)
# ==============================================================================

class AdminMacroDashboardView(views.APIView):
    permission_classes = [permissions.IsAuthenticated, IsSaberlyAdmin]

    def get(self, request):
        adopcion = obtener_adopcion_global()
        salud_preguntas = obtener_salud_banco_preguntas()

        return Response({
            'adopcion_plataforma': adopcion,
            'salud_banco_preguntas': salud_preguntas
        })


class AdminSaludPreguntasView(views.APIView):
    permission_classes = [permissions.IsAuthenticated, IsSaberlyAdmin]

    def get(self, request):
        salud = obtener_salud_banco_preguntas()
        return Response(salud)


class AdminAdopcionColegiosView(views.APIView):
    permission_classes = [permissions.IsAuthenticated, IsSaberlyAdmin]

    def get(self, request):
        colegios = User.objects.exclude(school='').values('school').annotate(
            total_estudiantes=Count('id', filter=Q(is_teacher=False, is_staff=False)),
            total_docentes=Count('id', filter=Q(is_teacher=True))
        ).order_by('-total_estudiantes')

        return Response({
            'total_colegios': len(colegios),
            'colegios': list(colegios)
        })
