import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.users.models import User

def create_teacher():
    email = 'docente@saberly.com'
    password = 'password123'
    
    user, created = User.objects.get_or_create(
        email=email,
        defaults={
            'full_name': 'Profesor de Prueba',
            'is_teacher': True
        }
    )
    
    if created:
        user.set_password(password)
        user.save()
        print(f"✅ Usuario creado: {email}")
    else:
        user.is_teacher = True
        user.save()
        print(f"✅ Usuario actualizado como docente: {email}")
    
    print(f"📧 Email: {email}")
    print(f"🔑 Password: {password}")

if __name__ == '__main__':
    create_teacher()
