import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.preguntas.models import Area, Pregunta

areas = Area.objects.all()
print("RESUMEN DE BASE DE DATOS:")
for a in areas:
    total = Pregunta.objects.filter(area=a).count()
    con_imagen = Pregunta.objects.filter(area=a, contexto__archivo__isnull=False).exclude(contexto__archivo='').count()
    con_imagen_directa = Pregunta.objects.filter(area=a, imagen_url__isnull=False).exclude(imagen_url='').count()
    print(f"Materia: {a.nombre} | Total preguntas: {total} | Con imagenes (contexto): {con_imagen} | Con imagenes (directa): {con_imagen_directa}")
