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

        return Response(
            SimulacroSerializer(simulacro).data,
            status=status.HTTP_200_OK
        )
