from rest_framework import viewsets, permissions, status
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.permissions import IsAdminUser, IsAuthenticated
from rest_framework.response import Response

from .models import Area, Pregunta
from .serializers import AreaSerializer, PreguntaSerializer, PreguntaCreateSerializer

from apps.preguntas.services.contexto_service import (
    asegurar_contexto_por_area,
    asignar_contextos_a_preguntas
)


class IsTeacher(permissions.BasePermission):
    """
    Permiso personalizado para verificar si el usuario es docente
    """
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.is_teacher


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


class TeacherPreguntaViewSet(viewsets.ModelViewSet):
    """
    ViewSet para que los docentes puedan crear, editar y eliminar preguntas
    """
    queryset = Pregunta.objects.all().select_related('contexto', 'area', 'subarea').prefetch_related('opciones')
    permission_classes = [IsAuthenticated, IsTeacher]
    
    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return PreguntaCreateSerializer
        return PreguntaSerializer
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        
        # Retornar la pregunta creada con el serializer de lectura
        pregunta = serializer.instance
        response_serializer = PreguntaSerializer(pregunta)
        headers = self.get_success_headers(serializer.data)
        return Response(
            response_serializer.data, 
            status=status.HTTP_201_CREATED, 
            headers=headers
        )
    
    @action(detail=False, methods=['get'])
    def my_questions(self, request):
        """
        Retorna todas las preguntas creadas (útil para estadísticas)
        """
        preguntas = self.get_queryset()
        page = self.paginate_queryset(preguntas)
        if page is not None:
            serializer = PreguntaSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = PreguntaSerializer(preguntas, many=True)
        return Response(serializer.data)


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
