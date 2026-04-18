import os
import django
import json

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.preguntas.models import Area, Pregunta, Contexto

def export_to_js():
    data_bundle = {}
    areas = Area.objects.all()
    
    for area in areas:
        area_key = area.nombre.lower().replace(' ', '_')
        # Limpiar tildes de la clave
        area_key = area_key.replace('á', 'a').replace('é', 'e').replace('í', 'i').replace('ó', 'o').replace('ú', 'u')
        
        area_data = {
            "nombre": area.nombre,
            "contextos": []
        }
        
        # Primero, preguntas con contexto
        contextos = Contexto.objects.filter(area=area)
        for ctx in contextos:
            ctx_data = {
                "tipo": ctx.tipo,
                "contexto": ctx.contenido,
                "archivo": ctx.archivo.url if ctx.archivo else (ctx.url_externa if ctx.url_externa else None),
                "preguntas": []
            }
            
            preguntas = Pregunta.objects.filter(contexto=ctx)
            for p in preguntas:
                p_data = {
                    "enunciado": p.enunciado,
                    "tipo": p.tipo,
                    "dificultad": p.dificultad,
                    "competencia": p.competencia,
                    "imagen_url": p.imagen_url,
                    "opciones": [
                        {"texto": o.texto, "es_correcta": o.es_correcta}
                        for o in p.opciones.all()
                    ]
                }
                ctx_data["preguntas"].append(p_data)
            
            if ctx_data["preguntas"]:
                area_data["contextos"].append(ctx_data)
        
        # Luego, preguntas sin contexto
        preguntas_sin_ctx = Pregunta.objects.filter(area=area, contexto__isnull=True)
        if preguntas_sin_ctx.exists():
            standalone_ctx = {
                "tipo": "preguntas_directas",
                "contexto": "Preguntas de respuesta directa",
                "archivo": None,
                "preguntas": []
            }
            for p in preguntas_sin_ctx:
                p_data = {
                    "enunciado": p.enunciado,
                    "tipo": p.tipo,
                    "dificultad": p.dificultad,
                    "competencia": p.competencia,
                    "imagen_url": p.imagen_url,
                    "opciones": [
                        {"texto": o.texto, "es_correcta": o.es_correcta}
                        for o in p.opciones.all()
                    ]
                }
                standalone_ctx["preguntas"].append(p_data)
            area_data["contextos"].append(standalone_ctx)
            
        data_bundle[area_key] = area_data
    
    # Escribir el archivo
    output_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'frontend', 'src', 'offline', 'questions_data.js')
    js_content = f"// Archivo generado desde la Base de Datos\nexport const OFF_QUESTIONS_DATA = {json.dumps(data_bundle, indent=2, ensure_ascii=False)};\n"
    
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(js_content)
    
    print(f"✅ Exportación completada.")

if __name__ == '__main__':
    export_to_js()
