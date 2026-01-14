from django.core.management.base import BaseCommand
from apps.preguntas.models import Pregunta, OpcionRespuesta

class Command(BaseCommand):
    help = 'Deletes all questions from database'

    def handle(self, *args, **options):
        # Count before deletion
        count = Pregunta.objects.count()
        
        # Delete all questions (cascades to options)
        Pregunta.objects.all().delete()
        
        self.stdout.write(self.style.SUCCESS(f'Successfully deleted {count} questions from database.'))
