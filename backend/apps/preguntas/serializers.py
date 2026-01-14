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



