from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from apps.preguntas.models import Pregunta, Flashcard, PreguntaIA, OpcionRespuestaIA, ProgresoDebilidad, Area, SubArea
from apps.preguntas.serializers import PreguntaIASerializer, PreguntaIABlindSerializer, ProgresoDebilidadSerializer
from apps.simulacros.models import DetalleSimulacro
from django.db.models import Count
from django.utils import timezone
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

        # 3. FALLBACK FINAL: usuario sin historial, sugerimos todas las subáreas disponibles
        if not debilidades_detectadas:
            subareas_default = SubArea.objects.select_related('area').all()[:6]
            for sa in subareas_default:
                progreso, _ = ProgresoDebilidad.objects.get_or_create(
                    usuario=usuario,
                    debilidad=sa.nombre,
                    defaults={'area': sa.area}
                )
                debilidades_detectadas.append(progreso)

        # 4. FALLBACK ÚLTIMO RECURSO: si ni siquiera hay subáreas, usamos áreas generales
        if not debilidades_detectadas:
            areas = Area.objects.all()
            for ar in areas:
                progreso, _ = ProgresoDebilidad.objects.get_or_create(
                    usuario=usuario,
                    debilidad=ar.nombre,
                    defaults={'area': ar}
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

    def post(self, request):
        debilidad_nombre = request.data.get('debilidad')
        if not debilidad_nombre:
            return Response({"error": "Debe proporcionar el nombre de la debilidad"}, status=status.HTTP_400_BAD_REQUEST)
            
        usuario = request.user
        
        # Buscar el progreso de esta debilidad
        progreso = ProgresoDebilidad.objects.filter(usuario=usuario, debilidad=debilidad_nombre).first()
        if not progreso:
            # Buscar área relacionada en la DB para crear el progreso
            subarea = SubArea.objects.filter(nombre=debilidad_nombre).first()
            area = subarea.area if subarea else Area.objects.first()
            if not area:
                return Response({"error": "No hay áreas registradas en el sistema para asociar la debilidad"}, status=status.HTTP_400_BAD_REQUEST)
                
            progreso = ProgresoDebilidad.objects.create(
                usuario=usuario,
                debilidad=debilidad_nombre,
                area=area
            )
            
        # Determinar dificultad en base a su nivel de precisión
        precision = progreso.calcular_precision()
        if progreso.intentos_totales < 3:
            dificultad = 'facil'
        elif precision >= 70.0:
            dificultad = 'dificil'
        elif precision >= 40.0:
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
            datos_pregunta = tutor_ai.generar_pregunta_entrenamiento(
                debilidad=debilidad_nombre,
                dificultad=dificultad,
                tipo_error_frecuente=tipo_error_frecuente
            )
            
            # Guardar PreguntaIA en la base de datos
            pregunta_ia = PreguntaIA.objects.create(
                usuario=usuario,
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
                
            # Serializar la pregunta de forma "ciega" (sin revelar cuál es la correcta ni la explicación completa)
            serializer = PreguntaIABlindSerializer(pregunta_ia)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            logger.error(f"Error iniciando entrenamiento: {str(e)}")
            return Response({"error": "No se pudo generar el ejercicio con la IA en este momento"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ResponderEntrenamientoView(APIView):
    permission_classes = [IsAuthenticated]

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
            
        es_correcta = opcion.es_correcta
        
        # 1. Actualizar PreguntaIA stats
        pregunta_ia.veces_respondida += 1
        if es_correcta:
            pregunta_ia.veces_correcta += 1
        pregunta_ia.tasa_exito = (pregunta_ia.veces_correcta / pregunta_ia.veces_respondida) * 100.0
        pregunta_ia.save()
        
        # 2. Actualizar ProgresoDebilidad
        progreso = ProgresoDebilidad.objects.filter(usuario=request.user, debilidad=pregunta_ia.debilidad_objetivo).first()
        if progreso:
            precision_anterior = progreso.calcular_precision()
            
            progreso.intentos_totales += 1
            if es_correcta:
                progreso.aciertos_totales += 1
                
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
            
            # Guardar en historial de recuperación
            nuevo_intento = {
                "fecha": timezone.now().isoformat(),
                "es_correcta": es_correcta,
                "dificultad": pregunta_ia.dificultad,
                "tipo_error": tipo_error
            }
            progreso.historial_recuperacion.append(nuevo_intento)
            
            # Calcular nueva precisión y mejora porcentual
            precision_nueva = progreso.calcular_precision()
            progreso.porcentaje_mejora = precision_nueva - precision_anterior
            
            # Ajustar nivel_actual
            if precision_nueva >= 75.0 and progreso.intentos_totales >= 4:
                progreso.nivel_actual = 'alto'
            elif precision_nueva >= 45.0:
                progreso.nivel_actual = 'medio'
            else:
                progreso.nivel_actual = 'bajo'
                
            progreso.save()
            
        # Determinar microvictoria motivacional
        microvictoria = None
        if es_correcta:
            if progreso and progreso.aciertos_totales == 1:
                microvictoria = "¡Primer paso hacia el dominio! Has superado tu primer ejercicio de esta debilidad. 🎉"
            elif progreso and progreso.nivel_actual == 'alto':
                microvictoria = "¡Maestría Alcanzada! Has subido el nivel de esta debilidad a Alto. ¡Increíble! 🌟"
            else:
                microvictoria = "¡Excelente respuesta! Tu cerebro está asimilando el concepto correctamente. 🧠"
                
        # Respuesta pedagógica progresiva (Scaffolding)
        response_data = {
            "es_correcta": es_correcta,
            "explicacion": pregunta_ia.explicacion,
            "microvictoria": microvictoria
        }
        
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
            
        # Crear Pregunta oficial
        pregunta_oficial = Pregunta.objects.create(
            area=pregunta_ia.area,
            enunciado=pregunta_ia.enunciado,
            tipo='seleccion_unica',
            dificultad=pregunta_ia.dificultad,
            explicacion=pregunta_ia.explicacion,
            active=True
        )
        
        # Copiar las opciones
        opciones_ia = pregunta_ia.opciones.all()
        for opt in opciones_ia:
            OpcionRespuesta.objects.create(
                pregunta=pregunta_oficial,
                texto=opt.texto,
                es_correcta=opt.es_correcta,
                orden=0
            )
            
        # Marcar como promocionada y aprobada
        pregunta_ia.promocionada = True
        pregunta_ia.estado_validacion = 'aprobada'
        pregunta_ia.save()
        
        return Response({
            "message": "Pregunta IA promocionada con éxito al banco oficial",
            "pregunta_oficial_id": pregunta_oficial.id
        })


