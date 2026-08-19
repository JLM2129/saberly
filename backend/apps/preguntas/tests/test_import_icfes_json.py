import json
import tempfile
from io import StringIO
from pathlib import Path

from django.core.management import call_command
from django.test import TestCase

from apps.preguntas.models import Area, OpcionRespuesta, Pregunta


class ImportIcfesJsonTests(TestCase):
    def test_imports_questions_from_specified_json_folder(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            folder = Path(tmpdir)
            sample_json = {
                "nombre": "Matemáticas",
                "descripcion": "Área de prueba",
                "contextos": [
                    {
                        "tipo": "texto",
                        "contexto": "Un contexto de prueba",
                        "archivo": None,
                        "preguntas": [
                            {
                                "enunciado": "¿Cuál es el resultado de 2 + 2?",
                                "tipo": "seleccion_unica",
                                "dificultad": "facil",
                                "competencia": "interpretar",
                                "opciones": [
                                    {"texto": "3", "es_correcta": False},
                                    {"texto": "4", "es_correcta": True},
                                ],
                            },
                            {
                                "enunciado": "¿Cuál es el resultado de 3 + 3?",
                                "tipo": "seleccion_unica",
                                "dificultad": "facil",
                                "competencia": "interpretar",
                                "opciones": [
                                    {"texto": "5", "es_correcta": False},
                                    {"texto": "6", "es_correcta": True},
                                ],
                            },
                        ],
                    }
                ],
            }
            (folder / "sample.json").write_text(json.dumps(sample_json), encoding="utf-8")

            stdout = StringIO()
            call_command("import_icfes_json", folder=str(folder), stdout=stdout)

            self.assertEqual(Area.objects.filter(nombre="Matemáticas").count(), 1)
            self.assertEqual(Pregunta.objects.filter(area__nombre="Matemáticas").count(), 2)
            self.assertEqual(OpcionRespuesta.objects.count(), 4)
            self.assertIn("sample.json", stdout.getvalue())
