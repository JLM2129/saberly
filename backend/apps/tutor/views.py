from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from apps.preguntas.models import Pregunta, Flashcard
from apps.simulacros.models import DetalleSimulacro
from django.db.models import Count
from .ai_service import TutorAI
from .flashcard_service import FlashcardService
import logging

logger = logging.getLogger(__name__)

class ExplicarPreguntaView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        question_id = request.data.get('question_id')
        user_answer = request.data.get('user_answer')
        correct_answer = request.data.get('correct_answer')
        question_text_manual = request.data.get('question_text') # Optional if passing full object

        if not question_id and not question_text_manual:
            return Response({"error": "Falta el ID o el texto de la pregunta"}, status=status.HTTP_400_BAD_REQUEST)

        # Get question text
        question_text = question_text_manual
        if not question_text and question_id:
            try:
                pregunta = Pregunta.objects.get(id=question_id)
                question_text = pregunta.enunciado
                # Also try to get correct answer if not provided
                if not correct_answer:
                    correct_opt = pregunta.opciones.filter(es_correcta=True).first()
                    if correct_opt:
                        correct_answer = correct_opt.texto
            except Pregunta.DoesNotExist:
                return Response({"error": "Pregunta no encontrada"}, status=status.HTTP_404_NOT_FOUND)

        try:
            # Try to use Gemma AI
            tutor_ai = TutorAI.get_instance()
            explanation = tutor_ai.generate_explanation(
                question_text=question_text,
                user_answer=user_answer,
                correct_answer=correct_answer
            )
        except Exception as e:
            logger.error(f"Error en Tutor AI: {str(e)}")
            # Fallback to hardcoded logic if AI fails (OOM, missing model, etc.)
            is_correct = user_answer == correct_answer
            mood_emoji = "✅" if is_correct else "💡"
            title = "¡Excelente razonamiento!" if is_correct else "Analicemos por qué otra opción es mejor"
            
            explanation = f"{mood_emoji} **{title}** (Modo Fallback)\n\n"
            if is_correct:
                explanation += f"Has seleccionado correctamente: *'{user_answer}'*.\n\n"
                explanation += "Esta respuesta es la correcta porque impacta directamente en la lógica del problema planteado."
            else:
                explanation += f"Tu respuesta fue: *'{user_answer}'*.\n"
                explanation += f"La respuesta correcta es: **'{correct_answer}'**.\n\n"
                explanation += "En esta pregunta, el punto clave era identificar la relación entre las variables presentadas."
            
            explanation += "\n\n**Nota:** El tutor avanzado está temporalmente fuera de línea, pero aquí tienes una guía rápida."

        return Response({
            "explanation": explanation
        })

class GenerateFlashcardsView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        question_id = request.data.get('question_id')
        user_answer = request.data.get('user_answer', "Respuesta incorrecta")

        if not question_id:
            return Response({"error": "Falta el ID de la pregunta"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            pregunta = Pregunta.objects.get(id=question_id)
        except Pregunta.DoesNotExist:
            return Response({"error": "Pregunta no encontrada"}, status=status.HTTP_404_NOT_FOUND)

        # Generate using Gemma
        try:
            flashcards_data = FlashcardService.generate_flashcards(
                pregunta_texto=pregunta.enunciado,
                error_usuario=user_answer
            )
            
            # Save to DB
            created_flashcards = []
            for item in flashcards_data:
                flashcard = Flashcard.objects.create(
                    user=request.user,
                    pregunta_relacionada=pregunta,
                    frente=item.get('frente', ''),
                    dorso=item.get('dorso', '')
                )
                created_flashcards.append({
                    "id": flashcard.id,
                    "frente": flashcard.frente,
                    "dorso": flashcard.dorso
                })
                
            return Response(created_flashcards, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            logger.error(f"Error generando flashcards: {str(e)}")
            return Response({"error": "No se pudieron generar las flashcards"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
class GenerateWeaknessFlashcardsView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        # 1. Obtener debilidades del usuario
        # Analizamos los últimos detalles de simulacros donde falló
        fallos = DetalleSimulacro.objects.filter(
            simulacro__usuario=request.user,
            es_correcta=False
        ).values('pregunta__area__nombre').annotate(
            total_fallos=Count('id')
        ).order_by('-total_fallos')[:5]

        if not fallos:
            return Response({"error": "No hay suficientes fallos registrados para analizar debilidades."}, status=status.HTTP_404_NOT_FOUND)

        topics_data = [
            {'area': f['pregunta__area__nombre'], 'errors': f['total_fallos']} 
            for f in fallos
        ]

        # 2. Generar con Gemma
        try:
            flashcards_json = FlashcardService.generate_from_topics(topics_data)
            
            # 3. Guardar en Base de Datos
            created_objects = []
            for item in flashcards_json:
                flashcard = Flashcard.objects.create(
                    user=request.user,
                    frente=item.get('frente', ''),
                    dorso=item.get('dorso', '')
                )
                created_objects.append({
                    "id": flashcard.id,
                    "frente": flashcard.frente,
                    "dorso": flashcard.dorso
                })

            return Response(created_objects, status=status.HTTP_201_CREATED)

        except Exception as e:
            logger.error(f"Error en GenerateWeaknessFlashcardsView: {str(e)}")
            return Response({"error": "No se pudieron generar las flashcards de debilidades"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class InteraccionTutorView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        action = request.data.get('action') # diagnosticar, pista, ejemplo, explicacion, perfil, flashcard, personalizacion
        
        tutor_ai = TutorAI.get_instance()
        
        try:
            if action == 'diagnosticar':
                pregunta = request.data.get('pregunta')
                correcta = request.data.get('respuesta_correcta')
                estudiante = request.data.get('respuesta_estudiante')
                res = tutor_ai.diagnosticar_error(pregunta, correcta, estudiante)
                return Response(res)
                
            elif action == 'pista':
                tipo_error = request.data.get('tipo_error')
                pregunta = request.data.get('pregunta')
                res = tutor_ai.generar_pista(tipo_error, pregunta)
                return Response({"pista": res})
                
            elif action == 'ejemplo':
                tipo_error = request.data.get('tipo_error')
                pregunta = request.data.get('pregunta')
                res = tutor_ai.generar_ejemplo(tipo_error, pregunta)
                return Response({"ejemplo": res})
                
            elif action == 'explicacion':
                tipo_error = request.data.get('tipo_error')
                pregunta = request.data.get('pregunta')
                estudiante = request.data.get('respuesta_estudiante')
                correcta = request.data.get('respuesta_correcta')
                res = tutor_ai.generar_explicacion_final(tipo_error, pregunta, estudiante, correcta)
                return Response({"explicacion": res})
                
            elif action == 'perfil':
                historial = request.data.get('historial_errores')
                res = tutor_ai.generar_perfil_cognitivo(historial)
                return Response(res)
                
            elif action == 'flashcard':
                tipo_error = request.data.get('tipo_error')
                tema = request.data.get('tema')
                res = tutor_ai.generar_flashcard_inteligente(tipo_error, tema)
                return Response(res)
                
            elif action == 'personalizacion':
                perfil = request.data.get('perfil_cognitivo')
                tipo_error = request.data.get('tipo_error')
                pregunta = request.data.get('pregunta')
                res = tutor_ai.intervencion_personalizada(perfil, tipo_error, pregunta)
                return Response({"intervencion": res})
                
            else:
                return Response({"error": "Acción no válida"}, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            logger.error(f"Error en InteraccionTutorView ({action}): {str(e)}")
            return Response({"error": "Hubo un problema con la IA del tutor"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

