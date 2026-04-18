import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.preguntas.models import Contexto

ctx = Contexto.objects.exclude(archivo__isnull=True).exclude(archivo='').first()
if ctx:
    print(f"ID: {ctx.id}")
    print(f"Archivo (raw): {ctx.archivo.name}")
    print(f"Archivo (url): {ctx.archivo.url}")
else:
    print("No contexts with archivo found")
