from rest_framework import serializers

from .models import Area, SubArea, Pregunta, OpcionRespuesta, Contexto


class OpcionRespuestaSerializer(serializers.ModelSerializer):
    class Meta:
        model = OpcionRespuesta
        fields = ['id', 'texto', 'es_correcta']

class OpcionRespuestaBlindSerializer(serializers.ModelSerializer):
    class Meta:
        model = OpcionRespuesta
        fields = ['id', 'texto']

class ContextoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Contexto
        fields = [
            'id',
            'tipo',
            'contenido',
            'archivo'
        ]

class PreguntaSerializer(serializers.ModelSerializer):
    opciones = OpcionRespuestaSerializer(many=True, read_only=True)
    contexto = ContextoSerializer(read_only=True)
    area_nombre = serializers.ReadOnlyField(source='area.nombre')
    subarea_nombre = serializers.ReadOnlyField(source='subarea.nombre')

    class Meta:
        model = Pregunta
        fields = [
            'id',
            'area_nombre',
            'subarea_nombre',
            'enunciado',
            'tipo',
            'dificultad',
            'imagen_url',
            'contexto',
            'opciones',
            'explicacion'
        ]


class PreguntaBlindSerializer(serializers.ModelSerializer):
    opciones = OpcionRespuestaBlindSerializer(many=True, read_only=True)
    contexto = ContextoSerializer(read_only=True)
    area_nombre = serializers.ReadOnlyField(source='area.nombre')
    subarea_nombre = serializers.ReadOnlyField(source='subarea.nombre')

    class Meta:
        model = Pregunta
        fields = [
            'id',
            'area_nombre',
            'subarea_nombre',
            'enunciado',
            'tipo',
            'dificultad',
            'imagen_url',
            'contexto',
            'opciones'
        ]

class SubAreaSerializer(serializers.ModelSerializer):
    class Meta:
        model = SubArea
        fields = ['id', 'nombre']

class AreaSerializer(serializers.ModelSerializer):
    subareas = SubAreaSerializer(many=True, read_only=True)
    class Meta:
        model = Area
        fields = ['id', 'nombre', 'descripcion', 'subareas']


# Serializers para crear preguntas (solo docentes)
class OpcionRespuestaCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = OpcionRespuesta
        fields = ['texto', 'es_correcta', 'orden']


class ContextoCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Contexto
        fields = ['tipo', 'titulo', 'contenido', 'archivo', 'url_externa']


class PreguntaCreateSerializer(serializers.ModelSerializer):
    opciones = OpcionRespuestaCreateSerializer(many=True)
    contexto_data = ContextoCreateSerializer(required=False, allow_null=True)
    
    class Meta:
        model = Pregunta
        fields = [
            'area',
            'subarea',
            'enunciado',
            'tipo',
            'dificultad',
            'competencia',
            'explicacion',
            'imagen_url',
            'opciones',
            'contexto_data'
        ]
    
    def validate_opciones(self, value):
        """Validar que haya al menos 2 opciones y una sea correcta"""
        if len(value) < 2:
            raise serializers.ValidationError("Debe haber al menos 2 opciones")
        
        correctas = sum(1 for opcion in value if opcion.get('es_correcta', False))
        if correctas == 0:
            raise serializers.ValidationError("Debe haber al menos una opción correcta")
        if correctas > 1:
            raise serializers.ValidationError("Solo puede haber una opción correcta")
        
        return value
    
    def create(self, validated_data):
        opciones_data = validated_data.pop('opciones')
        contexto_data = validated_data.pop('contexto_data', None)
        
        # Crear contexto si existe
        contexto = None
        if contexto_data:
            contexto = Contexto.objects.create(
                area=validated_data['area'],
                **contexto_data
            )
            validated_data['contexto'] = contexto
        
        # Crear la pregunta
        pregunta = Pregunta.objects.create(**validated_data)
        
        # Crear las opciones
        for opcion_data in opciones_data:
            OpcionRespuesta.objects.create(pregunta=pregunta, **opcion_data)
        
        return pregunta

