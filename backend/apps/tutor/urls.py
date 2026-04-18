from django.urls import path
from .views import ExplicarPreguntaView

urlpatterns = [
    path('explicar/', ExplicarPreguntaView.as_view(), name='explicar_pregunta'),
]
