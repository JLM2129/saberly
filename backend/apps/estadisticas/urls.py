from django.urls import path
from .views import (
    ResumenEstadisticasView,
    DocenteDashboardGeneralView,
    DocenteDebilidadesGrupalesView,
    DocenteEstudiantesListView,
    DocenteEstudianteDetalleView,
    DocenteGenerarTallerRefuerzoView,
    AdminMacroDashboardView,
    AdminSaludPreguntasView,
    AdminAdopcionColegiosView
)

urlpatterns = [
    # MVP original endpoint
    path('', ResumenEstadisticasView.as_view(), name='estadisticas-resumen'),
    
    # Endpoints para Docentes / Instituciones (Multi-Tenant)
    path('docente/dashboard-general/', DocenteDashboardGeneralView.as_view(), name='docente-dashboard-general'),
    path('docente/debilidades-grupales/', DocenteDebilidadesGrupalesView.as_view(), name='docente-debilidades-grupales'),
    path('docente/estudiantes/', DocenteEstudiantesListView.as_view(), name='docente-estudiantes-list'),
    path('docente/estudiantes/<int:student_id>/', DocenteEstudianteDetalleView.as_view(), name='docente-estudiante-detalle'),
    path('docente/generar-taller-refuerzo/', DocenteGenerarTallerRefuerzoView.as_view(), name='docente-generar-taller-refuerzo'),
    
    # Endpoints para Administradores de Saberly (Macro-Analítica)
    path('admin/macro-dashboard/', AdminMacroDashboardView.as_view(), name='admin-macro-dashboard'),
    path('admin/salud-preguntas/', AdminSaludPreguntasView.as_view(), name='admin-salud-preguntas'),
    path('admin/adopcion-colegios/', AdminAdopcionColegiosView.as_view(), name='admin-adopcion-colegios'),
]
