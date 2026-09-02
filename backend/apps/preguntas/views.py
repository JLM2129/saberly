import os
import json
import zipfile
import shutil
import uuid
from pathlib import Path
from django.conf import settings

from rest_framework import viewsets, permissions, status
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.permissions import IsAdminUser, IsAuthenticated
from rest_framework.response import Response

from .models import Area, Pregunta, SubArea, Contexto, OpcionRespuesta
from .serializers import AreaSerializer, PreguntaSerializer, PreguntaCreateSerializer
from .pagination import PreguntasPagination

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
    queryset = Pregunta.objects.filter(active=True).select_related(
        'contexto', 'area', 'subarea__area'
    )

    serializer_class = PreguntaSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        queryset = super().get_queryset()
        area_id = self.request.query_params.get('area_id')
        if area_id:
            # Se filtra por el área propia de la pregunta, no por la de su
            # subárea: subarea es opcional y queda en NULL en todo lo que crean
            # el panel docente y el importador masivo.
            queryset = queryset.filter(area_id=area_id)
        return queryset


class TeacherPreguntaViewSet(viewsets.ModelViewSet):
    """
    ViewSet para que los docentes puedan crear, editar y eliminar preguntas
    """
    queryset = Pregunta.objects.all().select_related('contexto', 'area', 'subarea').prefetch_related('opciones')
    permission_classes = [IsAuthenticated, IsTeacher]
    pagination_class = PreguntasPagination

    def get_queryset(self):
        queryset = super().get_queryset()

        area_id = self.request.query_params.get('area_id')
        if area_id:
            queryset = queryset.filter(area_id=area_id)

        # La búsqueda tiene que resolverse en el servidor: con la lista paginada,
        # filtrar en el cliente solo alcanzaría a la página visible.
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(enunciado__icontains=search)

        return queryset
    
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
        response_serializer = PreguntaSerializer(pregunta, context=self.get_serializer_context())
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
            serializer = PreguntaSerializer(page, many=True, context=self.get_serializer_context())
            return self.get_paginated_response(serializer.data)
        
        serializer = PreguntaSerializer(preguntas, many=True, context=self.get_serializer_context())
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


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def upload_image_api(request):
    """
    Permite a docentes o admins subir una imagen al servidor (media/imagenes/).
    """
    if not (request.user.is_teacher or request.user.is_content_admin or request.user.is_staff):
        return Response({"error": "No tienes permisos para subir imágenes."}, status=status.HTTP_403_FORBIDDEN)
    
    file_obj = request.FILES.get('image') or request.FILES.get('archivo') or request.FILES.get('file')
    if not file_obj:
        return Response({"error": "No se recibió ningún archivo de imagen."}, status=status.HTTP_400_BAD_REQUEST)
    
    ext = os.path.splitext(file_obj.name)[1].lower()
    valid_extensions = ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg']
    if ext not in valid_extensions:
        return Response({"error": f"Formato de archivo no permitido ({ext}). Formatos aceptados: {', '.join(valid_extensions)}"}, status=status.HTTP_400_BAD_REQUEST)
    
    safe_filename = f"{uuid.uuid4().hex[:12]}_{os.path.basename(file_obj.name)}"
    media_img_dir = Path(settings.MEDIA_ROOT) / "imagenes"
    media_img_dir.mkdir(parents=True, exist_ok=True)
    dest_path = media_img_dir / safe_filename
    
    with open(dest_path, 'wb+') as destination:
        for chunk in file_obj.chunks():
            destination.write(chunk)
            
    relative_path = f"imagenes/{safe_filename}"
    url = f"/media/{relative_path}"
    
    return Response({
        "status": "success",
        "url": url,
        "relative_path": relative_path,
        "filename": safe_filename
    })


