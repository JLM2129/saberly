from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import AreaViewSet, PreguntaViewSet, TeacherPreguntaViewSet, assign_context_api


router = DefaultRouter()
router.register(r'areas', AreaViewSet)
router.register(r'banco', PreguntaViewSet)
router.register(r'teacher', TeacherPreguntaViewSet, basename='teacher-pregunta')

urlpatterns = [
    path('', include(router.urls)),
    path('assign-context/', assign_context_api),
    
]
