"""
Regresión: una pregunta creada por el panel docente debe poder verse.

Antes de este arreglo, `subarea` quedaba en NULL en todo lo que creaban el panel
y el importador masivo, y el banco filtraba por `subarea__area_id`, así que las
preguntas nuevas eran invisibles al filtrar por área. El endpoint docente,
además, ignoraba `area_id` y devolvía el banco entero sin paginar.
"""
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.preguntas.models import Area, Pregunta, OpcionRespuesta

User = get_user_model()


class VisibilidadPreguntaNuevaTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.area = Area.objects.create(nombre="Matemáticas")
        self.otra_area = Area.objects.create(nombre="Lectura Crítica")
        self.teacher = User.objects.create_user(
            email="docente@test.co", password="clave-de-prueba", is_teacher=True
        )
        self.client.force_authenticate(user=self.teacher)

    def _crear_pregunta(self, enunciado, area=None):
        payload = {
            "area": (area or self.area).id,
            "enunciado": enunciado,
            "tipo": "seleccion_unica",
            "dificultad": "media",
            "competencia": "interpretar",
            "opciones": [
                {"texto": "Correcta", "es_correcta": True},
                {"texto": "Incorrecta", "es_correcta": False},
            ],
        }
        return self.client.post('/api/preguntas/teacher/', payload, format='json')

    def test_pregunta_nueva_aparece_en_el_banco_filtrado_por_area(self):
        """El banco filtra por el área propia de la pregunta, no por su subárea."""
        resp = self._crear_pregunta("¿Cuánto es 2 + 2?")
        self.assertEqual(resp.status_code, 201)
        nueva_id = resp.data['id']

        self.assertIsNone(Pregunta.objects.get(pk=nueva_id).subarea)

        r = self.client.get(f'/api/preguntas/banco/?area_id={self.area.id}')
        self.assertEqual(r.status_code, 200)
        self.assertIn(nueva_id, [p['id'] for p in r.data])

    def test_banco_no_devuelve_preguntas_de_otra_area(self):
        propia = self._crear_pregunta("Pregunta de matemáticas").data['id']
        ajena = self._crear_pregunta("Pregunta de lectura", area=self.otra_area).data['id']

        r = self.client.get(f'/api/preguntas/banco/?area_id={self.area.id}')
        ids = [p['id'] for p in r.data]
        self.assertIn(propia, ids)
        self.assertNotIn(ajena, ids)

    def test_listado_docente_respeta_el_filtro_de_area(self):
        propia = self._crear_pregunta("Pregunta de matemáticas").data['id']
        ajena = self._crear_pregunta("Pregunta de lectura", area=self.otra_area).data['id']

        r = self.client.get(f'/api/preguntas/teacher/?area_id={self.area.id}')
        self.assertEqual(r.status_code, 200)
        ids = [p['id'] for p in r.data['results']]
        self.assertIn(propia, ids)
        self.assertNotIn(ajena, ids)

    def test_listado_docente_busca_en_el_servidor(self):
        buscada = self._crear_pregunta("Teorema de Pitágoras").data['id']
        otra = self._crear_pregunta("Regla de tres simple").data['id']

        r = self.client.get('/api/preguntas/teacher/?search=pitágoras')
        ids = [p['id'] for p in r.data['results']]
        self.assertIn(buscada, ids)
        self.assertNotIn(otra, ids)

    def test_listado_docente_viene_paginado(self):
        for i in range(30):
            self._crear_pregunta(f"Pregunta número {i}")

        r = self.client.get('/api/preguntas/teacher/')
        self.assertEqual(r.status_code, 200)
        self.assertIn('results', r.data)
        self.assertEqual(r.data['count'], 30)
        self.assertEqual(len(r.data['results']), 25)
        self.assertIsNotNone(r.data['next'])

    def test_la_pregunta_recien_creada_encabeza_el_listado(self):
        """El panel vuelve al listado tras crear: la nueva debe salir primera."""
        self._crear_pregunta("Pregunta antigua")
        nueva_id = self._crear_pregunta("Pregunta recién creada").data['id']

        r = self.client.get('/api/preguntas/teacher/')
        self.assertEqual(r.data['results'][0]['id'], nueva_id)

    def test_areas_sigue_siendo_lista_plana(self):
        """El selector de áreas del panel espera un array, no un objeto paginado."""
        r = self.client.get('/api/preguntas/areas/')
        self.assertEqual(r.status_code, 200)
        self.assertIsInstance(r.data, list)
