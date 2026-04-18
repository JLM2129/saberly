import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.simulacros.models import Simulacro

s = Simulacro.objects.first() # Get a recent simulation
if s:
    print(f"ID: {s.id}")
    has_img = 0
    for d in s.detalles.all():
        if d.pregunta.contexto and d.pregunta.contexto.archivo:
            has_img += 1
            print(f"  Q with context image!")
    print(f"Total questions: {s.detalles.count()}, with images: {has_img}")
else:
    print("No simulations found")
