import json
import os
from collections import Counter

paths = [
    r'preguntas\lectura_critica.json',
    r'preguntas\matematicas.json'
]

for p in paths:
    abs_p = os.path.join(r'c:\Users\HP\Documents\pruebas_app\backend', p)
    try:
        with open(abs_p, 'r', encoding='utf-8') as f:
            data = json.load(f)
            enunciados = []
            if isinstance(data, dict) and 'contextos' in data:
                for ctx in data['contextos']:
                    if 'preguntas' in ctx:
                        for preg in ctx['preguntas']:
                            if 'enunciado' in preg:
                                enunciados.append(preg['enunciado'])
            
            counts = Counter(enunciados)
            duplicates = {e: c for e, c in counts.items() if c > 1}
            
            print(f'\n--- {p} ---')
            print(f'Total enunciados: {len(enunciados)}')
            if duplicates:
                print('Duplicates found:')
                for e, c in duplicates.items():
                    print(f'  "{e[:50]}...": {c} times')
            else:
                print('No duplicate enunciados found.')
                
    except Exception as e:
        print(f'Error reading {p}: {e}')
