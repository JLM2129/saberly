import random
from django.db import transaction
from rest_framework import views, status, permissions, generics
from rest_framework.response import Response
from django.db.models import Q
from .models import PartidaDesafio, Sala, Participante
from .serializers import PartidaDesafioSerializer, SalaSerializer
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


class MillionaireQuestionsView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        # 15 niveles: 5 fáciles, 5 medias, 5 difíciles
        faciles = Pregunta.objects.filter(active=True, dificultad='facil').order_by('?')[:5]
        medias = Pregunta.objects.filter(active=True, dificultad='media').order_by('?')[:5]
        dificiles = Pregunta.objects.filter(active=True, dificultad='dificil').order_by('?')[:5]
        
        # Combinamos en orden de dificultad
        final_qs = list(faciles) + list(medias) + list(dificiles)
        
        # Si por alguna razón no hay suficientes en una categoría, rellenamos con cualquiera
        if len(final_qs) < 15:
            faltantes = 15 - len(final_qs)
            extra = Pregunta.objects.exclude(id__in=[p.id for p in final_qs]).order_by('?')[:faltantes]
            final_qs.extend(list(extra))
            
        serializer = PreguntaSerializer(final_qs, many=True)
        return Response(serializer.data)

class StreakQuestionsView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        # Modo racha: Mandamos un pool grande de preguntas (50 por ej)
        preguntas = Pregunta.objects.filter(active=True).order_by('?')[:50]
        serializer = PreguntaSerializer(preguntas, many=True)
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

class MisPartidasView(generics.ListAPIView):
    serializer_class = PartidaDesafioSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return PartidaDesafio.objects.filter(usuario=self.request.user).order_by('-fecha')

# --- MULTIPLAYER VIEWS ---
import random
import string
from apps.preguntas.models import Pregunta

class CrearSalaView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        # Configuración desde el frontend
        data = request.data
        codigo = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
        
        # Seleccionar preguntas según config
        preguntas_qs = Pregunta.objects.filter(active=True)
        if data.get('areas'):
            preguntas_qs = preguntas_qs.filter(area__nombre__in=data.get('areas'))
        if data.get('dificultad'):
            preguntas_qs = preguntas_qs.filter(dificultad=data.get('dificultad'))
        
        preguntas_ids = list(preguntas_qs.order_by('?')[:data.get('num_preguntas', 10)].values_list('id', flat=True))
        
        if not preguntas_ids:
            return Response({"error": "No hay preguntas con esos criterios"}, status=400)

        sala = Sala.objects.create(
            codigo=codigo,
            creador=request.user,
            num_jugadores_max=data.get('num_jugadores_max', 4),
            areas=data.get('areas', []),
            dificultad=data.get('dificultad', 'media'),
            num_preguntas=len(preguntas_ids),
            preguntas_ids=preguntas_ids
        )
        # El creador entra automáticamente
        Participante.objects.create(sala=sala, usuario=request.user, listo=True)
        
        return Response(SalaSerializer(sala).data)

class UnirseSalaView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        codigo = request.data.get('codigo', '').upper()
        try:
            sala = Sala.objects.get(codigo=codigo)
            if sala.estado != 'LOBBY':
                return Response({"error": "La partida ya inició"}, status=400)
            if sala.participantes.count() >= sala.num_jugadores_max:
                return Response({"error": "Sala llena"}, status=400)
            
            Participante.objects.get_or_create(sala=sala, usuario=request.user)
            return Response(SalaSerializer(sala).data)
        except Sala.DoesNotExist:
            return Response({"error": "Sala no encontrada"}, status=404)

