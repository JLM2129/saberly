from django.db import models
from django.conf import settings

class PartidaDesafio(models.Model):
    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name='partidas_desafio'
    )
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
