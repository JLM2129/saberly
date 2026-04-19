import os
import re
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
        self.api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GEMMA_API_KEY")
        self.client = None
        if self.api_key:
            self.client = genai.Client(api_key=self.api_key)
        
        # Powering the soul of Saberly with Gemma 4
        self.model_name = os.getenv("GEMMA_MODEL_ID", "gemini-1.5-flash")

    def generate_explanation(self, question_text, user_answer, correct_answer):
        if not self.client:
            # Re-initialize client if key exists but client doesn't
            self.api_key = os.getenv("GEMMA_API_KEY")
            if self.api_key:
                self.client = genai.Client(api_key=self.api_key)
            else:
                raise ValueError("GEMINI_API_KEY no encontrada en el archivo .env")

        # Prompt estructurado
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