class SalaStatusView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    @transaction.atomic
    def get(self, request, codigo):
        try:
            # Seleccionar con bloqueo para evitar que varios hilos avancen la pregunta a la vez
            sala = Sala.objects.select_for_update().get(codigo=codigo.upper())
            
            # Auto-skip logic: Si el juego está PLAYING y ya nadie puede responder la 
            # pregunta actual (están penalizados o ya respondieron), avanzamos.
            if sala.estado == 'PLAYING':
                while sala.estado == 'PLAYING':
                    current_idx = sala.pregunta_actual_idx
                    quedan_activos = sala.participantes.filter(
                        respondio_actual=False,
                        bloqueado_hasta_pregunta__lt=current_idx
                    ).exists()
                    
                    if not quedan_activos:
                        if sala.pregunta_actual_idx < sala.num_preguntas - 1:
                            sala.pregunta_actual_idx += 1
                            sala.participantes.update(respondio_actual=False)
                        else:
                            sala.estado = 'FINISHED'
                            # Guardar estadísticas
                            for p in sala.participantes.all():
                                PartidaDesafio.objects.get_or_create(
                                    usuario=p.usuario,
                                    tipo_juego='multi',
                                    puntaje_total=p.puntaje,
                                    defaults={'preguntas_correctas': p.puntaje // 100}
                                )
                            sala.save()
                            break
                        sala.save()
                    else:
                        break # Hay jugadores que pueden participar

            data = SalaSerializer(sala).data
            if sala.estado == 'PLAYING':
                pregunta_id = sala.preguntas_ids[sala.pregunta_actual_idx]
                pregunta = Pregunta.objects.get(id=pregunta_id)
                data['pregunta_actual'] = PreguntaSerializer(pregunta).data
            return Response(data)
        except Sala.DoesNotExist:
            return Response({"error": "Sala no encontrada"}, status=404)

class IniciarJuegoView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, codigo):
        sala = Sala.objects.get(codigo=codigo.upper())
        if sala.creador != request.user:
            return Response({"error": "Solo el creador puede iniciar"}, status=403)
        
        sala.estado = 'PLAYING'
        sala.save()
        return Response({"status": "Iniciado"})

class ResponderMultijugadorView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    @transaction.atomic
    def post(self, request, codigo):
        # Lógica de Buzzer / Respuesta rápida
        # El primero que responda CORRECTAMENTE gana 100 pts y se pasa a la siguiente
        # Si alguien responde INCORRECTAMENTE, se le bloquea una pregunta y los demás siguen jugando esa misma
        sala = Sala.objects.select_for_update().get(codigo=codigo.upper())
        participante = Participante.objects.get(sala=sala, usuario=request.user)
        
        if participante.respondio_actual:
            return Response({"error": "Ya respondiste"}, status=400)
        
        current_idx = sala.pregunta_actual_idx
        if participante.bloqueado_hasta_pregunta >= current_idx:
             return Response({"error": "Estás penalizado"}, status=400)

        es_correcta = request.data.get('es_correcta', False)
        
        if es_correcta:
            participante.puntaje += 100
            participante.save()
            # Mover a la siguiente pregunta para TODOS
            if sala.pregunta_actual_idx < sala.num_preguntas - 1:
                sala.pregunta_actual_idx += 1
                # Limpiar flags de respuesta para todos
                sala.participantes.update(respondio_actual=False)
            else:
                sala.estado = 'FINISHED'
                # --- NUEVO: Guardar en el historial global al finalizar ---
                for p in sala.participantes.all():
                    PartidaDesafio.objects.create(
                        usuario=p.usuario,
                        tipo_juego='multi',
                        puntaje_total=p.puntaje,
                        preguntas_correctas=p.puntaje // 100, # Estimado de correctas
                        preguntas_incorrectas=0, # No tenemos el tracking exacto por participante aquí
                        max_combo=0
                    )
            sala.save()
            return Response({"status": "Ganaste el punto"})
        else:
            # Penalizar
            participante.respondio_actual = True
            participante.bloqueado_hasta_pregunta = current_idx + 1
            participante.save()
            
            # Verificar si quedan jugadores que puedan responder
            # Un jugador puede responder si: no ha respondido esta vdd Y no está penalizado de la anterior
            quedan_activos = sala.participantes.filter(
                respondio_actual=False,
                bloqueado_hasta_pregunta__lt=current_idx
            ).exists()

            if not quedan_activos:
                if sala.pregunta_actual_idx < sala.num_preguntas - 1:
                    sala.pregunta_actual_idx += 1
                    sala.participantes.update(respondio_actual=False)
                else:
                    sala.estado = 'FINISHED'
                    # Guardar estadisticas al finalizar (duplicado por seguridad si todos fallan la ultima)
                    for p in sala.participantes.all():
                        PartidaDesafio.objects.get_or_create(
                            usuario=p.usuario,
                            tipo_juego='multi',
                            puntaje_total=p.puntaje,
                            defaults={'preguntas_correctas': p.puntaje // 100}
                        )
                sala.save()
                return Response({"status": "Nadie más puede responder, siguiente pregunta"})
            
            return Response({"status": "Fallaste, estás bloqueado por una pregunta"})
