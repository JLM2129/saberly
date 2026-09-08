import json
from .ai_provider import create_client, get_api_key, get_model_name

class FlashcardService:
    @classmethod
    def generate_flashcards(cls, pregunta_texto, error_usuario):
        api_key = get_api_key()
        if not api_key:
            raise ValueError("No hay una API key de IA configurada")

        client = create_client()
        model_name = get_model_name()

        prompt = f"""Actúa como un pedagogo experto en el ICFES. 
        Basado en este error: '{error_usuario}' en la pregunta: '{pregunta_texto}', 
        crea 3 cartas de repaso corto. No des la respuesta de la pregunta original, explica el concepto base.
        
        Debes responder ESTRICTAMENTE en formato JSON con la siguiente estructura (una lista de objetos):
        [
          {{"frente": "pregunta conceptual", "dorso": "respuesta corta con un tip para el ICFES"}},
          ...
        ]
        """

        try:
            response = client.models.generate_content(
                model=model_name,
                contents=prompt
            )
            
            content = response.text.strip()
            
            # Extract JSON if there's markdown surrounding it
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0].strip()
            elif "```" in content:
                content = content.split("```")[1].split("```")[0].strip()

            flashcards_data = json.loads(content)
            return flashcards_data
            
        except Exception as e:
            print(f"Error generando flashcards con Gemma 4: {str(e)}")
            # Return basic ones if it fails to avoid breaking the UI
            return [
                {"frente": "Concepto clave de la pregunta", "dorso": "Revisa la base teórica del tema para mejorar en esta área. Tip: Lee con calma cada opción."},
                {"frente": "¿Cómo abordar preguntas similares?", "dorso": "Identifica las palabras clave en el enunciado. Tip: Descarta las opciones más extremas."},
                {"frente": "Análisis del error", "dorso": "Es común confundir estos conceptos. Tip: Practica con más simulacros de esta área."}
            ]
    @classmethod
    def generate_from_topics(cls, topics_data):
        """
        Genera flashcards basadas en una lista de temas (areas) donde el usuario falló.
        topics_data: [{'area': 'Matemáticas', 'errors': 5}, ...]
        """
        api_key = get_api_key()
        if not api_key:
            raise ValueError("No hay una API key de IA configurada")

        client = create_client()
        model_name = get_model_name()

        temas_str = ", ".join([f"{t['area']} ({t['errors']} errores)" for t in topics_data])
        
        prompt = f"""Actúa como un pedagogo experto en el examen ICFES. El estudiante tiene debilidades en estos temas: {temas_str}.
        En lugar de preguntas, genera CARTAS DE CONCEPTO que enfoquen el tema que el estudiante debe REFORZAR.
        
        Para CADA tema:
        1. 'frente': El NOMBRE DEL CONCEPTO O TEMA (ej: 'Variables Independientes vs Dependientes').
        2. 'dorso': Una EXPLICACIÓN MAESTRA y una 'Regla de Oro' para no volver a fallar en el ICFES.
        
        Responde ESTRICTAMENTE en formato JSON:
        [
          {{"frente": "Nombre del Concepto 1", "dorso": "Explicación clara + Regla de Oro"}},
          ...
        ]
        """

        try:
            response = client.models.generate_content(
                model=model_name,
                contents=prompt
            )
            content = response.text.strip()
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0].strip()
            return json.loads(content)
        except Exception as e:
            print(f"Error en generate_from_topics: {str(e)}")
            # Fallback simple
            return [{"frente": f"Repaso de {t['area']}", "dorso": "Revisa los conceptos básicos de esta área."} for t in topics_data]
