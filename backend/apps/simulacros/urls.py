from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import SimulacroViewSet, GenerarSimulacroView, FinalizarSimulacroView, SincronizarOfflineView

router = DefaultRouter()
router.register(r'historial', SimulacroViewSet, basename='simulacro')

urlpatterns = [
    path('', include(router.urls)),
    path('generar/', GenerarSimulacroView.as_view(), name='generar_simulacro'),
    path('<int:pk>/finalizar/', FinalizarSimulacroView.as_view(), name='finalizar_simulacro'),
    path('sincronizar_offline/', SincronizarOfflineView.as_view(), name='sincronizar_offline'),
]
