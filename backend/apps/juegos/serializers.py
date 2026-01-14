from rest_framework import serializers
from .models import PartidaDesafio

class PartidaDesafioSerializer(serializers.ModelSerializer):
    class Meta:
        model = PartidaDesafio
        fields = [
            'id', 
            'usuario', 
            'puntaje_total', 
            'preguntas_correctas', 
            'preguntas_incorrectas', 
            'max_combo', 
            'fecha'
        ]
        read_only_fields = ['id', 'usuario', 'fecha']
