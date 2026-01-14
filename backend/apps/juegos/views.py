import random
from rest_framework import views, status, permissions, generics
from rest_framework.response import Response
from django.db.models import Q
from .models import PartidaDesafio
from .serializers import PartidaDesafioSerializer
from apps.preguntas.models import Pregunta
from apps.preguntas.serializers import PreguntaSerializer

from django.db.models.functions import Length

class QuickQuestionsView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        # Seleccionamos preguntas que:
        # 1. No tengan contexto (contexto__isnull=True)
        # 2. O tengan un contexto de tipo texto que sea corto (< 600 chars)
        
        # Primero obtenemos las IDs que cumplen el criterio para evitar problemas de anotación compleja
        preguntas_sin_contexto = Pregunta.objects.filter(active=True, contexto__isnull=True)
        
        preguntas_con_contexto_corto = Pregunta.objects.filter(
            active=True,
            contexto__tipo='texto'
        ).annotate(
            text_len=Length('contexto__contenido')
        ).filter(text_len__lt=600)

        # Combinamos ambos querysets
        ids_validas = list(preguntas_sin_contexto.values_list('id', flat=True)) + \
                     list(preguntas_con_contexto_corto.values_list('id', flat=True))
        
        # Si no hay suficientes, simplemente tomamos cualquiera activa
        if len(ids_validas) < 5:
            preguntas_qs = Pregunta.objects.filter(active=True).order_by('?')[:40]
        else:
            preguntas_qs = Pregunta.objects.filter(id__in=ids_validas).order_by('?')[:40]

        serializer = PreguntaSerializer(preguntas_qs, many=True)
        return Response(serializer.data)


class GuardarPartidaView(generics.CreateAPIView):
    serializer_class = PartidaDesafioSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(usuario=self.request.user)

class HighScoresView(generics.ListAPIView):
    serializer_class = PartidaDesafioSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return PartidaDesafio.objects.all().order_by('-puntaje_total')[:10]
