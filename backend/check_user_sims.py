import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.users.models import User
from apps.simulacros.models import Simulacro

for u in User.objects.all():
    print(f"User: {u.email}, ID: {u.id}, Simulacros count: {u.simulacros.count()}")

for s in Simulacro.objects.all():
    print(f"Simulacro ID: {s.id}, Date: {s.fecha_inicio}, User: {s.usuario.email}")
