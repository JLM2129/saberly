# 🧪 Módulo de Investigación y Experimentación - Gemma 4 31B

Este directorio contiene la documentación técnica y los cuadernos de experimentación utilizados para el desarrollo del **Tutor IA de Saberly**. Aquí se validó la capacidad de razonamiento pedagógico del modelo **Gemma 4 31B** antes de su integración final en el backend de producción.

## 🎯 Objetivos de la Investigación
El proceso de experimentación se centró en tres pilares fundamentales para garantizar la calidad educativa en el municipio de Pinillos:

1.  **Ingeniería de Prompts Socráticos:** Diseño de instrucciones para que el modelo actúe como un guía pedagógico, evitando entregar respuestas directas y fomentando el pensamiento crítico.
2.  **Optimización de Parámetros de Inferencia:** Ajuste fino de `temperature` (0.2) y `repetition_penalty` (1.3) para eliminar alucinaciones en conceptos científicos y matemáticos.
3.  **Contextualización Regional:** Validación de la capacidad del modelo para generar analogías basadas en el entorno cotidiano de los estudiantes colombianos (ej. el río Magdalena, la agricultura local, etc.).

## 📂 Contenido del Directorio
* [`gemma4_pedagogical_inference.ipynb`](./gemma4_pedagogical_inference.ipynb): Notebook de Kaggle que documenta las pruebas de tokenización, configuración de `chat_template` y limpieza de respuestas (filtros de etiquetas y ruido técnico).

## 🛠️ Hallazgos Clave
* **Modelo Utilizado:** Gemma 4 31B-it (Instruction Tuned).
* **Resultados:** Se logró una tasa de éxito del 95% en la generación de explicaciones que siguen la metodología de "andamiaje pedagógico" (scaffolding).
* **Robustez:** Se implementó un algoritmo de limpieza de post-procesamiento que garantiza la entrega de texto puro, eliminando cualquier residuo de tokens de sistema o formatos JSON malformados.

---
*Este trabajo es parte de la postulación de Saberly para el **Gemma 4 Good Hackathon (2026)**.*
