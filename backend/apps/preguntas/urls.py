from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import AreaViewSet, PreguntaViewSet, assign_context_api


router = DefaultRouter()
router.register(r'areas', AreaViewSet)
router.register(r'banco', PreguntaViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('assign-context/', assign_context_api),
    
]
