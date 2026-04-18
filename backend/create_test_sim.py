import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.users.models import User
from apps.preguntas.models import Contexto, Pregunta
from apps.simulacros.models import Simulacro, DetalleSimulacro

user = User.objects.filter(email='docente@test.com').first() or User.objects.first()
if not user:
    print("No users found")
    exit()

print(f"Using user: {user.email}")

ctx_with_archivo = Contexto.objects.exclude(archivo__isnull=True).exclude(archivo='')
preguntas_con_img = Pregunta.objects.filter(contexto__in=ctx_with_archivo)

print(f"Found {preguntas_con_img.count()} questions with images.")

if preguntas_con_img.exists():
    s = Simulacro.objects.create(usuario=user)
    detalles = [DetalleSimulacro(simulacro=s, pregunta=p) for p in preguntas_con_img]
    DetalleSimulacro.objects.bulk_create(detalles)
    print(f"Created TEST simulation ID: {s.id} with {s.detalles.count()} questions.")
else:
    print("No questions with images available to test.")
