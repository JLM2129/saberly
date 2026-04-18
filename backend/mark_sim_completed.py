import os
import django
from django.utils import timezone

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.simulacros.models import Simulacro

s = Simulacro.objects.filter(id=8).first()
if s:
    s.completado = True
    s.puntaje_total = 100
    s.fecha_fin = timezone.now()
    s.save()
    print(f"DONE: Simulation {s.id} marked as completed.")
else:
    print("NOT FOUND: Simulation 8")
