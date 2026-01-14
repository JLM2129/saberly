from django.urls import path
from .views import ResumenEstadisticasView

urlpatterns = [
    path('resumen/', ResumenEstadisticasView.as_view(), name='resumen_estadisticas'),
]
