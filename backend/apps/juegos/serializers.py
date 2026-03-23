from rest_framework import serializers
from .models import PartidaDesafio, Sala, Participante

class PartidaDesafioSerializer(serializers.ModelSerializer):
    class Meta:
        model = PartidaDesafio
        fields = [
            'id', 
            'usuario', 
            'tipo_juego',
            'puntaje_total', 
            'preguntas_correctas', 
            'preguntas_incorrectas', 
            'max_combo', 
            'fecha'
        ]
        read_only_fields = ['id', 'usuario', 'fecha']

class ParticipanteSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(source='usuario.email', read_only=True)
    
    class Meta:
        model = Participante
        fields = ['id', 'email', 'puntaje', 'listo', 'respondio_actual', 'bloqueado_hasta_pregunta']

class SalaSerializer(serializers.ModelSerializer):
    participantes = ParticipanteSerializer(many=True, read_only=True)
    creador_email = serializers.EmailField(source='creador.email', read_only=True)
    
    class Meta:
        model = Sala
        fields = [
            'codigo', 'creador_email', 'num_jugadores_max', 
            'areas', 'dificultad', 'num_preguntas', 
            'estado', 'pregunta_actual_idx', 'participantes'
        ]
