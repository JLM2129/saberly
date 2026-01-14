from django.core.management.base import BaseCommand
from apps.preguntas.services.contexto_service import (
    asegurar_contexto_por_area,
    asignar_contextos_a_preguntas
)

class Command(BaseCommand):
    help = 'Asigna contextos a preguntas que no tienen uno asociado'

    def handle(self, *args, **options):
        creados = asegurar_contexto_por_area()
        if creados:
            self.stdout.write(
                self.style.SUCCESS(f'Se crearon {creados} contextos por defecto.')
            )

        asignadas = asignar_contextos_a_preguntas()

        if asignadas == 0:
            self.stdout.write('No hay preguntas sin contexto.')
        else:
            self.stdout.write(
                self.style.SUCCESS(f'Se asignaron contextos a {asignadas} preguntas.')
            )
