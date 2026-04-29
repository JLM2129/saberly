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
