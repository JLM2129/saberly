import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.preguntas.models import Contexto, Pregunta

ctx_with_archivo = Contexto.objects.exclude(archivo__isnull=True).exclude(archivo='')
total_questions_with_img_context = Pregunta.objects.filter(contexto__in=ctx_with_archivo).count()

print(f"Questions linked to a context with image: {total_questions_with_img_context}")
print(f"Total questions: {Pregunta.objects.count()}")

for c in ctx_with_archivo:
    p_count = Pregunta.objects.filter(contexto=c).count()
    print(f"Context {c.id} ({c.archivo}): {p_count} questions")
