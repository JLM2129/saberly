from django.db import models
from django.conf import settings

class PartidaDesafio(models.Model):
    TIPO_JUEGO_CHOICES = [
        ('quick', 'Desafío Rápido'),
        ('millionaire', 'Sabio Millonario'),
        ('bomb', 'Bomba de Tiempo'),
        ('streak', 'Racha Imbatible'),
        ('multi', 'Duelo Multijugador'),
    ]
    
    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name='partidas_desafio'
    )
    tipo_juego = models.CharField(max_length=20, choices=TIPO_JUEGO_CHOICES, default='quick')
    puntaje_total = models.IntegerField(default=0)
    preguntas_correctas = models.IntegerField(default=0)
    preguntas_incorrectas = models.IntegerField(default=0)
    max_combo = models.IntegerField(default=0)
    fecha = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-puntaje_total', '-fecha']
        verbose_name = 'Partida de Desafío'
        verbose_name_plural = 'Partidas de Desafío'

    def __str__(self):
        return f"{self.usuario.email} - {self.puntaje_total} pts"

class Sala(models.Model):
    ESTADOS = [
        ('LOBBY', 'En Espera'),
        ('PLAYING', 'Jugando'),
        ('FINISHED', 'Finalizado'),
    ]
    
    codigo = models.CharField(max_length=6, unique=True)
    creador = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='salas_creadas')
    num_jugadores_max = models.IntegerField(default=4)
    areas = models.JSONField(default=list) # Lista de nombres de áreas
    dificultad = models.CharField(max_length=20, default='media')
    num_preguntas = models.IntegerField(default=10)
    
    estado = models.CharField(max_length=20, choices=ESTADOS, default='LOBBY')
    pregunta_actual_idx = models.IntegerField(default=0)
    preguntas_ids = models.JSONField(default=list) # Lista de IDs de preguntas seleccionadas
    
    fecha_creacion = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Sala {self.codigo} ({self.estado})"

class Participante(models.Model):
    sala = models.ForeignKey(Sala, on_delete=models.CASCADE, related_name='participantes')
    usuario = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    puntaje = models.IntegerField(default=0)
    listo = models.BooleanField(default=False)
    respondio_actual = models.BooleanField(default=False)
    bloqueado_hasta_pregunta = models.IntegerField(default=-1) # Penalización
    
    class Meta:
        unique_together = ('sala', 'usuario')

    def __str__(self):
        return f"{self.usuario.email} en {self.sala.codigo}"
