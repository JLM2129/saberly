from django.core.management.base import BaseCommand
from apps.preguntas.models import Pregunta

class Command(BaseCommand):
    help = 'Migrates area field from subarea for existing questions'

    def handle(self, *args, **options):
        preguntas = Pregunta.objects.filter(subarea__isnull=False)
        count = 0
        
        for pregunta in preguntas:
            if pregunta.subarea:
                pregunta.area = pregunta.subarea.area
                pregunta.save(update_fields=['area'])
                count += 1
        
        self.stdout.write(
            self.style.SUCCESS(f'Successfully migrated {count} questions with area from subarea')
        )
