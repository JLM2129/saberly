from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status

from apps.preguntas.models import Area, Pregunta, OpcionRespuesta, ProgresoDebilidad
from apps.simulacros.models import Simulacro, DetalleSimulacro
from apps.estadisticas.services.analytics_service import (
    calcular_proyeccion_icfes,
    calcular_semaforo_riesgo,
    analizar_fatiga_cognitiva
)

User = get_user_model()


class AnalyticsAndMultiTenantTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.area_math = Area.objects.create(nombre="Matemáticas", descripcion="Área de Matemáticas")
        self.area_lectura = Area.objects.create(nombre="Lectura Crítica", descripcion="Área de Lectura")

        # Docentes de colegios distintos
        self.docente_colegio_a = User.objects.create_user(
            email="docente.a@sanjose.edu.co",
            password="Password123!",
            first_name="Docente A",
            is_teacher=True,
            school="Colegio San José"
        )
        self.docente_colegio_b = User.objects.create_user(
            email="docente.b@horizonte.edu.co",
            password="Password123!",
            first_name="Docente B",
            is_teacher=True,
            school="Colegio Nuevo Horizonte"
        )

        # Admin global de Saberly
        self.admin_saberly = User.objects.create_user(
            email="admin@saberly.co",
            password="Password123!",
            first_name="Admin Global",
            is_content_admin=True,
            is_staff=True
        )

        # Estudiantes
        self.alumno_a1 = User.objects.create_user(
            email="alumno1@sanjose.edu.co",
            password="Password123!",
            first_name="Alumno A1",
            school="Colegio San José",
            grade="11A"
        )
        self.alumno_b1 = User.objects.create_user(
            email="alumno1@horizonte.edu.co",
            password="Password123!",
            first_name="Alumno B1",
            school="Colegio Nuevo Horizonte",
            grade="11B"
        )

        # Preguntas y Opciones
        self.preg1 = Pregunta.objects.create(
            area=self.area_math,
            enunciado="¿Cuánto es 2 + 2?",
            tipo="seleccion_unica",
            dificultad="facil",
            competencia="interpretar"
        )
        self.opc1_correcta = OpcionRespuesta.objects.create(pregunta=self.preg1, texto="4", es_correcta=True)
        self.opc1_falsa = OpcionRespuesta.objects.create(pregunta=self.preg1, texto="5", es_correcta=False)

        self.preg2 = Pregunta.objects.create(
            area=self.area_lectura,
            enunciado="¿Cuál es la idea principal del texto?",
            tipo="seleccion_unica",
            dificultad="media",
            competencia="argumentar"
        )
        self.opc2_correcta = OpcionRespuesta.objects.create(pregunta=self.preg2, texto="Idea A", es_correcta=True)
        self.opc2_falsa = OpcionRespuesta.objects.create(pregunta=self.preg2, texto="Idea B", es_correcta=False)

        # Simulacro para Alumno A1
        self.sim_a1 = Simulacro.objects.create(usuario=self.alumno_a1, puntaje_total=100.0, completado=True)
        DetalleSimulacro.objects.create(simulacro=self.sim_a1, pregunta=self.preg1, opcion_seleccionada=self.opc1_correcta, es_correcta=True)
        DetalleSimulacro.objects.create(simulacro=self.sim_a1, pregunta=self.preg2, opcion_seleccionada=self.opc2_correcta, es_correcta=True)

        # Simulacro para Alumno B1
        self.sim_b1 = Simulacro.objects.create(usuario=self.alumno_b1, puntaje_total=0.0, completado=True)
        DetalleSimulacro.objects.create(simulacro=self.sim_b1, pregunta=self.preg1, opcion_seleccionada=self.opc1_falsa, es_correcta=False)
        DetalleSimulacro.objects.create(simulacro=self.sim_b1, pregunta=self.preg2, opcion_seleccionada=self.opc2_falsa, es_correcta=False)

    def test_multi_tenant_isolation_teacher_dashboard(self):
        # Docente A consulta su dashboard
        self.client.force_authenticate(user=self.docente_colegio_a)
        res = self.client.get('/api/estadisticas/docente/dashboard-general/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['colegio'], "Colegio San José")
        self.assertEqual(res.data['total_estudiantes_registrados'], 1)
        self.assertEqual(res.data['proyeccion_icfes']['puntaje_global_proyectado'], 500.0)

    def test_multi_tenant_isolation_student_detail_forbidden(self):
        # Docente A intenta consultar la ficha del Alumno B1 (de otro colegio) -> Debe retornar 403
        self.client.force_authenticate(user=self.docente_colegio_a)
        res = self.client.get(f'/api/estadisticas/docente/estudiantes/{self.alumno_b1.id}/')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_multi_tenant_student_detail_allowed_same_school(self):
        # Docente A consulta a Alumno A1 (su colegio) -> Permitido 200 OK
        self.client.force_authenticate(user=self.docente_colegio_a)
        res = self.client.get(f'/api/estadisticas/docente/estudiantes/{self.alumno_a1.id}/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['estudiante']['school'], "Colegio San José")

    def test_saberly_admin_macro_dashboard(self):
        # Admin Global consulta macro analítica
        self.client.force_authenticate(user=self.admin_saberly)
        res = self.client.get('/api/estadisticas/admin/macro-dashboard/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['adopcion_plataforma']['colegios_activos'], 2)
        self.assertEqual(res.data['adopcion_plataforma']['total_estudiantes'], 2)
