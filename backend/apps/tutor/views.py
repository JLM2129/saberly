from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from apps.preguntas.models import Pregunta
from .ai_service import TutorAI
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
