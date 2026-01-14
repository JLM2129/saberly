from django.core.management.base import BaseCommand
from apps.preguntas.models import Area, SubArea, Pregunta, OpcionRespuesta

class Command(BaseCommand):
    help = 'Seeds the database with diverse ICFES questions (English Parts, etc)'

    def handle(self, *args, **options):
        self.stdout.write('Seeding diverse data...')

        # Data Structure
        # We use a mix of existing and new types
        data = [
            {
                "area": "Inglés",
                "subareas": [
                    {
                        "nombre": "Parte 1 (Léxico - 8 Opciones)",
                        "preguntas": [
                            {
                                "enunciado": "Parte 1. Choose the word that matches the description: 'You wear this when it is cold.'",
                                "tipo": "seleccion_multiple",
                                "dificultad": "facil",
                                "opciones": [
                                    {"texto": "Jacket", "correcta": True},
                                    {"texto": "T-shirt", "correcta": False},
                                    {"texto": "Sandals", "correcta": False},
                                    {"texto": "Skirt", "correcta": False},
                                    {"texto": "Shorts", "correcta": False},
                                    {"texto": "Cap", "correcta": False},
                                    {"texto": "Glasses", "correcta": False},
                                    {"texto": "Belt", "correcta": False},
                                ]
                            },
                            {
                                "enunciado": "Parte 1. Choose the word that matches the description: 'People usually put this on their feet.'",
                                "tipo": "seleccion_multiple",
                                "dificultad": "facil",
                                "opciones": [
                                    {"texto": "Shoes", "correcta": True},
                                    {"texto": "Gloves", "correcta": False},
                                    {"texto": "Hat", "correcta": False},
                                    {"texto": "Scarf", "correcta": False},
                                    {"texto": "Earrings", "correcta": False},
                                    {"texto": "Necklace", "correcta": False},
                                    {"texto": "Ring", "correcta": False},
                                    {"texto": "Watch", "correcta": False},
                                ]
                            }
                        ]
                    },
                    {
                        "nombre": "Parte 3 (Conversación)",
                        "preguntas": [
                            {
                                "enunciado": "Parte 3. Complete the conversation: 'I am hungry.'",
                                "tipo": "seleccion_multiple",
                                "dificultad": "facil",
                                "opciones": [
                                    {"texto": "Dinner is ready.", "correcta": True},
                                    {"texto": "I am fine.", "correcta": False},
                                    {"texto": "It is late.", "correcta": False},
                                ]
                            },
                            {
                                "enunciado": "Parte 3. Complete the conversation: 'Can I borrow your pen?'",
                                "tipo": "seleccion_multiple",
                                "dificultad": "facil",
                                "opciones": [
                                    {"texto": "Sure, here you are.", "correcta": True},
                                    {"texto": "I don't know.", "correcta": False},
                                    {"texto": "Yes, I am.", "correcta": False},
                                ]
                            }
                        ]
                    },
                     {
                        "nombre": "Parte 4 (Texto Incompleto)",
                        "preguntas": [
                            {
                                "enunciado": "Parte 4. Choose the correct word to complete the text: 'Cats ___ popular pets.'",
                                "tipo": "lectura",
                                "dificultad": "media",
                                "opciones": [
                                    {"texto": "are", "correcta": True},
                                    {"texto": "is", "correcta": False},
                                    {"texto": "be", "correcta": False},
                                ]
                            }
                        ]
                    }
                ]
            },
            {
                "area": "Lectura Crítica",
                "subareas": [
                   {
                        "nombre": "Argumentación",
                        "preguntas": [
                            {
                                "enunciado": "Lea el texto: 'El consumo excesivo de azúcar...' La intención principal del autor es:",
                                "tipo": "lectura",
                                "dificultad": "dificil",
                                "opciones": [
                                    {"texto": "Persuadir sobre los daños del azúcar", "correcta": True},
                                    {"texto": "Informar sobre la producción de azúcar", "correcta": False},
                                    {"texto": "Narrar una historia dulce", "correcta": False},
                                    {"texto": "Describir un proceso químico", "correcta": False},
                                ]
                            }
                        ]
                   }
                ]
            },
             {
                "area": "Ciencias Naturales",
                "subareas": [
                    {
                        "nombre": "Química",
                        "preguntas": [
                            {
                                "enunciado": "Si mezclamos ácido clorhídrico con hidróxido de sodio, obtenemos:",
                                "tipo": "seleccion_multiple",
                                "dificultad": "media",
                                "opciones": [
                                    {"texto": "Cloruro de sodio y agua (Sal común)", "correcta": True},
                                    {"texto": "Ácido sulfúrico", "correcta": False},
                                    {"texto": "Oro puro", "correcta": False},
                                    {"texto": "Gas noble", "correcta": False},
                                ]
                            }
                        ]
                    }
                ]
            }
        ]

        count_created = 0
        for area_d in data:
            area_obj, _ = Area.objects.get_or_create(nombre=area_d['area'])
            
            for sub_d in area_d['subareas']:
                sub_obj, _ = SubArea.objects.get_or_create(area=area_obj, nombre=sub_d['nombre'])
                
                for preg_d in sub_d['preguntas']:
                    if not Pregunta.objects.filter(enunciado=preg_d['enunciado']).exists():
                        p = Pregunta.objects.create(
                            subarea=sub_obj,
                            enunciado=preg_d['enunciado'],
                            tipo=preg_d.get('tipo', 'seleccion_multiple'),
                            dificultad=preg_d.get('dificultad', 'media'),
                            imagen_url=preg_d.get('imagen_url', None)
                        )
                        
                        opciones = preg_d['opciones']
                        for op in opciones:
                            OpcionRespuesta.objects.create(
                                pregunta=p,
                                texto=op['texto'],
                                es_correcta=op['correcta']
                            )
                        count_created += 1

        self.stdout.write(self.style.SUCCESS(f'Successfully added {count_created} new diverse questions.'))
