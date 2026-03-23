from django.urls import path
from .views import (
    QuickQuestionsView, GuardarPartidaView, HighScoresView, 
    MillionaireQuestionsView, StreakQuestionsView, MisPartidasView,
    CrearSalaView, UnirseSalaView, SalaStatusView, IniciarJuegoView, ResponderMultijugadorView
)

urlpatterns = [
    path('quick-questions/', QuickQuestionsView.as_view(), name='quick-questions'),
    path('millionaire-questions/', MillionaireQuestionsView.as_view(), name='millionaire-questions'),
    path('streak-questions/', StreakQuestionsView.as_view(), name='streak-questions'),
    path('guardar-partida/', GuardarPartidaView.as_view(), name='guardar-partida'),
    path('high-scores/', HighScoresView.as_view(), name='high-scores'),
    path('mis-partidas/', MisPartidasView.as_view(), name='mis-partidas'),
    
    # Multiplayer
    path('salas/crear/', CrearSalaView.as_view(), name='crear-sala'),
    path('salas/unirse/', UnirseSalaView.as_view(), name='unirse-sala'),
    path('salas/<str:codigo>/status/', SalaStatusView.as_view(), name='sala-status'),
    path('salas/<str:codigo>/iniciar/', IniciarJuegoView.as_view(), name='iniciar-juego'),
    path('salas/<str:codigo>/responder/', ResponderMultijugadorView.as_view(), name='responder-multi'),
]
