from django.contrib import admin
from django.urls import path, include
from drf_spectacular.views import SpectacularAPIView, SpectacularRedocView, SpectacularSwaggerView
from django.http import JsonResponse

def health_check(request):
    return JsonResponse({"status": "ok", "message": "Backend is running"})

urlpatterns = [
    path('api/health/', health_check, name='health_check'),
    path('admin/', admin.site.urls),
    path('api/users/', include('apps.users.urls')),
    path('api/preguntas/', include('apps.preguntas.urls')),
    path('api/simulacros/', include('apps.simulacros.urls')),
    path('api/estadisticas/', include('apps.estadisticas.urls')),
    path('api/juegos/', include('apps.juegos.urls')),
    
    # Documentation
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
]
