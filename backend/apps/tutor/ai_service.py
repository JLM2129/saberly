import os
import re
import json
from google import genai
from django.conf import settings

class TutorAI:
    _instance = None

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def __init__(self):
        self.api_key = os.getenv("GEMMA_API_KEY") or os.getenv("GEMINI_API_KEY")
        self.client = None
        if self.api_key:
            self.client = genai.Client(api_key=self.api_key)
        
        # Powering the soul of Saberly with Gemma 4
        self.model_name = os.getenv("GEMMA_MODEL_ID", "gemini-1.5-flash")

    def _ensure_client(self):
        if not self.client:
            self.api_key = os.getenv("GEMMA_API_KEY") or os.getenv("GEMINI_API_KEY")
            if self.api_key:
                self.client = genai.Client(api_key=self.api_key)
            else:
                raise ValueError("API KEY de GenAI no encontrada en el archivo .env")

    def _extract_json(self, content):
        try:
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0].strip()
            elif "```" in content:
                content = content.split("```")[1].split("```")[0].strip()
            return json.loads(content)
        except Exception as e:
            print(f"Error extrayendo JSON de la respuesta: {e}\nContenido: {content}")
            return {"error": "No se pudo parsear el JSON", "raw": content}

    # 1. Diagnóstico de error
    def diagnosticar_error(self, pregunta, respuesta_correcta, respuesta_estudiante):
        self._ensure_client()
        prompt = f"""Eres un analista pedagógico experto en el examen ICFES en Colombia.

Tu tarea NO es explicar la respuesta, sino identificar el tipo de error del estudiante.

Pregunta:
{pregunta}

Respuesta correcta:
{respuesta_correcta}

Respuesta del estudiante:
{respuesta_estudiante}

Clasifica el error en UNA de estas categorías:
- conceptual (no entiende el concepto)
- procedimental (sabe el concepto pero aplica mal)
- lectura (interpretó mal el enunciado)
- descuido (error simple o distracción)

Responde SOLO en formato JSON:
{{
  "tipo_error": "...",
  "explicacion_corta": "..."
}}"""
        response = self.client.models.generate_content(model=self.model_name, contents=prompt)
        return self._extract_json(response.text.strip())

    # 2. Sistema de pistas (Nivel 1)
    def generar_pista(self, tipo_error, pregunta):
        self._ensure_client()
        prompt = f"""Eres un tutor socrático para estudiantes colombianos que se preparan para el ICFES.

El estudiante cometió este tipo de error:
{tipo_error}

Pregunta:
{pregunta}

NO des la respuesta.

Da una pista breve que ayude al estudiante a pensar mejor.
Usa lenguaje simple y cercano.

Máximo 2 líneas."""
        response = self.client.models.generate_content(model=self.model_name, contents=prompt)
        return response.text.strip()

    # 3. Ejemplo guiado (Nivel 2)
    def generar_ejemplo(self, tipo_error, pregunta):
        self._ensure_client()
        prompt = f"""Eres un profesor experto para estudiantes en Colombia.

El estudiante cometió este tipo de error:
{tipo_error}

En esta pregunta:
{pregunta}

Genera un ejemplo o analogía similar al problema, pero más sencillo, para corregir ese tipo de error.

Incluye:
1. Ejemplo
2. Resolución paso a paso

No menciones la respuesta original."""
        response = self.client.models.generate_content(model=self.model_name, contents=prompt)
        return response.text.strip()

    # 4. Explicación final (Nivel 3)
    def generar_explicacion_final(self, tipo_error, pregunta, respuesta_estudiante, respuesta_correcta):
        self._ensure_client()
        prompt = f"""Eres un profesor experto para jóvenes en Colombia.

Responde SOLO en español.

Explica de forma clara y corta por qué la respuesta está mal.

Usa este formato:

1. Error del estudiante:
2. Explicación sencilla:
3. Respuesta correcta:

Tipo de error:
{tipo_error}

Pregunta:
{pregunta}

Respuesta del estudiante:
{respuesta_estudiante}

Respuesta correcta:
{respuesta_correcta}

Reglas:
- Usa lenguaje simple
- Máximo 5 líneas
- No uses inglés
- No agregues contenido extra"""
        response = self.client.models.generate_content(model=self.model_name, contents=prompt)
        return response.text.strip()

    # 5. Perfil cognitivo (MEMORIA DEL USUARIO)
    def generar_perfil_cognitivo(self, historial_errores):
        self._ensure_client()
        prompt = f"""Eres un psicopedagogo especializado en aprendizaje.

Analiza este historial de errores de un estudiante:

{historial_errores}

Identifica:
- principales debilidades
- patrones de error
- estilo de aprendizaje

Responde SOLO en JSON:

{{
  "debilidades": ["..."],
  "patrones": ["..."],
  "estilo": "..."
}}"""
        response = self.client.models.generate_content(model=self.model_name, contents=prompt)
        return self._extract_json(response.text.strip())

    # 6. Flashcards inteligentes
    def generar_flashcard_inteligente(self, tipo_error, tema):
        self._ensure_client()
        prompt = f"""Eres un experto en aprendizaje activo para el ICFES.

Genera una flashcard basada en este error:

Tipo de error:
{tipo_error}

Tema:
{tema}

Responde en formato:

{{
  "concepto_clave": "...",
  "error_comun": "...",
  "regla_de_oro": "...",
  "ejemplo": "..."
}}"""
        response = self.client.models.generate_content(model=self.model_name, contents=prompt)
        return self._extract_json(response.text.strip())

    # 7. Intervención personalizada
    def intervencion_personalizada(self, perfil_cognitivo, tipo_error, pregunta):
        self._ensure_client()
        prompt = f"""Eres un tutor inteligente del ICFES.

Perfil del estudiante:
{perfil_cognitivo}

Error actual:
{tipo_error}

Pregunta:
{pregunta}

Adapta la explicación según:
- sus debilidades
- su estilo de aprendizaje

Reglas:
- lenguaje simple
- máximo 4 líneas
- enfocado en mejorar su debilidad principal"""
        response = self.client.models.generate_content(model=self.model_name, contents=prompt)
        return response.text.strip()

    # LEGACY / SIMPLE EXPLANATION
    def generate_explanation(self, question_text, user_answer, correct_answer):
        self._ensure_client()
        prompt = f"""Eres el Tutor IA de Saberly. Ayudas a estudiantes con el ICFES.
        Contexto:
        Pregunta: '{question_text}'
        Respuesta estudiante: '{user_answer}'
        Respuesta correcta: '{correct_answer}'
        
        Reglas: Explica el concepto, sé motivador, no des la respuesta directa si falló."""
        try:
            response = self.client.models.generate_content(
                model=self.model_name,
                contents=prompt
            )
            return response.text.strip()
        except Exception as e:
            print(f"Error llamando a Google GenAI (Gemma 4): {str(e)}")
            raise e

    def generar_pregunta_entrenamiento(self, debilidad, dificultad, tipo_error_frecuente=None):
        """
        Genera una pregunta de opción múltiple adaptativa e inteligente con su respectiva pista,
        ejemplo similar resuelto y explicación detallada, utilizando Gemma 4.
        """
        self._ensure_client()
        
        tipo_error_context = ""
        if tipo_error_frecuente:
            tipo_error_context = f"El estudiante suele cometer errores de tipo '{tipo_error_frecuente}'. Diseña los distractores (opciones incorrectas) para abordar este error común."

        prompt = f"""Eres un tutor pedagógico de alto nivel especializado en las pruebas del estado ICFES de Colombia y experto en el modelo Gemma 4.
Genera un ejercicio interactivo adaptado para entrenar la debilidad del estudiante: '{debilidad}'.
La dificultad de la pregunta debe ser: '{dificultad}'.
{tipo_error_context}

Usa el formato oficial de preguntas del ICFES de selección múltiple con única respuesta (4 opciones: una correcta y tres distractores plausibles).
Genera también las tres fases del andamiaje (scaffolding) de aprendizaje:
1. Pista (Nivel 1): Una pista corta, socrática y motivadora en español que guíe al estudiante sin darle la respuesta. (Máximo 2 líneas).
2. Ejemplo Guiado (Nivel 2): Un ejercicio similar resuelto paso a paso (enunciado más simple, resolución y resultado) para corregir el tipo de error.
3. Explicación Completa (Nivel 3): La explicación detallada y clara de por qué la opción correcta es la adecuada y por qué las otras fallan.

Devuelve únicamente un objeto JSON con la siguiente estructura (no agregues texto fuera del JSON, usa markdown limpio para las fórmulas si es necesario):
{{
  "enunciado": "Enunciado completo de la pregunta contextualizado al estilo ICFES...",
  "dificultad": "{dificultad}",
  "opciones": [
    {{"texto": "Texto de la opción correcta...", "es_correcta": true}},
    {{"texto": "Texto de distractor plausible 1...", "es_correcta": false}},
    {{"texto": "Texto de distractor plausible 2...", "es_correcta": false}},
    {{"texto": "Texto de distractor plausible 3...", "es_correcta": false}}
  ],
  "pista": "Texto de la pista socrática...",
  "ejemplo": "### Problema Similar\\n...\\n### Solución paso a paso\\n...",
  "explicacion": "Explicación detallada..."
}}"""

        try:
            response = self.client.models.generate_content(
                model=self.model_name,
                contents=prompt
            )
            return self._extract_json(response.text.strip())
        except Exception as e:
            print(f"Error generando pregunta de entrenamiento con Gemma: {str(e)}")
            # Fallback local en caso de error de la API
            return {
                "enunciado": f"Pregunta de refuerzo sobre {debilidad} (Modo Local). ¿Cuál de las siguientes describe mejor la aplicación del concepto en un problema ICFES?",
                "dificultad": dificultad,
                "opciones": [
                    {"texto": f"La opción correcta que resuelve la debilidad sobre {debilidad}.", "es_correcta": True},
                    {"texto": "Opción de error común conceptual.", "es_correcta": False},
                    {"texto": "Opción de error procedimental.", "es_correcta": False},
                    {"texto": "Opción por lectura descuidada.", "es_correcta": False}
                ],
                "pista": f"Recuerda que en {debilidad} debes relacionar adecuadamente las variables o la regla principal.",
                "ejemplo": f"### Problema Similar de {debilidad}\nSi 2 variables son proporcionales y una se duplica, ¿qué pasa con la otra?\n\n### Solución paso a paso\nMultiplica la segunda por 2. Por tanto, también se duplica.",
                "explicacion": f"Explicación local: La definición formal del concepto {debilidad} requiere que se cumplan las propiedades mostradas en la opción correcta."
            }

