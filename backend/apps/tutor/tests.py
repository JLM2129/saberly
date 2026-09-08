from unittest.mock import patch
import os

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from apps.preguntas.models import (
	Area,
	Flashcard,
	OpcionRespuesta,
	OpcionRespuestaIA,
	Pregunta,
	PreguntaIA,
	ProgresoDebilidad,
	SubArea,
	IntentoEntrenamiento,
)
from apps.simulacros.models import DetalleSimulacro, Simulacro
from .ai_service import TutorAI
from .ai_provider import get_model_name
from .flashcard_service import FlashcardService


User = get_user_model()


class AdaptiveTrainingContractTests(TestCase):
	def setUp(self):
		self.client = APIClient()
		self.user = User.objects.create_user(
			email='student@test.com',
			password='password123',
			first_name='Student'
		)
		self.admin = User.objects.create_user(
			email='admin@test.com',
			password='password123',
			first_name='Admin',
			is_staff=True,
		)
		self.area = Area.objects.create(nombre='Matemáticas')
		self.subarea = SubArea.objects.create(area=self.area, nombre='Proporcionalidad')
		self.progreso = ProgresoDebilidad.objects.create(
			usuario=self.user,
			debilidad=self.subarea.nombre,
			area=self.area,
		)
		self.client.force_authenticate(user=self.user)

	def valid_generated_question(self):
		return {
			'enunciado': 'Si una cantidad se duplica, ¿qué ocurre con su proporción?',
			'dificultad': 'facil',
			'pista': 'Identifica la relación entre las cantidades.',
			'ejemplo': 'Un ejemplo guiado paso a paso.',
			'explicacion': 'La proporción conserva la relación indicada.',
			'opciones': [
				{'texto': 'Se duplica.', 'es_correcta': True},
				{'texto': 'Se reduce a la mitad.', 'es_correcta': False},
				{'texto': 'Permanece igual.', 'es_correcta': False},
				{'texto': 'No puede determinarse.', 'es_correcta': False},
			],
		}

	def test_generated_question_contract_requires_four_options_and_one_correct(self):
		question = self.valid_generated_question()
		self.assertIs(TutorAI.validar_pregunta_entrenamiento(question), question)

		invalid = {**question, 'opciones': question['opciones'][:3]}
		with self.assertRaises(ValueError):
			TutorAI.validar_pregunta_entrenamiento(invalid)

		invalid = {**question, 'opciones': [
			{**option, 'es_correcta': True} for option in question['opciones']
		]}
		with self.assertRaises(ValueError):
			TutorAI.validar_pregunta_entrenamiento(invalid)

	@patch('apps.tutor.views.TutorAI.get_instance')
	def test_training_hides_correct_answer_until_response(self, get_instance):
		tutor = get_instance.return_value
		tutor.generar_pregunta_entrenamiento.return_value = self.valid_generated_question()
		tutor.validar_pregunta_entrenamiento.side_effect = TutorAI.validar_pregunta_entrenamiento

		response = self.client.post(
			'/api/tutor/entrenamiento/iniciar/',
			{'debilidad': self.subarea.nombre},
			format='json'
		)

		self.assertEqual(response.status_code, 201)
		self.assertTrue(response.data['opciones'])
		self.assertNotIn('es_correcta', response.data['opciones'][0])

		question = PreguntaIA.objects.get(id=response.data['id'])
		correct_option = question.opciones.get(es_correcta=True)
		answer = self.client.post(
			'/api/tutor/entrenamiento/responder/',
			{'pregunta_ia_id': question.id, 'opcion_id': correct_option.id},
			format='json'
		)

		self.assertEqual(answer.status_code, 200)
		self.assertEqual(answer.data['opcion_correcta_id'], correct_option.id)

	@patch('apps.tutor.views.TutorAI.get_instance')
	def test_training_scaffolding_escalates_and_limits_attempts(self, get_instance):
		tutor = get_instance.return_value
		tutor.generar_pregunta_entrenamiento.return_value = self.valid_generated_question()
		tutor.validar_pregunta_entrenamiento.side_effect = TutorAI.validar_pregunta_entrenamiento
		tutor.diagnosticar_error.return_value = {'tipo_error': 'conceptual'}

		start = self.client.post(
			'/api/tutor/entrenamiento/iniciar/',
			{'debilidad': self.subarea.nombre},
			format='json'
		)
		question = PreguntaIA.objects.get(id=start.data['id'])
		wrong_option = question.opciones.filter(es_correcta=False).first()
		payload = {
			'pregunta_ia_id': question.id,
			'opcion_id': wrong_option.id,
			'sesion_id': start.data['sesion_id'],
		}

		first = self.client.post('/api/tutor/entrenamiento/responder/', payload, format='json')
		second = self.client.post('/api/tutor/entrenamiento/responder/', payload, format='json')
		third = self.client.post('/api/tutor/entrenamiento/responder/', payload, format='json')
		fourth = self.client.post('/api/tutor/entrenamiento/responder/', payload, format='json')

		self.assertEqual(first.data['nivel_feedback'], 1)
		self.assertIsNone(first.data['explicacion'])
		self.assertEqual(second.data['nivel_feedback'], 2)
		self.assertIsNone(second.data['explicacion'])
		self.assertEqual(third.data['nivel_feedback'], 3)
		self.assertTrue(third.data['explicacion'])
		self.assertEqual(third.data['intentos_restantes'], 0)
		self.assertEqual(fourth.status_code, 400)
		self.assertEqual(IntentoEntrenamiento.objects.filter(pregunta_ia=question).count(), 3)

	@patch('apps.tutor.views.TutorAI.get_instance')
	def test_invalid_generated_question_is_not_persisted(self, get_instance):
		tutor = get_instance.return_value
		tutor.generar_pregunta_entrenamiento.return_value = {
			**self.valid_generated_question(),
			'opciones': self.valid_generated_question()['opciones'][:2],
		}
		tutor.validar_pregunta_entrenamiento.side_effect = TutorAI.validar_pregunta_entrenamiento

		response = self.client.post(
			'/api/tutor/entrenamiento/iniciar/',
			{'debilidad': self.subarea.nombre},
			format='json'
		)

		self.assertEqual(response.status_code, 500)
		self.assertEqual(PreguntaIA.objects.count(), 0)

	def test_official_bank_does_not_expose_correct_answers(self):
		question = Pregunta.objects.create(
			area=self.area,
			subarea=self.subarea,
			enunciado='Pregunta oficial',
		)
		OpcionRespuesta.objects.create(pregunta=question, texto='Correcta', es_correcta=True)
		OpcionRespuesta.objects.create(pregunta=question, texto='Incorrecta', es_correcta=False)

		response = self.client.get('/api/preguntas/banco/')

		self.assertEqual(response.status_code, 200)
		self.assertNotIn('es_correcta', response.data[0]['opciones'][0])

	def test_simulacro_rejects_option_from_another_question(self):
		first = Pregunta.objects.create(area=self.area, subarea=self.subarea, enunciado='Primera')
		second = Pregunta.objects.create(area=self.area, subarea=self.subarea, enunciado='Segunda')
		first_option = OpcionRespuesta.objects.create(pregunta=first, texto='Primera correcta', es_correcta=True)
		second_option = OpcionRespuesta.objects.create(pregunta=second, texto='Segunda correcta', es_correcta=True)
		simulacro = Simulacro.objects.create(usuario=self.user)
		detalle = DetalleSimulacro.objects.create(simulacro=simulacro, pregunta=first)

		response = self.client.post(
			f'/api/simulacros/{simulacro.id}/finalizar/',
			{
				'respuestas': [{'pregunta_id': first.id, 'opcion_id': second_option.id}],
				'tiempo_segundos': 10,
			},
			format='json'
		)

		self.assertEqual(response.status_code, 200)
		detalle.refresh_from_db()
		self.assertIsNone(detalle.opcion_seleccionada)
		self.assertFalse(detalle.es_correcta)

	def test_simulacro_updates_real_weakness_progress(self):
		first = Pregunta.objects.create(area=self.area, subarea=self.subarea, enunciado='Primera')
		second = Pregunta.objects.create(area=self.area, subarea=self.subarea, enunciado='Segunda')
		first_option = OpcionRespuesta.objects.create(pregunta=first, texto='Primera correcta', es_correcta=True)
		second_option = OpcionRespuesta.objects.create(pregunta=second, texto='Segunda correcta', es_correcta=True)
		wrong_option = OpcionRespuesta.objects.create(pregunta=first, texto='Primera incorrecta', es_correcta=False)
		simulacro = Simulacro.objects.create(usuario=self.user)
		DetalleSimulacro.objects.create(simulacro=simulacro, pregunta=first)
		DetalleSimulacro.objects.create(simulacro=simulacro, pregunta=second)

		response = self.client.post(
			f'/api/simulacros/{simulacro.id}/finalizar/',
			{
				'respuestas': [
					{'pregunta_id': first.id, 'opcion_id': wrong_option.id},
					{'pregunta_id': second.id, 'opcion_id': second_option.id},
				],
				'tiempo_segundos': 20,
			},
			format='json'
		)

		self.assertEqual(response.status_code, 200)
		self.progreso.refresh_from_db()
		self.assertEqual(self.progreso.intentos_totales, 2)
		self.assertEqual(self.progreso.aciertos_totales, 1)
		self.assertEqual(self.progreso.precision_reciente, 50.0)
		self.assertEqual(self.progreso.historial_recuperacion[-1]['origen'], 'simulacro')

	def test_user_without_history_does_not_receive_synthetic_weaknesses(self):
		self.progreso.delete()

		response = self.client.get('/api/tutor/debilidades/')

		self.assertEqual(response.status_code, 200)
		self.assertEqual(response.data, [])

	def test_flashcards_are_isolated_by_user_and_deletable_only_by_owner(self):
		other_user = User.objects.create_user(email='other@test.com', password='password123')
		own_card = Flashcard.objects.create(
			user=self.user,
			debilidad='Proporcionalidad',
			frente='¿Qué es una razón?',
			dorso='Una comparación entre dos cantidades.',
		)
		other_card = Flashcard.objects.create(
			user=other_user,
			debilidad='Ecuaciones',
			frente='Tarjeta privada',
			dorso='No visible para otro usuario.',
		)

		response = self.client.get('/api/tutor/flashcards/')

		self.assertEqual(response.status_code, 200)
		self.assertEqual([card['id'] for card in response.data], [own_card.id])
		self.assertEqual(response.data[0]['debilidad'], 'Proporcionalidad')

		forbidden_delete = self.client.delete(f'/api/tutor/flashcards/{other_card.id}/')
		self.assertEqual(forbidden_delete.status_code, 404)
		self.assertTrue(Flashcard.objects.filter(id=other_card.id).exists())

		own_delete = self.client.delete(f'/api/tutor/flashcards/{own_card.id}/')
		self.assertEqual(own_delete.status_code, 204)

	@patch.object(FlashcardService, 'generate_from_topics')
	def test_generating_new_weakness_flashcards_replaces_old_deck(self, generate):
		old_card = Flashcard.objects.create(
			user=self.user,
			debilidad='Tema anterior',
			frente='Tarjeta vieja',
			dorso='Contenido viejo',
		)
		generate.return_value = [
			{'frente': 'Tarjeta nueva', 'dorso': 'Contenido nuevo'},
		]
		Pregunta.objects.create(
			area=self.area,
			subarea=self.subarea,
			enunciado='Pregunta fallada',
		)
		simulacro = Simulacro.objects.create(usuario=self.user, completado=True)
		question = Pregunta.objects.get(enunciado='Pregunta fallada')
		DetalleSimulacro.objects.create(simulacro=simulacro, pregunta=question, es_correcta=False)

		response = self.client.post('/api/tutor/flashcards/debilidades/', format='json')

		self.assertEqual(response.status_code, 201)
		self.assertEqual(Flashcard.objects.filter(user=self.user).count(), 1)
		self.assertFalse(Flashcard.objects.filter(id=old_card.id).exists())
		self.assertEqual(response.data[0]['frente'], 'Tarjeta nueva')

	@patch.dict(os.environ, {'GEMINI_MODEL_ID': 'test-model', 'GEMINI_API_KEY': 'test-key'}, clear=False)
	def test_ai_provider_prefers_gemini_configuration(self):
		self.assertEqual(get_model_name(), 'test-model')

	@patch('apps.tutor.views.TutorAI.get_instance')
	def test_ai_endpoint_is_throttled(self, get_instance):
		tutor = get_instance.return_value
		tutor.diagnosticar_error.return_value = {
			'tipo_error': 'conceptual',
			'explicacion_corta': 'Explicación de prueba',
		}

		responses = [
			self.client.post(
				'/api/tutor/interaccion/',
				{
					'action': 'diagnosticar',
					'pregunta': 'Pregunta de prueba',
					'respuesta_correcta': 'A',
					'respuesta_estudiante': 'B',
				},
				format='json'
			)
			for _ in range(31)
		]

		self.assertTrue(all(response.status_code == 200 for response in responses[:30]))
		self.assertEqual(responses[-1].status_code, 429)

	def test_promotion_rejects_invalid_question_without_creating_official_content(self):
		question = PreguntaIA.objects.create(
			usuario=self.user,
			debilidad_objetivo=self.subarea.nombre,
			area=self.area,
			enunciado='Pregunta IA incompleta',
			explicacion='Explicación',
		)
		OpcionRespuestaIA.objects.create(pregunta_ia=question, texto='A', es_correcta=True)
		self.client.force_authenticate(user=self.admin)

		response = self.client.post(f'/api/tutor/preguntas-ia/{question.id}/promocionar/')

		self.assertEqual(response.status_code, 400)
		self.assertEqual(Pregunta.objects.filter(enunciado=question.enunciado).count(), 0)
		question.refresh_from_db()
		self.assertFalse(question.promocionada)

	def test_promotion_copies_order_and_marks_question(self):
		question = PreguntaIA.objects.create(
			usuario=self.user,
			debilidad_objetivo=self.subarea.nombre,
			area=self.area,
			enunciado='Pregunta IA promocionable',
			explicacion='Explicación',
		)
		for index in range(4):
			OpcionRespuestaIA.objects.create(
				pregunta_ia=question,
				texto=f'Opción {index}',
				es_correcta=index == 2,
			)
		self.client.force_authenticate(user=self.admin)

		response = self.client.post(f'/api/tutor/preguntas-ia/{question.id}/promocionar/')

		self.assertEqual(response.status_code, 200)
		official = Pregunta.objects.get(id=response.data['pregunta_oficial_id'])
		self.assertEqual(list(official.opciones.values_list('orden', flat=True)), [0, 1, 2, 3])
		question.refresh_from_db()
		self.assertTrue(question.promocionada)
		self.assertEqual(question.estado_validacion, 'aprobada')
