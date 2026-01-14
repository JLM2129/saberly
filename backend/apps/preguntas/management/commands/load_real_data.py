import json
import os
from django.core.management.base import BaseCommand
from django.conf import settings
from apps.preguntas.models import Area, SubArea, Pregunta, OpcionRespuesta

class Command(BaseCommand):
    help = 'Loads real ICFES questions from a JSON fixture'

    def add_arguments(self, parser):
        parser.add_argument(
            '--multiplier',
            type=int,
            default=1,
            help='Number of times to duplicate questions to increase DB size (default: 1)'
        )
    
    def handle(self, *args, **options):
        multiplier = options['multiplier']
        self.stdout.write(f'Loading real data with multiplier x{multiplier}...')

        file_path = os.path.join(settings.BASE_DIR, 'apps/preguntas/fixtures/icfes_real_questions.json')
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
        except FileNotFoundError:
            self.stdout.write(self.style.ERROR(f'File not found: {file_path}'))
            return

        count = 0
        for i in range(multiplier):
            for item in data:
                # Get Area and SubArea
                area, _ = Area.objects.get_or_create(nombre=item['area'])
                subarea, _ = SubArea.objects.get_or_create(area=area, nombre=item['subarea'])

                # Create Question
                # If multiplier > 1, we append a suffix to make it unique-ish or just same
                suffix = f" (Copia {i+1})" if i > 0 else ""
                
                p = Pregunta.objects.create(
                    subarea=subarea,
                    enunciado=item['enunciado'] + suffix,
                    tipo=item['tipo'],
                    dificultad=item['dificultad'],
                    explicacion=item['explicacion']
                )

                # Create Options
                for opt in item['opciones']:
                    OpcionRespuesta.objects.create(
                        pregunta=p,
                        texto=opt['texto'],
                        es_correcta=opt['es_correcta']
                    )
                count += 1
        
        self.stdout.write(self.style.SUCCESS(f'Successfully loaded {count} questions!'))
