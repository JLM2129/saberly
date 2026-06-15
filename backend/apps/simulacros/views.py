import random
from rest_framework import viewsets, views, status, permissions
from rest_framework.response import Response
from django.utils import timezone
from .models import Simulacro, DetalleSimulacro
from apps.preguntas.models import Pregunta, OpcionRespuesta
from .serializers import SimulacroSerializer

class SimulacroViewSet(viewsets.ReadOnlyModelViewSet):
    """
    List user's history of Simulacros.
    """
    serializer_class = SimulacroSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        print(f"DEBUG: get_queryset user={self.request.user} id={self.request.user.id}")
        qs = (
            Simulacro.objects
            .filter(usuario=self.request.user)
            .prefetch_related(
                'detalles__pregunta__area',
                'detalles__pregunta__contexto',
                'detalles__pregunta__opciones'
            )
            .order_by('-fecha_inicio')
        )
        return qs

class GenerarSimulacroView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        """
        Payload: { "tipo": "full" | "80%" | "60%" | "40%" | "20%" }
        """
        tipo = request.data.get('tipo', '20%')
        
        # Mapeo de porcentajes al total de 278 preguntas
        TOTAL_BASE = 278
        mapping = {
            '100%': TOTAL_BASE,
            '80%': int(TOTAL_BASE * 0.8),
            '60%': int(TOTAL_BASE * 0.6),
            '40%': int(TOTAL_BASE * 0.4),
            '20%': int(TOTAL_BASE * 0.2),
        }
        
        # Compatibilidad con el tipo anterior "general"
        if tipo == 'general' or tipo not in mapping:
            total_preguntas = mapping.get('20%')
        else:
            total_preguntas = mapping[tipo]

        from apps.preguntas.models import Area
        areas = Area.objects.all()
        num_areas = areas.count()
        
        if num_areas == 0:
            return Response({"error": "No hay áreas definidas en la base de datos."}, status=status.HTTP_400_BAD_REQUEST)

        # Preguntas por área (distribución equitativa)
        preguntas_por_area = total_preguntas // num_areas
        restante = total_preguntas % num_areas

        preguntas_finales = []
        
        for i, area in enumerate(areas):
            # Agregar el resto a la primera área para completar el total exacto
            cantidad_a_tomar = preguntas_por_area + (restante if i == 0 else 0)
            
            preguntas_area_qs = Pregunta.objects.filter(area=area, active=True).order_by('?')[:cantidad_a_tomar]
            preguntas_finales.extend(list(preguntas_area_qs))

        if not preguntas_finales:
            return Response({"error": "No hay preguntas disponibles para generar el simulacro."}, status=status.HTTP_400_BAD_REQUEST)

        # Barajar las preguntas finales para que no estén estrictamente por área
        # O mantenerlas por área si el usuario prefiere (él dijo "separadas las áreas")
        # Si prefiere separadas, no las barajamos aquí, se presentarán en el orden de la lista.
        
        simulacro = Simulacro.objects.create(usuario=request.user)
        
        detalles = []
        for p in preguntas_finales:
            detalles.append(DetalleSimulacro(simulacro=simulacro, pregunta=p))
        
        DetalleSimulacro.objects.bulk_create(detalles)

        serializer = SimulacroSerializer(simulacro)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

class FinalizarSimulacroView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            simulacro = (
                Simulacro.objects
                .filter(pk=pk, usuario=request.user)
                .prefetch_related(
                    'detalles__pregunta__contexto',
                    'detalles__pregunta__opciones',
                )
                .first()
            )
        except Exception:
            simulacro = None

        if not simulacro:
            return Response({"error": "Simulacro no encontrado"}, status=status.HTTP_404_NOT_FOUND)

        if simulacro.completado:
            return Response({"error": "Este simulacro ya fue completado"}, status=status.HTTP_400_BAD_REQUEST)

        respuestas = request.data.get('respuestas', [])
        tiempo = request.data.get('tiempo_segundos', 0)

        for resp in respuestas:
            p_id = resp.get('pregunta_id')
            op_id = resp.get('opcion_id')

            try:
                detalle = DetalleSimulacro.objects.get(simulacro=simulacro, pregunta_id=p_id)
                opcion = OpcionRespuesta.objects.get(id=op_id)

                detalle.opcion_seleccionada = opcion
                detalle.es_correcta = opcion.es_correcta
                detalle.save()
            except (DetalleSimulacro.DoesNotExist, OpcionRespuesta.DoesNotExist):
                continue

        simulacro.tiempo_usado_segundos = tiempo
        simulacro.puntaje_total = simulacro.calcular_puntaje()
        simulacro.fecha_fin = timezone.now()
        simulacro.completado = True
        simulacro.save()

        return Response({"mensaje": "Simulacro finalizado correctamente"}, status=status.HTTP_200_OK)

