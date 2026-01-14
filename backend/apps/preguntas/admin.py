from django.contrib import admin
from .models import Area, SubArea, Contexto, Pregunta, OpcionRespuesta


class OpcionRespuestaInline(admin.TabularInline):
    model = OpcionRespuesta
    extra = 4
    fields = ['texto', 'es_correcta', 'orden']


@admin.register(Area)
class AreaAdmin(admin.ModelAdmin):
    list_display = ['nombre', 'descripcion']
    search_fields = ['nombre']


@admin.register(SubArea)
class SubAreaAdmin(admin.ModelAdmin):
    list_display = ['nombre', 'area']
    list_filter = ['area']
    search_fields = ['nombre', 'area__nombre']


@admin.register(Contexto)
class ContextoAdmin(admin.ModelAdmin):
    list_display = ['titulo', 'area', 'tipo']
    list_filter = ['area', 'tipo']
    search_fields = ['titulo', 'contenido']
    fields = ['area', 'tipo', 'titulo', 'contenido', 'archivo', 'url_externa']


@admin.register(Pregunta)
class PreguntaAdmin(admin.ModelAdmin):
    list_display = ['id', 'enunciado_corto', 'area', 'tipo', 'dificultad', 'competencia', 'active']
    list_filter = ['area', 'tipo', 'dificultad', 'competencia', 'active']
    search_fields = ['enunciado', 'explicacion']
    inlines = [OpcionRespuestaInline]
    
    fieldsets = (
        ('Información Básica', {
            'fields': ('area', 'subarea', 'contexto', 'enunciado')
        }),
        ('Clasificación', {
            'fields': ('tipo', 'dificultad', 'competencia')
        }),
        ('Contenido Adicional', {
            'fields': ('imagen_url', 'explicacion', 'active'),
            'classes': ('collapse',)
        }),
    )
    
    def enunciado_corto(self, obj):
        return obj.enunciado[:75] + '...' if len(obj.enunciado) > 75 else obj.enunciado
    enunciado_corto.short_description = 'Enunciado'


@admin.register(OpcionRespuesta)
class OpcionRespuestaAdmin(admin.ModelAdmin):
    list_display = ['id', 'pregunta_id', 'texto_corto', 'es_correcta', 'orden']
    list_filter = ['es_correcta']
    search_fields = ['texto', 'pregunta__enunciado']
    
    def texto_corto(self, obj):
        return obj.texto[:50] + '...' if len(obj.texto) > 50 else obj.texto
    texto_corto.short_description = 'Texto'
