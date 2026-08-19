import logging
import os
from django.apps import AppConfig

logger = logging.getLogger(__name__)


class PreguntasConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.preguntas'

    def ready(self):
        if os.environ.get('RUN_MAIN') != 'true':
            return

        from django.core.management import call_command

        try:
            call_command('import_icfes_json', verbosity=0)
        except Exception as exc:
            logger.exception("No fue posible importar las preguntas al iniciar el backend: %s", exc)
