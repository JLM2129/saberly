import json
import os

paths = [
    r'preguntas\ciencias_naturales.json',
    r'preguntas\lectura_critica.json',
    r'preguntas\matematicas.json',
    r'preguntas\sociales.json'
]

total_questions = 0
for p in paths:
    abs_p = os.path.join(r'c:\Users\HP\Documents\pruebas_app\backend', p)
    try:
        with open(abs_p, 'r', encoding='utf-8') as f:
            data = json.load(f)
            count = 0
            if isinstance(data, dict) and 'contextos' in data:
                for ctx in data['contextos']:
                    if 'preguntas' in ctx:
                        count += len(ctx['preguntas'])
            elif isinstance(data, list):
                # Fallback if some files are just lists of questions (maybe older version?)
                count = len(data)
            
            print(f'{p}: {count} questions')
            total_questions += count
    except Exception as e:
        print(f'Error reading {p}: {e}')

print(f'\nTotal questions in JSON files: {total_questions}')
