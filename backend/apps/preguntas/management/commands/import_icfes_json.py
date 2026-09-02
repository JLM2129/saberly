import json
import os
from pathlib import Path
from django.core.management.base import BaseCommand
import shutil
from django.conf import settings
from apps.preguntas.models import Area, SubArea, Contexto, Pregunta, OpcionRespuesta


class Command(BaseCommand):
    help = "Importa preguntas ICFES desde una carpeta de JSON"

    def add_arguments(self, parser):
        parser.add_argument(
            '--folder',
            type=str,
            default=None,
            help='Carpeta que contiene los archivos JSON de preguntas (por defecto, la carpeta preguntas del proyecto)'
        )

    def handle(self, *args, **options):
        folder_arg = options.get('folder')
        if folder_arg:
            folder_path = Path(folder_arg).resolve()
        else:
            # Usar una ruta absoluta basada en la ubicación del proyecto
            base_dir = Path(__file__).resolve().parent.parent.parent.parent.parent
            folder_path = (base_dir / "preguntas").resolve()

        if not folder_path.exists():
            self.stdout.write(self.style.ERROR(f"No existe la carpeta: {folder_path}"))
            return

        self.stdout.write(f"Buscando nuevas preguntas en {folder_path}...")

        total_contextos = 0
        total_preguntas = 0
        total_opciones = 0

        json_files = sorted([p for p in folder_path.iterdir() if p.is_file() and p.suffix.lower() == '.json'])
        if not json_files:
            self.stdout.write(self.style.WARNING(f"No se encontraron archivos JSON en {folder_path}"))
            return

        for archivo_path in json_files:
            archivo = archivo_path.name
            self.stdout.write(f"\nProcesando: {archivo}")

            with open(archivo_path, encoding="utf-8") as f:
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

                archivo_raw = bloque.get("archivo")
                archivo_normalizado = None
                if isinstance(archivo_raw, str) and archivo_raw.strip():
                    archivo_raw = archivo_raw.strip()
                    if archivo_raw.startswith("/"):
                        archivo_raw = archivo_raw.lstrip("/")
                    if archivo_raw.startswith("media/"):
                        archivo_raw = archivo_raw[len("media/"):]
                    if not archivo_raw.startswith("imagenes/"):
                        archivo_raw = f"imagenes/{archivo_raw}"
                    archivo_normalizado = archivo_raw

                if contenido:
                    # Usar get_or_create para evitar duplicados.
                    contexto, created = Contexto.objects.get_or_create(
                        area=area,
                        contenido=contenido,
                        defaults={
                            'tipo': tipo_final,
                            'archivo': archivo_normalizado,
                            'titulo': bloque.get("titulo", "")
                        }
                    )

                    if not created:
                        needs_save = False
                        if contexto.tipo != tipo_final:
                            contexto.tipo = tipo_final
                            needs_save = True
                        if archivo_normalizado and contexto.archivo != archivo_normalizado:
                            contexto.archivo = archivo_normalizado
                            needs_save = True
                        if needs_save:
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
                            'competencia': p.get("competencia", "interpretar"),
                            'imagen_url': p.get("imagen_url") # 'imagen_url' is already supported here
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

        # Asegurar desplegar imágenes a media/
        img_src = folder_path / "imagenes"
        img_dest = Path(settings.MEDIA_ROOT) / "imagenes"
        if img_src.exists() and img_dest.exists() and os.path.samefile(img_src, img_dest):
            # MEDIA_ROOT apunta a la misma carpeta de la que se importa, así que
            # origen y destino coinciden y no hay nada que copiar. Sin esta guarda
            # shutil.copy2 lanza SameFileError y aborta el comando.
            self.stdout.write("Las imágenes ya están en MEDIA_ROOT; no hay nada que desplegar.")
        elif img_src.exists():
            img_dest.mkdir(parents=True, exist_ok=True)
            self.stdout.write(f"Desplegando imágenes desde {img_src} a {img_dest}...")
            copiadas = 0
            for img_file in os.listdir(img_src):
                origen = img_src / img_file
                destino = img_dest / img_file
                if not origen.is_file():
                    continue
                if destino.exists() and os.path.samefile(origen, destino):
                    continue
                shutil.copy2(origen, destino)
                copiadas += 1
            self.stdout.write(self.style.SUCCESS(f"Imágenes desplegadas: {copiadas}."))

        self.stdout.write(self.style.SUCCESS(
            f"\nRESUMEN FINAL\n"
            f"Contextos creados: {total_contextos}\n"
            f"Preguntas creadas: {total_preguntas}\n"
            f"Opciones creadas: {total_opciones}"
        ))
