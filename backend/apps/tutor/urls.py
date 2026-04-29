from .views import ExplicarPreguntaView, GenerateFlashcardsView, GenerateWeaknessFlashcardsView, InteraccionTutorView
from django.urls import path

urlpatterns = [
    path('explicar/', ExplicarPreguntaView.as_view(), name='explicar_pregunta'),
    path('flashcards/generate/', GenerateFlashcardsView.as_view(), name='generate_flashcards'),
    path('flashcards/debilidades/', GenerateWeaknessFlashcardsView.as_view(), name='generate_weakness_flashcards'),
    path('interaccion/', InteraccionTutorView.as_view(), name='interaccion_tutor'),
]
