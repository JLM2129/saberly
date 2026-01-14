from rest_framework import serializers
from .models import Simulacro, DetalleSimulacro
from apps.preguntas.serializers import PreguntaSerializer, PreguntaBlindSerializer

class DetalleSimulacroSerializer(serializers.ModelSerializer):
    class Meta:
        model = DetalleSimulacro
        fields = ['id', 'pregunta', 'opcion_seleccionada', 'es_correcta']

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        
        # Determine strictness based on parent Simulacro status
        # Note: optimizing this access (prefetching) is important for performance
        if instance.simulacro.completado:
            ret['pregunta'] = PreguntaSerializer(instance.pregunta).data
        else:
            ret['pregunta'] = PreguntaBlindSerializer(instance.pregunta).data
            # Also hide 'es_correcta' from the detail itself if you want to be extra safe,
            # but currently 'es_correcta' is 0/False until graded anyway?
            # Actually, 'es_correcta' in DetalleSimulacro is calculated at the end.
            # But the field exists. So it's fine.
            if 'es_correcta' in ret:
                ret.pop('es_correcta')
                
        return ret

class SimulacroSerializer(serializers.ModelSerializer):
    detalles = DetalleSimulacroSerializer(many=True, read_only=True)

    class Meta:
        model = Simulacro
        fields = ['id', 'fecha_inicio', 'fecha_fin', 'puntaje_total', 'tiempo_usado_segundos', 'completado', 'detalles']
