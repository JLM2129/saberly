import json
import os
from pathlib import Path
from django.core.management.base import BaseCommand
from apps.preguntas.models import Area, SubArea, Contexto, Pregunta, OpcionRespuesta


class Command(BaseCommand):
    help = "Importa preguntas ICFES desde carpeta preguntas/"

    def handle(self, *args, **options):
        # Usar una ruta absoluta basada en la ubicación del proyecto
        base_dir = Path(__file__).resolve().parent.parent.parent.parent.parent
        folder_path = base_dir / "preguntas"

        self.stdout.write("Limpiando base de datos antes de importar...")
        OpcionRespuesta.objects.all().delete()
        Pregunta.objects.all().delete()
        Contexto.objects.all().delete()
        SubArea.objects.all().delete()
        Area.objects.all().delete()

        total_contextos = 0
        total_preguntas = 0
        total_opciones = 0

        for archivo in os.listdir(folder_path):
            if not archivo.endswith(".json"):
                continue

            self.stdout.write(f"\nProcesando: {archivo}")

            with open(os.path.join(folder_path, archivo), encoding="utf-8") as f:
                data = json.load(f)

            area, _ = Area.objects.get_or_create(
                nombre=data.get("nombre", "General"),
                defaults={"descripcion": data.get("descripcion", "")}
            )

            subarea, _ = SubArea.objects.get_or_create(
                area=area,
                nombre="General"
            )

            valid_types = ['texto', 'imagen', 'tabla', 'grafica', 'audio']

            for bloque in data.get("contextos", []):
                contenido = (
                    bloque.get("contexto")
                    or bloque.get("texto")
                    or ""
                ).strip()

                raw_tipo = bloque.get("tipo", "texto")
                tipo_final = raw_tipo if raw_tipo in valid_types else "texto"

                if contenido:
                    # Usar get_or_create para evitar duplicados y update_or_create logic para corregir tipos erróneos
                    contexto, created = Contexto.objects.get_or_create(
                        area=area,
                        contenido=contenido,
                        defaults={
                            'tipo': tipo_final,
                            'archivo': bloque.get("archivo"),
                            'titulo': bloque.get("titulo", "")
                        }
                    )
                    # Si ya existía pero tenía un tipo incorrecto (ej: "experimento"), lo corregimos
                    if not created and contexto.tipo != tipo_final:
                        contexto.tipo = tipo_final
                        contexto.save()
                    total_contextos += 1 if created else 0
                else:
                    contexto = None

                for p in bloque.get("preguntas", []):

                    if not p.get("enunciado"):
                        continue

                    # Evitar duplicar la pregunta
                    pregunta, p_created = Pregunta.objects.get_or_create(
                        area=area,
                        enunciado=p.get("enunciado"),
                        defaults={
                            'subarea': subarea,
                            'contexto': contexto,
                            'tipo': p.get("tipo", "seleccion_unica"),
                            'dificultad': p.get("dificultad", "media"),
                            'competencia': p.get("competencia", "interpretar")
                        }
                    )
                    
                    if p_created:
                        total_preguntas += 1
                        for i, op in enumerate(p.get("opciones", [])):
                            OpcionRespuesta.objects.create(
                                pregunta=pregunta,
                                texto=op.get("texto", ""),
                                es_correcta=op.get("es_correcta", False),
                                orden=i
                            )
                            total_opciones += 1

            self.stdout.write(self.style.SUCCESS(f"OK: {archivo} importado"))

        self.stdout.write(self.style.SUCCESS(
            f"\nRESUMEN FINAL\n"
            f"Contextos creados: {total_contextos}\n"
            f"Preguntas creadas: {total_preguntas}\n"
            f"Opciones creadas: {total_opciones}"
        ))
