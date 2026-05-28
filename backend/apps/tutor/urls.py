from .views import (
    ExplicarPreguntaView, 
    GenerateFlashcardsView, 
    GenerateWeaknessFlashcardsView, 
    InteraccionTutorView,
    ObtenerDebilidadesView,
    IniciarEntrenamientoView,
    ResponderEntrenamientoView,
    PromocionarPreguntaIAView
)
from django.urls import path

urlpatterns = [
    path('explicar/', ExplicarPreguntaView.as_view(), name='explicar_pregunta'),
    path('flashcards/generate/', GenerateFlashcardsView.as_view(), name='generate_flashcards'),
    path('flashcards/debilidades/', GenerateWeaknessFlashcardsView.as_view(), name='generate_weakness_flashcards'),
    path('interaccion/', InteraccionTutorView.as_view(), name='interaccion_tutor'),
    path('debilidades/', ObtenerDebilidadesView.as_view(), name='obtener_debilidades'),
    path('entrenamiento/iniciar/', IniciarEntrenamientoView.as_view(), name='iniciar_entrenamiento'),
    path('entrenamiento/responder/', ResponderEntrenamientoView.as_view(), name='responder_entrenamiento'),
    path('preguntas-ia/<int:pk>/promocionar/', PromocionarPreguntaIAView.as_view(), name='promocionar_pregunta_ia'),
]

