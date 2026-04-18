import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.simulacros.models import Simulacro

for s in Simulacro.objects.all():
    print(f"ID: {s.id}, Completado: {s.completado}, Q count: {s.detalles.count()}")
