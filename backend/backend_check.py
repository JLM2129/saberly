import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

try:
    django.setup()
except Exception as e:
    print(f"⚠️ Error en la configuración de Django: {e}")

from apps.preguntas.models import Area, Pregunta

print("🔍 VERIFICANDO ESTADO DE LA BASE DE DATOS...\n")

try:
    areas = Area.objects.all()
    if not areas.exists():
        print("⚠️ La base de datos está conectada pero no contiene ningún Área registrada.")
    else:
        print("📊 RESUMEN DE BASE DE DATOS:")
        for a in areas:
            total = Pregunta.objects.filter(area=a).count()
            con_imagen = Pregunta.objects.filter(area=a, contexto__archivo__isnull=False).exclude(contexto__archivo='').count()
            con_imagen_directa = Pregunta.objects.filter(area=a, imagen_url__isnull=False).exclude(imagen_url='').count()
            print(f"  • Materia: {a.nombre:25} | Total preguntas: {total:4} | Con imágenes (contexto): {con_imagen:3} | Con imágenes (directa): {con_imagen_directa:3}")
except Exception as e:
    print(f"❌ Error al consultar la Base de Datos:\n   {e}\n")
    print("💡 Sugerencias de solución:")
    print("   1. Si usas PostgreSQL local o Docker: Asegúrate de que PostgreSQL / Docker esté encendido en puerto 5432.")
    print("   2. Si usas SQLite local: Ejecuta 'python manage.py migrate' para crear las tablas en db.sqlite3.")
