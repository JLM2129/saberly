import os

from google import genai


def get_api_key():
    return os.getenv('GEMINI_API_KEY') or os.getenv('GEMMA_API_KEY')


def get_model_name():
    return os.getenv('GEMINI_MODEL_ID') or os.getenv('GEMMA_MODEL_ID') or 'gemini-2.5-flash'


def create_client():
    api_key = get_api_key()
    if not api_key:
        raise ValueError('No hay una API key de IA configurada')
    return genai.Client(api_key=api_key)