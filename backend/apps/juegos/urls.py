from django.urls import path
from .views import QuickQuestionsView, GuardarPartidaView, HighScoresView

urlpatterns = [
    path('quick-questions/', QuickQuestionsView.as_view(), name='quick-questions'),
    path('guardar-partida/', GuardarPartidaView.as_view(), name='guardar-partida'),
    path('high-scores/', HighScoresView.as_view(), name='high-scores'),
]
