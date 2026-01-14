from django.core.management.base import BaseCommand
from apps.preguntas.models import Area, SubArea, Pregunta, OpcionRespuesta
import random

class Command(BaseCommand):
    help = 'Seeds the database with initial Areas, Subareas, and Questions'

    def handle(self, *args, **options):
        self.stdout.write('Seeding data...')

        estandar_icfes = {
            "Matemáticas": ["Álgebra y Cálculo", "Geometría", "Estadística"],
            "Lectura Crítica": ["Textos Continuos", "Textos Discontinuos"],
            "Ciencias Naturales": ["Biología", "Química", "Física", "Ciencia, Tecnología y Sociedad"],
            "Sociales y Ciudadanas": ["Pensamiento Social", "Interpretación y Análisis", "Pensamiento Reflexivo"],
            "Inglés": ["Parte 1 (Avisos)", "Parte 2 (Relación)", "Parte 3 (Conversación)", "Parte 4 (Gramática)", "Parte 5 (Comprensión)", "Parte 6 (Textos)", "Parte 7 (Deducción)"]
        }

        for area_nombre, subareas_list in estandar_icfes.items():
            area, created = Area.objects.get_or_create(nombre=area_nombre)
            if created:
                self.stdout.write(f'Created Area: {area_nombre}')
            
            for sub_nombre in subareas_list:
                subarea, created = SubArea.objects.get_or_create(area=area, nombre=sub_nombre)
                if created:
                   self.stdout.write(f'  Created SubArea: {sub_nombre}')
                
                # Check if questions exist, if not create dummy ones
                if subarea.preguntas.count() < 5:
                    self.create_dummy_questions(subarea)

        self.stdout.write(self.style.SUCCESS('Successfully seeded database'))

    def create_dummy_questions(self, subarea):
        for i in range(5):
            p = Pregunta.objects.create(
                subarea=subarea,
                enunciado=f"Pregunta de prueba #{i+1} para {subarea.nombre}. ¿Cuál es la opción correcta?",
                tipo='seleccion_multiple',
                dificultad=random.choice(['facil', 'media', 'dificil']),
                explicacion="Esta es una explicación de prueba generada automáticamente."
            )
            
            # Create 4 options
            correct_idx = random.randint(0, 3)
            for j in range(4):
                OpcionRespuesta.objects.create(
                    pregunta=p,
                    texto=f"Opción {chr(65+j)}", # A, B, C, D
                    es_correcta=(j == correct_idx)
                )
        self.stdout.write(f'    Added 5 questions to {subarea.nombre}')