def process_uploaded_file(uploaded_file, extract_images=False):
    """
    Soporta archivos .json y .zip. Si es .zip, extrae el JSON principal
    y opcionalmente extrae imágenes a MEDIA_ROOT/imagenes.
    """
    filename = uploaded_file.name.lower()
    imagenes_copiadas = 0

    if filename.endswith('.zip'):
        with zipfile.ZipFile(uploaded_file, 'r') as zip_ref:
            file_list = zip_ref.namelist()
            json_files = [f for f in file_list if f.endswith('.json') and not os.path.basename(f).startswith('.')]
            if not json_files:
                raise ValueError("El archivo ZIP no contiene ningún archivo .json válido.")
            
            main_json_name = json_files[0]
            json_content = zip_ref.read(main_json_name)
            data = json.loads(json_content.decode('utf-8'))

            if extract_images:
                media_img_dir = Path(settings.MEDIA_ROOT) / "imagenes"
                media_img_dir.mkdir(parents=True, exist_ok=True)

                for member in file_list:
                    if os.path.basename(member).startswith('.') or member.endswith('/'):
                        continue
                    ext = os.path.splitext(member)[1].lower()
                    if ext in ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp']:
                        target_filename = os.path.basename(member)
                        if target_filename:
                            dest_path = media_img_dir / target_filename
                            with zip_ref.open(member) as source_file, open(dest_path, 'wb') as target_file:
                                shutil.copyfileobj(source_file, target_file)
                            imagenes_copiadas += 1
        return data, imagenes_copiadas
    else:
        content = uploaded_file.read().decode('utf-8')
        data = json.loads(content)
        return data, 0


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsContentAdmin])
def validate_import_api(request):
    """
    Valida un archivo JSON o ZIP con preguntas y retorna errores, duplicados y preview.
    """
    if 'file' not in request.FILES:
        return Response({"error": "No se envió ningún archivo."}, status=400)

    try:
        data, _ = process_uploaded_file(request.FILES['file'], extract_images=False)
    except Exception as e:
        return Response({"error": f"Formato de archivo inválido: {str(e)}"}, status=400)
    
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


def normalize_archivo_path(archivo_raw):
    if not archivo_raw or not isinstance(archivo_raw, str):
        return None

    archivo = archivo_raw.strip()
    if not archivo:
        return None

    if archivo.startswith('http://') or archivo.startswith('https://') or archivo.startswith('data:'):
        return archivo

    if archivo.startswith('/'):
        archivo = archivo.lstrip('/')
    if archivo.startswith('media/'):
        archivo = archivo[len('media/'):]
    if not archivo.startswith('imagenes/'):
        archivo = f'imagenes/{archivo}'

    return archivo


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsContentAdmin])
def confirm_import_api(request):
    """
    Importa efectivamente las preguntas e imágenes del archivo JSON o ZIP.
    """
    if 'file' not in request.FILES:
        return Response({"error": "No se envió ningún archivo."}, status=400)

    try:
        data, imagenes_copiadas = process_uploaded_file(request.FILES['file'], extract_images=True)
        ignorar_duplicadas = request.POST.get('ignorar_duplicadas', 'true') == 'true'
    except Exception as e:
        return Response({"error": f"Formato de archivo inválido: {str(e)}"}, status=400)
    
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
        archivo_raw = ctx_data.get('archivo') or ctx_data.get('imagen')
        url_ext = ctx_data.get('url_externa')
        if ctx_data.get('contexto') or archivo_raw or url_ext:
            archivo_normalizado = normalize_archivo_path(archivo_raw)
            contexto = Contexto.objects.create(
                area=area,
                tipo=ctx_data.get('tipo', 'texto'),
                contenido=ctx_data.get('contexto', ''),
                archivo=archivo_normalizado,
                url_externa=url_ext
            )
        
        for preg_data in preguntas_validas_en_ctx:
            imagen_url_raw = preg_data.get('imagen_url') or preg_data.get('imagen')
            imagen_url_norm = normalize_archivo_path(imagen_url_raw) if imagen_url_raw else None

            nueva_pregunta = Pregunta.objects.create(
                area=area,
                contexto=contexto,
                enunciado=preg_data.get('enunciado'),
                tipo=preg_data.get('tipo', 'seleccion_unica'),
                dificultad=preg_data.get('dificultad', 'media'),
                competencia=preg_data.get('competencia', 'interpretar'),
                explicacion=preg_data.get('explicacion', ''),
                imagen_url=imagen_url_norm
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
        "ignoradas": ignoradas,
        "imagenes_extraidas": imagenes_copiadas
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


