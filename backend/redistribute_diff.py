import os
import django
import random

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.preguntas.models import Pregunta

def redistribute_difficulty():
    qs = list(Pregunta.objects.all())
    random.shuffle(qs)
    n = len(qs)
    for i, p in enumerate(qs):
        if i < n * 0.3:
            p.dificultad = 'facil'
        elif i < n * 0.8:
            p.dificultad = 'media'
        else:
            p.dificultad = 'dificil'
        p.save()
    print(f"Redistribuidas {n} preguntas.")

if __name__ == '__main__':
    redistribute_difficulty()
