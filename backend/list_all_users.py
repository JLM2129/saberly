import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.users.models import User

for u in User.objects.all():
    print(f"Email: {u.email}, ID: {u.id}")