class SincronizarOfflineView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        """
        Recibe un simulacro completado en modo offline y lo persiste en la BD.
        Intenta reconstruir DetalleSimulacro haciendo match por texto de enunciado.
        Payload esperado: { puntaje, correctas, total, tiempo_usado_segundos, detalles: [...] }
        """
        data = request.data

        puntaje   = data.get('puntaje', 0)
        tiempo    = data.get('tiempo_usado_segundos', 0)
        detalles  = data.get('detalles', [])

        simulacro = Simulacro.objects.create(
            usuario=request.user,
            completado=True,
            puntaje_total=puntaje,
            tiempo_usado_segundos=tiempo,
            fecha_fin=timezone.now()
        )

        # Intentar reconstruir DetalleSimulacro buscando la pregunta por enunciado
        detalles_a_crear = []
        for det in detalles:
            pregunta_data = det.get('pregunta', {})
            enunciado     = pregunta_data.get('enunciado', '').strip()
            es_correcta   = det.get('es_correcta', False)

            if not enunciado:
                continue

            # Buscar pregunta oficial por texto de enunciado (exacto o similar)
            pregunta_obj = Pregunta.objects.filter(enunciado=enunciado).first()

            if pregunta_obj:
                # Intentar hallar la opción seleccionada
                opcion_seleccionada = None
                opcion_seleccionada_texto = None

                # El objeto offline puede tener opcion_seleccionada como ID local o texto
                opciones_offline = pregunta_data.get('opciones', [])
                opcion_id_local  = det.get('opcion_seleccionada')

                for op in opciones_offline:
                    if op.get('id') == opcion_id_local:
                        opcion_seleccionada_texto = op.get('texto', '').strip()
                        break

                if opcion_seleccionada_texto:
                    opcion_seleccionada = OpcionRespuesta.objects.filter(
                        pregunta=pregunta_obj,
                        texto=opcion_seleccionada_texto
                    ).first()

                detalles_a_crear.append(DetalleSimulacro(
                    simulacro=simulacro,
                    pregunta=pregunta_obj,
                    opcion_seleccionada=opcion_seleccionada,
                    es_correcta=es_correcta
                ))

        if detalles_a_crear:
            DetalleSimulacro.objects.bulk_create(detalles_a_crear)

            # Recalcular puntaje real basado en los detalles reconstruidos
            correctas_reales = sum(1 for d in detalles_a_crear if d.es_correcta)
            if detalles_a_crear:
                simulacro.puntaje_total = (correctas_reales / len(detalles_a_crear)) * 100
                simulacro.save()

        return Response({
            "status": "sincronizado",
            "id": simulacro.id,
            "detalles_guardados": len(detalles_a_crear),
            "detalles_recibidos": len(detalles)
        }, status=status.HTTP_201_CREATED)


class SincronizarPartidasOfflineView(views.APIView):
    """
    Recibe una lista de partidas de juegos guardadas en modo offline
    y las persiste en la BD.
    Payload: [ { tipo_juego, puntaje_total, preguntas_correctas, preguntas_incorrectas, max_combo }, ... ]
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        from apps.juegos.models import PartidaDesafio

        partidas_data = request.data if isinstance(request.data, list) else [request.data]
        creadas = 0

        for p in partidas_data:
            try:
                PartidaDesafio.objects.create(
                    usuario=request.user,
                    tipo_juego=p.get('tipo_juego', 'quick'),
                    puntaje_total=p.get('puntaje_total', 0),
                    preguntas_correctas=p.get('preguntas_correctas', 0),
                    preguntas_incorrectas=p.get('preguntas_incorrectas', 0),
                    max_combo=p.get('max_combo', 0),
                )
                creadas += 1
            except Exception as e:
                continue

        return Response({
            "status": "sincronizado",
            "partidas_guardadas": creadas
        }, status=status.HTTP_201_CREATED)
