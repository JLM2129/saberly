import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.simulacros.models import Simulacro

for s in Simulacro.objects.all():
    print(f"ID: {s.id}, Q count: {s.detalles.count()}, with images: {s.detalles.filter(pregunta__contexto__isnull=False).exclude(pregunta__contexto__archivo='').count()}")
