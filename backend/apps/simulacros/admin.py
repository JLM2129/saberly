from django.contrib import admin
from .models import Simulacro, DetalleSimulacro

class DetalleSimulacroInline(admin.TabularInline):
    model = DetalleSimulacro
    extra = 0
    readonly_fields = ('pregunta', 'opcion_seleccionada', 'es_correcta')
    can_delete = False

@admin.register(Simulacro)
class SimulacroAdmin(admin.ModelAdmin):
    list_display = ('usuario', 'fecha_inicio', 'fecha_fin', 'completado', 'puntaje_total', 'tiempo_usado_segundos')
    list_filter = ('completado', 'fecha_inicio')
    search_fields = ('usuario__email', 'usuario__full_name')
    inlines = [DetalleSimulacroInline]
    
    # Generally, Simulacros are read-only for admins as they are records of user activity
    # But allowing delete might be useful.
