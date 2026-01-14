from rest_framework import views, status, permissions
from rest_framework.response import Response
from django.db.models import Avg, Count
from apps.simulacros.models import Simulacro

class ResumenEstadisticasView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        usuario = request.user
        qs = Simulacro.objects.filter(usuario=usuario, completado=True)
        
        total_simulacros = qs.count()
        if total_simulacros == 0:
            return Response({
                "total_simulacros": 0,
                "promedio_global": 0,
                "mensaje": "No hay suficientes datos."
            })

        promedio = qs.aggregate(Avg('puntaje_total'))['puntaje_total__avg']

        # More complex stats (like per Area) would require joining with DetalleSimulacro -> Pregunta -> SubArea -> Area
        # For MVP, we stick to global stats.

        return Response({
            "total_simulacros": total_simulacros,
            "promedio_global": round(promedio, 2) if promedio else 0,
        })
