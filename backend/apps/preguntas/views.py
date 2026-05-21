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

class IsContentAdmin(permissions.BasePermission):
    """
    Permiso para usuarios que pueden importar contenido masivamente
    """
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.is_content_admin


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

import json
from .models import SubArea, Contexto, OpcionRespuesta

@api_view(['POST'])
@permission_classes([IsAuthenticated, IsContentAdmin])
def validate_import_api(request):
    """
    Valida un archivo JSON con preguntas y retorna errores, duplicados y preview.
    """
    try:
        data = json.loads(request.FILES['file'].read())
    except Exception as e:
        return Response({"error": "Formato de archivo inválido. Se espera JSON válido."}, status=400)
    
    area_nombre = data.get('nombre')
    if not area_nombre:
        return Response({"error": "El archivo debe especificar el 'nombre' del área."}, status=400)
    
    try:
        area = Area.objects.get(nombre__iexact=area_nombre)
    except Area.DoesNotExist:
        return Response({"error": f"El área '{area_nombre}' no existe en el sistema."}, status=400)
    
    preguntas_existentes = set(Pregunta.objects.filter(area=area).values_list('enunciado', flat=True))
    
    preview = []
    errores = []
    stats = {'total': 0, 'nuevas': 0, 'duplicadas': 0, 'con_error': 0}
    
    contextos = data.get('contextos', [])
    for ctx_idx, ctx_data in enumerate(contextos):
        ctx_text = ctx_data.get('contexto', '')
        preguntas = ctx_data.get('preguntas', [])
        
        for preg_idx, preg_data in enumerate(preguntas):
            stats['total'] += 1
            enunciado = preg_data.get('enunciado')
            if not enunciado:
                errores.append(f"Pregunta {stats['total']}: Falta el enunciado.")
                stats['con_error'] += 1
                continue
            
            es_duplicada = enunciado in preguntas_existentes
            
            opciones = preg_data.get('opciones', [])
            correctas = sum(1 for o in opciones if o.get('es_correcta'))
            
            error_pregunta = None
            if len(opciones) < 2:
                error_pregunta = "Debe tener al menos 2 opciones."
            elif correctas != 1:
                error_pregunta = f"Debe tener exactamente 1 respuesta correcta (tiene {correctas})."
                
            if error_pregunta:
                errores.append(f"Pregunta '{enunciado[:30]}...': {error_pregunta}")
                stats['con_error'] += 1
                estado = 'error'
            elif es_duplicada:
                stats['duplicadas'] += 1
                estado = 'duplicada'
            else:
                stats['nuevas'] += 1
                estado = 'ok'
                
            preview.append({
                'id_tmp': stats['total'],
                'enunciado': enunciado,
                'contexto': ctx_text[:50] + '...' if ctx_text else None,
                'dificultad': preg_data.get('dificultad', 'media'),
                'estado': estado,
                'opciones_count': len(opciones)
            })
            
    return Response({
        "stats": stats,
        "errores": errores,
        "preview": preview,
        "area_id": area.id
    })

@api_view(['POST'])
@permission_classes([IsAuthenticated, IsContentAdmin])
def confirm_import_api(request):
    """
    Importa efectivamente las preguntas ignorando duplicadas o con error (opcional).
    """
    try:
        data = json.loads(request.FILES['file'].read())
        ignorar_duplicadas = request.POST.get('ignorar_duplicadas', 'true') == 'true'
    except Exception as e:
        return Response({"error": "Formato de archivo inválido."}, status=400)
    
    area = Area.objects.get(nombre__iexact=data.get('nombre'))
    preguntas_existentes = set(Pregunta.objects.filter(area=area).values_list('enunciado', flat=True))
    
    importadas = 0
    ignoradas = 0
    
    contextos = data.get('contextos', [])
    for ctx_data in contextos:
        preguntas_validas_en_ctx = []
        for preg_data in ctx_data.get('preguntas', []):
            enunciado = preg_data.get('enunciado')
            if not enunciado or (ignorar_duplicadas and enunciado in preguntas_existentes):
                ignoradas += 1
                continue
                
            opciones = preg_data.get('opciones', [])
            if len(opciones) < 2 or sum(1 for o in opciones if o.get('es_correcta')) != 1:
                ignoradas += 1
                continue
                
            preguntas_validas_en_ctx.append(preg_data)
            
        if not preguntas_validas_en_ctx:
            continue
            
        # Crear contexto
        contexto = None
        if ctx_data.get('contexto') or ctx_data.get('archivo'):
            contexto = Contexto.objects.create(
                area=area,
                tipo=ctx_data.get('tipo', 'texto'),
                contenido=ctx_data.get('contexto', ''),
            )
            # Manejo de archivo omitido por simplicidad de JSON, pero se podria descargar
        
        for preg_data in preguntas_validas_en_ctx:
            nueva_pregunta = Pregunta.objects.create(
                area=area,
                contexto=contexto,
                enunciado=preg_data.get('enunciado'),
                tipo=preg_data.get('tipo', 'seleccion_unica'),
                dificultad=preg_data.get('dificultad', 'media'),
                competencia=preg_data.get('competencia', 'interpretar')
            )
            
            for opc_idx, opc_data in enumerate(preg_data.get('opciones', [])):
                OpcionRespuesta.objects.create(
                    pregunta=nueva_pregunta,
                    texto=opc_data.get('texto'),
                    es_correcta=opc_data.get('es_correcta', False),
                    orden=opc_idx + 1
                )
            importadas += 1
            preguntas_existentes.add(nueva_pregunta.enunciado)
            
    return Response({
        "status": "success",
        "importadas": importadas,
        "ignoradas": ignoradas
    })

from django.db.models import Count
@api_view(['GET'])
@permission_classes([IsAuthenticated, IsContentAdmin])
def db_stats_api(request):
    """
    Retorna la cantidad de preguntas en la base de datos agrupadas por área.
    """
    areas = Area.objects.annotate(total_preguntas=Count('preguntas')).values('id', 'nombre', 'total_preguntas')
    total = sum(a['total_preguntas'] for a in areas)
    
    return Response({
        "total": total,
        "areas": list(areas)
    })

