import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.preguntas.models import Pregunta, Contexto

print("Checking questions with imagen_url...")
qs_with_img = Pregunta.objects.exclude(imagen_url__isnull=True).exclude(imagen_url='')
print(f"Total: {qs_with_img.count()}")

print("\nChecking contexts with archivo...")
ctx_with_archivo = Contexto.objects.exclude(archivo__isnull=True).exclude(archivo='')
print(f"Total: {ctx_with_archivo.count()}")
for c in ctx_with_archivo[:10]:
    print(f"Context ID: {c.id}, archivo: {c.archivo.url if c.archivo else 'None'}")

print("\nTotal questions:", Pregunta.objects.count())
