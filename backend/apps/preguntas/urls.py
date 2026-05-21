from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    AreaViewSet, PreguntaViewSet, TeacherPreguntaViewSet, assign_context_api,
    validate_import_api, confirm_import_api, db_stats_api
)


router = DefaultRouter()
router.register(r'areas', AreaViewSet)
router.register(r'banco', PreguntaViewSet)
router.register(r'teacher', TeacherPreguntaViewSet, basename='teacher-pregunta')

urlpatterns = [
    path('', include(router.urls)),
    path('assign-context/', assign_context_api),
    path('import/validate/', validate_import_api, name='import-validate'),
    path('import/confirm/', confirm_import_api, name='import-confirm'),
    path('import/stats/', db_stats_api, name='import-stats'),
]
