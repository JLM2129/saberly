
import os
import django
import sys

# Setup Django environment
sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.simulacros.models import Simulacro
from apps.simulacros.serializers import SimulacroSerializer

try:
    print("--- Buscando último simulacro ---")
    sim = Simulacro.objects.last()
    if not sim:
        print("No hay simulacros creados.")
    else:
        print(f"Simulacro ID: {sim.id}")
        print("Intentando serializar...")
        serializer = SimulacroSerializer(sim)
        data = serializer.data
        print("¡Serialización EXITOSA!")
        # print(data) # Descomentar para ver datos
except Exception as e:
    print("\nXXX ERROR FATAL DURANTE SERIALIZACION XXX")
    print(e)
    import traceback
    traceback.print_exc()
