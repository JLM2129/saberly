from rest_framework import viewsets, permissions
from .models import Area, Pregunta
from .serializers import AreaSerializer, PreguntaSerializer

class AreaViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Area.objects.all()
    serializer_class = AreaSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

class PreguntaViewSet(viewsets.ModelViewSet):
    """
    Standard CRUD for questions. 
    Admin can create/edit. Users usually just read via 'Simulacros' app, 
    but this endpoint is useful for listing questions or 'Practice Mode'.
    """
    queryset = Pregunta.objects.filter(active=True).select_related('contexto', 'subarea__area')

    serializer_class = PreguntaSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    
    def get_queryset(self):
        queryset = super().get_queryset()
        area_id = self.request.query_params.get('area_id')
        if area_id:
            queryset = queryset.filter(subarea__area_id=area_id)
        return queryset
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response

from apps.preguntas.services.contexto_service import (
    asegurar_contexto_por_area,
    asignar_contextos_a_preguntas
)


@api_view(['POST'])
@permission_classes([IsAdminUser])
def assign_context_api(request):
    """
    Asigna contextos a preguntas que no tienen contexto.
    Reutiliza la lógica del management command.
    """
    contextos_creados = asegurar_contexto_por_area()
    preguntas_actualizadas = asignar_contextos_a_preguntas()

    return Response({
        "status": "ok",
        "contextos_creados": contextos_creados,
        "preguntas_actualizadas": preguntas_actualizadas
    })
