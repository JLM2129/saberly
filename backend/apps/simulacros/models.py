from django.db import models
from django.conf import settings
from apps.preguntas.models import Pregunta, OpcionRespuesta

class Simulacro(models.Model):
    usuario = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='simulacros')
    fecha_inicio = models.DateTimeField(auto_now_add=True)
    fecha_fin = models.DateTimeField(null=True, blank=True)
    puntaje_total = models.FloatField(default=0.0) # percentage or raw score
    tiempo_usado_segundos = models.IntegerField(default=0)
    completado = models.BooleanField(default=False)

    def calcular_puntaje(self):
        total = self.detalles.count()
        if total == 0:
            return 0
        correctas = self.detalles.filter(es_correcta=True).count()
        return (correctas / total) * 100

class DetalleSimulacro(models.Model):
    simulacro = models.ForeignKey(Simulacro, related_name='detalles', on_delete=models.CASCADE)
    pregunta = models.ForeignKey(Pregunta, on_delete=models.CASCADE)
    opcion_seleccionada = models.ForeignKey(OpcionRespuesta, null=True, blank=True, on_delete=models.SET_NULL)
    es_correcta = models.BooleanField(default=False)
