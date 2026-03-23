"""
Script para activar usuarios como docentes.
Uso:
    python make_teacher.py
"""
import os
import sys
import django

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.users.models import User


def make_teacher():
    """Convierte un usuario en docente"""
    print("=" * 50)
    print("CONVERTIR USUARIO EN DOCENTE")
    print("=" * 50)
    
    email = input("\nIngrese el email del usuario: ").strip()
    
    if not email:
        print("❌ El email no puede estar vacío")
        return
    
    try:
        user = User.objects.get(email=email)
        
        if user.is_teacher:
            print(f"\n⚠️  {user.email} ya es docente")
            return
        
        user.is_teacher = True
        user.save()
        
        print(f"\n✅ ¡{user.email} ahora es docente!")
        print(f"   - Nombre: {user.full_name or 'No especificado'}")
        print(f"   - Email: {user.email}")
        print(f"   - Es docente: {user.is_teacher}")
        
    except User.DoesNotExist:
        print(f"\n❌ No existe usuario con email '{email}'")
        print("\nUsuarios disponibles:")
        users = User.objects.all()
        if users.exists():
            for u in users:
                status = "🎓 Docente" if u.is_teacher else "👤 Estudiante"
                print(f"   {status} - {u.email}")
        else:
            print("   No hay usuarios registrados")


def remove_teacher():
    """Remueve permisos de docente de un usuario"""
    print("=" * 50)
    print("REMOVER PERMISOS DE DOCENTE")
    print("=" * 50)
    
    email = input("\nIngrese el email del usuario: ").strip()
    
    if not email:
        print("❌ El email no puede estar vacío")
        return
    
    try:
        user = User.objects.get(email=email)
        
        if not user.is_teacher:
            print(f"\n⚠️  {user.email} no es docente")
            return
        
        user.is_teacher = False
        user.save()
        
        print(f"\n✅ Permisos de docente removidos de {user.email}")
        
    except User.DoesNotExist:
        print(f"\n❌ No existe usuario con email '{email}'")


def list_teachers():
    """Lista todos los docentes"""
    print("=" * 50)
    print("LISTA DE DOCENTES")
    print("=" * 50)
    
    teachers = User.objects.filter(is_teacher=True)
    
    if not teachers.exists():
        print("\n⚠️  No hay docentes registrados")
        return
    
    print(f"\nTotal de docentes: {teachers.count()}\n")
    for teacher in teachers:
        print(f"🎓 {teacher.email}")
        if teacher.full_name:
            print(f"   Nombre: {teacher.full_name}")
        print(f"   Activo: {'Sí' if teacher.is_active else 'No'}")
        print()


def list_all_users():
    """Lista todos los usuarios"""
    print("=" * 50)
    print("LISTA DE USUARIOS")
    print("=" * 50)
    
    users = User.objects.all()
    
    if not users.exists():
        print("\n⚠️  No hay usuarios registrados")
        return
    
    teachers = users.filter(is_teacher=True).count()
    students = users.filter(is_teacher=False).count()
    
    print(f"\nTotal de usuarios: {users.count()}")
    print(f"   - Docentes: {teachers}")
    print(f"   - Estudiantes: {students}\n")
    
    for user in users:
        status = "🎓 Docente" if user.is_teacher else "👤 Estudiante"
        print(f"{status} - {user.email}")
        if user.full_name:
            print(f"         Nombre: {user.full_name}")
        print()


def main():
    """Función principal con menú interactivo"""
    while True:
        print("\n" + "=" * 50)
        print("GESTIÓN DE DOCENTES")
        print("=" * 50)
        print("\n1. Convertir usuario en docente")
        print("2. Remover permisos de docente")
        print("3. Listar todos los docentes")
        print("4. Listar todos los usuarios")
        print("5. Salir")
        
        opcion = input("\nSeleccione una opción (1-5): ").strip()
        
        if opcion == '1':
            make_teacher()
        elif opcion == '2':
            remove_teacher()
        elif opcion == '3':
            list_teachers()
        elif opcion == '4':
            list_all_users()
        elif opcion == '5':
            print("\n👋 ¡Hasta luego!")
            break
        else:
            print("\n❌ Opción inválida. Por favor seleccione 1-5.")


if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n👋 Proceso interrumpido. ¡Hasta luego!")
        sys.exit(0)
