from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from apps.preguntas.models import (
    Pregunta,
    OpcionRespuesta,
    Flashcard,
    PreguntaIA,
    OpcionRespuestaIA,
    ProgresoDebilidad,
    SesionEntrenamiento,
    IntentoEntrenamiento,
    Area,
    SubArea,
)
from apps.preguntas.serializers import (
    PreguntaIASerializer,
    PreguntaIABlindSerializer,
    ProgresoDebilidadSerializer,
    FlashcardSerializer,
)
from apps.simulacros.models import DetalleSimulacro
from django.db.models import Count
from django.db import transaction
from django.utils import timezone
from .ai_service import TutorAI
from .flashcard_service import FlashcardService
from .throttles import TutorAIThrottle
import logging

logger = logging.getLogger(__name__)

class ExplicarPreguntaView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = [TutorAIThrottle]
    throttle_scope = 'ai'

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
    throttle_classes = [TutorAIThrottle]
    throttle_scope = 'ai'

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
                    debilidad=pregunta.subarea.nombre if pregunta.subarea else pregunta.area.nombre,
                    frente=item.get('frente', ''),
                    dorso=item.get('dorso', '')
                )
                created_flashcards.append(FlashcardSerializer(flashcard).data)
                
            return Response(created_flashcards, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            logger.error(f"Error generando flashcards: {str(e)}")
            return Response({"error": "No se pudieron generar las flashcards"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
class GenerateWeaknessFlashcardsView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = [TutorAIThrottle]
    throttle_scope = 'ai'

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
            
            # Reemplazar el mazo completo solo después de generar el nuevo.
            with transaction.atomic():
                Flashcard.objects.filter(user=request.user).delete()
                created_objects = []
                for index, item in enumerate(flashcards_json):
                    flashcard = Flashcard.objects.create(
                        user=request.user,
                        debilidad=topics_data[index % len(topics_data)]['area'],
                        frente=item.get('frente', ''),
                        dorso=item.get('dorso', '')
                    )
                    created_objects.append(FlashcardSerializer(flashcard).data)

            return Response(created_objects, status=status.HTTP_201_CREATED)

        except Exception as e:
            logger.error(f"Error en GenerateWeaknessFlashcardsView: {str(e)}")
            return Response({"error": "No se pudieron generar las flashcards de debilidades"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class FlashcardListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        flashcards = Flashcard.objects.filter(user=request.user).select_related('pregunta_relacionada')[:100]
        return Response(FlashcardSerializer(flashcards, many=True).data)


class FlashcardDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, pk):
        deleted, _ = Flashcard.objects.filter(pk=pk, user=request.user).delete()
        if not deleted:
            return Response({"error": "Flashcard no encontrada"}, status=status.HTTP_404_NOT_FOUND)
        return Response(status=status.HTTP_204_NO_CONTENT)

class InteraccionTutorView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = [TutorAIThrottle]
    throttle_scope = 'ai'

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


class ObtenerDebilidadesView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        usuario = request.user

        # 1. PRIORIDAD: fallos por subárea en simulacros online (DetalleSimulacro en BD)
        fallos_subarea = DetalleSimulacro.objects.filter(
            simulacro__usuario=usuario,
            es_correcta=False
        ).exclude(pregunta__subarea=None).values(
            'pregunta__subarea__nombre',
            'pregunta__area'
        ).annotate(
            total_fallos=Count('id')
        ).order_by('-total_fallos')

        debilidades_detectadas = []
        for f in fallos_subarea:
            nombre_subarea = f['pregunta__subarea__nombre']
            area_id = f['pregunta__area']
            progreso, _ = ProgresoDebilidad.objects.get_or_create(
                usuario=usuario,
                debilidad=nombre_subarea,
                defaults={'area_id': area_id}
            )
            debilidades_detectadas.append(progreso)

        # 2. FALLBACK: si no hay fallos por subárea, intentar por área general
        #    (cubre el caso de simulacros cuyos detalles no tienen subárea asignada)
        if not debilidades_detectadas:
            fallos_area = DetalleSimulacro.objects.filter(
                simulacro__usuario=usuario,
                es_correcta=False
            ).values(
                'pregunta__area',
                'pregunta__area__nombre'
            ).annotate(
                total_fallos=Count('id')
            ).order_by('-total_fallos')

            for f in fallos_area:
                area_id = f['pregunta__area']
                area_nombre = f['pregunta__area__nombre']
                if area_id and area_nombre:
                    progreso, _ = ProgresoDebilidad.objects.get_or_create(
                        usuario=usuario,
                        debilidad=area_nombre,
                        defaults={'area_id': area_id}
                    )
                    debilidades_detectadas.append(progreso)

        # Devolver todos los progresos de debilidades registradas para este usuario
        progresos = ProgresoDebilidad.objects.filter(
            usuario=usuario
        ).select_related('area').order_by('-intentos_totales', 'debilidad')
        serializer = ProgresoDebilidadSerializer(progresos, many=True)
        return Response(serializer.data)


class IniciarEntrenamientoView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = [TutorAIThrottle]
    throttle_scope = 'ai'

    def post(self, request):
        debilidad_nombre = request.data.get('debilidad')
        if not debilidad_nombre:
            return Response({"error": "Debe proporcionar el nombre de la debilidad"}, status=status.HTTP_400_BAD_REQUEST)
            
        usuario = request.user
        
        # Buscar el progreso de esta debilidad
        progreso = ProgresoDebilidad.objects.filter(usuario=usuario, debilidad=debilidad_nombre).first()
        if not progreso:
            return Response({"error": "La debilidad no está registrada en tu historial"}, status=status.HTTP_404_NOT_FOUND)

        session_id = request.data.get('sesion_id')
        if session_id:
            sesion = SesionEntrenamiento.objects.filter(
                id=session_id,
                usuario=usuario,
                debilidad=debilidad_nombre,
                estado='activa',
            ).first()
            if not sesion:
                return Response({"error": "La sesión de entrenamiento no existe o ya terminó"}, status=status.HTTP_404_NOT_FOUND)
        else:
            sesion = SesionEntrenamiento.objects.create(
                usuario=usuario,
                debilidad=debilidad_nombre,
                area=progreso.area,
                nivel_inicial='facil',
                nivel_actual='facil',
            )
            
        # Determinar dificultad en base a su nivel de precisión
        precision = progreso.precision_reciente
        if progreso.intentos_totales < 3:
            dificultad = 'facil'
        elif precision >= 80.0:
            dificultad = 'dificil'
        elif precision >= 55.0:
            dificultad = 'media'
        else:
            dificultad = 'facil'
            
        # Analizar si tiene un tipo de error recurrente en sus últimos fallos
        tipo_error_frecuente = None
        errores = [intento.get('tipo_error') for intento in progreso.historial_recuperacion if intento and intento.get('es_correcta') == False and intento.get('tipo_error')]
        if errores:
            tipo_error_frecuente = max(set(errores), key=errores.count)
            
        # Usar TutorAI con Gemma 4 para generar la pregunta interactiva adaptada
        try:
            tutor_ai = TutorAI.get_instance()
            datos_pregunta = tutor_ai.validar_pregunta_entrenamiento(
                tutor_ai.generar_pregunta_entrenamiento(
                    debilidad=debilidad_nombre,
                    dificultad=dificultad,
                    tipo_error_frecuente=tipo_error_frecuente
                )
            )
            
            # Guardar PreguntaIA en la base de datos
            pregunta_ia = PreguntaIA.objects.create(
                usuario=usuario,
                sesion=sesion,
                debilidad_objetivo=debilidad_nombre,
                area=progreso.area,
                enunciado=datos_pregunta.get('enunciado', 'Pregunta sin enunciado'),
                dificultad=datos_pregunta.get('dificultad', dificultad),
                pista=datos_pregunta.get('pista', ''),
                ejemplo=datos_pregunta.get('ejemplo', ''),
                explicacion=datos_pregunta.get('explicacion', '')
            )
            
            # Crear las opciones de respuesta
            opciones_list = datos_pregunta.get('opciones', [])
            for opt in opciones_list:
                OpcionRespuestaIA.objects.create(
                    pregunta_ia=pregunta_ia,
                    texto=opt.get('texto', ''),
                    es_correcta=opt.get('es_correcta', False)
                )

            sesion.preguntas_generadas += 1
            sesion.nivel_actual = dificultad
            sesion.save(update_fields=['preguntas_generadas', 'nivel_actual'])
                
            # Serializar la pregunta de forma "ciega" (sin revelar cuál es la correcta ni la explicación completa)
            serializer = PreguntaIABlindSerializer(pregunta_ia)
            response_data = dict(serializer.data)
            response_data.update({
                'sesion_id': sesion.id,
                'intentos_maximos': 3,
            })
            return Response(response_data, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            logger.error(f"Error iniciando entrenamiento: {str(e)}")
            return Response({"error": "No se pudo generar el ejercicio con la IA en este momento"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ResponderEntrenamientoView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = [TutorAIThrottle]
    throttle_scope = 'ai'

    def post(self, request):
        pregunta_ia_id = request.data.get('pregunta_ia_id')
        opcion_id = request.data.get('opcion_id')
        
        if not pregunta_ia_id or not opcion_id:
            return Response({"error": "Falta pregunta_ia_id u opcion_id"}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            pregunta_ia = PreguntaIA.objects.get(id=pregunta_ia_id, usuario=request.user)
            opcion = OpcionRespuestaIA.objects.get(id=opcion_id, pregunta_ia=pregunta_ia)
        except (PreguntaIA.DoesNotExist, OpcionRespuestaIA.DoesNotExist):
            return Response({"error": "Pregunta u opción no encontrada"}, status=status.HTTP_404_NOT_FOUND)

        sesion = pregunta_ia.sesion
        session_id = request.data.get('sesion_id')
        if session_id and (not sesion or str(sesion.id) != str(session_id)):
            return Response({"error": "La pregunta no pertenece a esta sesión"}, status=status.HTTP_400_BAD_REQUEST)
        if not sesion:
            return Response({"error": "La pregunta no está asociada a una sesión"}, status=status.HTTP_400_BAD_REQUEST)

        intentos_previos = IntentoEntrenamiento.objects.filter(pregunta_ia=pregunta_ia).count()
        if intentos_previos >= 3:
            return Response({"error": "Se alcanzó el máximo de tres intentos para esta pregunta"}, status=status.HTTP_400_BAD_REQUEST)
        numero_intento = intentos_previos + 1
            
        es_correcta = opcion.es_correcta
        explicacion_mostrada = es_correcta or numero_intento >= 3

        IntentoEntrenamiento.objects.create(
            sesion=sesion,
            pregunta_ia=pregunta_ia,
            opcion_seleccionada=opcion,
            numero_intento=numero_intento,
            es_correcta=es_correcta,
            pista_utilizada=bool(request.data.get('pista_utilizada', False)),
            ejemplo_utilizado=bool(request.data.get('ejemplo_utilizado', False)),
            explicacion_mostrada=explicacion_mostrada,
            tiempo_respuesta_ms=request.data.get('tiempo_respuesta_ms'),
        )

        sesion.intentos_totales += 1
        if es_correcta:
            sesion.aciertos_totales += 1
        sesion.save(update_fields=['intentos_totales', 'aciertos_totales'])
        
        # 1. Actualizar PreguntaIA stats
        pregunta_ia.veces_respondida += 1
        if es_correcta:
            pregunta_ia.veces_correcta += 1
        pregunta_ia.tasa_exito = (pregunta_ia.veces_correcta / pregunta_ia.veces_respondida) * 100.0
        pregunta_ia.save()
        
        # 2. Actualizar ProgresoDebilidad
        progreso = ProgresoDebilidad.objects.filter(usuario=request.user, debilidad=pregunta_ia.debilidad_objetivo).first()
        if progreso:
            # Determinar tipo de error usando Gemma si falló
            tipo_error = None
            if not es_correcta:
                try:
                    tutor_ai = TutorAI.get_instance()
                    opcion_correcta = pregunta_ia.opciones.filter(es_correcta=True).first()
                    correcta_texto = opcion_correcta.texto if opcion_correcta else ""
                    diag = tutor_ai.diagnosticar_error(pregunta_ia.enunciado, correcta_texto, opcion.texto)
                    tipo_error = diag.get('tipo_error', 'conceptual')
                except Exception:
                    tipo_error = 'conceptual'
            
            progreso.registrar_intento(
                es_correcta=es_correcta,
                dificultad=pregunta_ia.dificultad,
                tipo_error=tipo_error,
            )
            
        # Determinar microvictoria motivacional
        microvictoria = None
        if es_correcta:
            if progreso and progreso.microvictorias == 1:
                microvictoria = "¡Primer paso hacia el dominio! Has superado tu primer ejercicio de esta debilidad. 🎉"
            elif progreso and progreso.nivel_actual == 'alto':
                microvictoria = "¡Maestría Alcanzada! Has subido el nivel de esta debilidad a Alto. ¡Increíble! 🌟"
            else:
                microvictoria = "¡Excelente respuesta! Tu cerebro está asimilando el concepto correctamente. 🧠"
                
        # Respuesta pedagógica progresiva (Scaffolding)
        response_data = {
            "es_correcta": es_correcta,
            "explicacion": pregunta_ia.explicacion if explicacion_mostrada else None,
            "microvictoria": microvictoria,
            "intento_numero": numero_intento,
            "intentos_restantes": 3 - numero_intento,
            "nivel_feedback": 3 if explicacion_mostrada else numero_intento,
        }

        opcion_correcta = pregunta_ia.opciones.filter(es_correcta=True).first()
        response_data["opcion_correcta_id"] = opcion_correcta.id if opcion_correcta else None
        
        if not es_correcta:
            response_data["pista"] = pregunta_ia.pista
            response_data["ejemplo"] = pregunta_ia.ejemplo
            
        return Response(response_data)


class PromocionarPreguntaIAView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]

    def post(self, request, pk):
        try:
            pregunta_ia = PreguntaIA.objects.get(id=pk)
        except PreguntaIA.DoesNotExist:
            return Response({"error": "Pregunta IA no encontrada"}, status=status.HTTP_404_NOT_FOUND)
            
        if pregunta_ia.promocionada:
            return Response({"error": "Esta pregunta ya ha sido promocionada"}, status=status.HTTP_400_BAD_REQUEST)

        opciones_ia = list(pregunta_ia.opciones.all())
        if len(opciones_ia) != 4 or sum(opcion.es_correcta for opcion in opciones_ia) != 1:
            return Response({"error": "La pregunta debe tener cuatro opciones y una sola respuesta correcta"}, status=status.HTTP_400_BAD_REQUEST)

        if Pregunta.objects.filter(area=pregunta_ia.area, enunciado=pregunta_ia.enunciado).exists():
            return Response({"error": "Ya existe una pregunta oficial con el mismo enunciado"}, status=status.HTTP_409_CONFLICT)
            
        with transaction.atomic():
            pregunta_oficial = Pregunta.objects.create(
                area=pregunta_ia.area,
                enunciado=pregunta_ia.enunciado,
                tipo='seleccion_unica',
                dificultad=pregunta_ia.dificultad,
                explicacion=pregunta_ia.explicacion,
                active=True
            )

            for orden, opt in enumerate(opciones_ia):
                OpcionRespuesta.objects.create(
                    pregunta=pregunta_oficial,
                    texto=opt.texto,
                    es_correcta=opt.es_correcta,
                    orden=orden
                )

            pregunta_ia.promocionada = True
            pregunta_ia.estado_validacion = 'aprobada'
            pregunta_ia.save(update_fields=['promocionada', 'estado_validacion'])
        
        return Response({
            "message": "Pregunta IA promocionada con éxito al banco oficial",
            "pregunta_oficial_id": pregunta_oficial.id
        })


