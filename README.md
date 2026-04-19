# Saberly 🎓 - Democratizando el Éxito en el ICFES con Gemma 4

**Saberly** no es solo una aplicación de estudio; es un proyecto con un profundo **propósito social** diseñado para cerrar la brecha educativa en Colombia. Al integrar el poder de los modelos abiertos de Google, específicamente **Gemma 4**, hemos creado el primer tutor inteligente adaptado al contexto regional de las pruebas de estado (ICFES), permitiendo que cualquier estudiante, sin importar su nivel socioeconómico, tenga acceso a una preparación premium.

---

## 🌍 Impacto Social y Regional: El Alma de Saberly

En Colombia, el acceso a cursos de preparación para el ICFES suele estar limitado por el costo. Saberly rompe esta barrera utilizando inteligencia artificial de vanguardia para:

*   **Regionalización del Conocimiento**: El Tutor IA está pre-entrenado para entender la estructura de competencias (Ciudadanas, Lectura Crítica, etc.) específicas de la realidad colombiana.
*   **Inclusividad Tecnológica**: Gracias a su naturaleza como PWA y su **Modo Offline**, Saberly llega a zonas con conectividad limitada, permitiendo que el conocimiento fluya donde otros recursos fallan.
*   **Mentoría 24/7**: Democratizamos el acceso a un "profesor particular" de alto nivel (Gemma 4) que guía el razonamiento crítico de cada estudiante de manera personalizada.

---

## ✨ Características Potenciadas por Gemma 4

### 🧠 Tutor IA con Alma de Gemma
La inteligencia de Saberly reside en **Gemma 4**. A diferencia de otros sistemas genéricos, nuestra implementación se enfoca en el *razonamiento socrático*. Al interactuar con el estudiante:
*   **Analiza la lógica del error**: No solo dice qué está mal, sino que entiende *por qué* el estudiante pudo confundirse.
*   **Explicaciones Contextualizadas**: Utiliza analogías regionales y lenguaje claro para que los conceptos complejos de las pruebas de estado sean fáciles de digerir.
*   **Fomento de la Autonomía**: Guía al usuario hacia la respuesta correcta reforzando competencias en lugar de solo entregar resultados.

### 🃏 Generador de Flashcards de Refuerzo
No solo explicamos el error, ayudamos a que no se repita. Gemma analiza los **5 temas con mayor índice de error** del estudiante y genera automáticamente un mazo de estudio personalizado:
*   **Enfoque en el "Concepto Maestro"**: En lugar de simples preguntas, genera cartas con el concepto clave y una **"Regla de Oro"** específica para el ICFES.
*   **Active Recall (Recuerdo Activo)**: Transforma los fallos en una herramienta de aprendizaje dinámico, permitiendo al estudiante repasar síntesis de alto valor pedagógico diseñadas por la IA.
*   **Persistencia Inteligente**: Las cartas se guardan en el perfil del usuario para un repaso espaciado y constante.

### 📝 Simulacros Dinámicos e Inteligentes
Utilizamos algoritmos de selección que replican la distribución real de temas del ICFES, permitiendo una práctica enfocada en las áreas de mayor impacto para el estudiante.

### ⚔️ Duelos Multijugador Real-Time
La gamificación como motor de aprendizaje. Los estudiantes pueden competir en tiempo real, convirtiendo la preparación para el examen en un proceso social y motivador.

---

## 🛠️ Stack Tecnológico: Impulsado por Gemma 4

Saberly aprovecha la potencia de los modelos abiertos más avanzados de la industria:

### **El Motor: Gemma 4**
Utilizamos **Gemma 4 (Open Weights Model)** como el cerebro de nuestra plataforma. Para garantizar la máxima latencia y estabilidad en una aplicación de alto tráfico, accedemos a este modelo a través de la infraestructura de **Google GenAI API**, lo que nos permite escalar la tutoría inteligente a miles de estudiantes simultáneamente sin perder la calidad del razonamiento que solo Gemma puede ofrecer.

### **Arquitectura de Software**
- **Frontend**: React 19 + Vite (Diseño premium con CSS moderno y animaciones fluidas).
- **Backend**: Django 5.x + DRF (Seguridad y robustez para la gestión de datos).
- **Persistencia**: PostgreSQL y LocalStorage para soporte offline.

---

## 🚀 Guía de Inicio Rápido

### 1. Configuración de Gemma
Para activar el Tutor IA, necesitas configurar las credenciales de acceso a Gemma:
```env
GEMMA_API_KEY=tu_gemma_api_key_aqui
GEMMA_MODEL_ID=gemma-4-31b-it
```
*Nota: La `GEMMA_API_KEY` se obtiene a través del panel de Google AI Studio, permitiendo el acceso de alto rendimiento a los modelos Gemma.*

### 2. Despliegue con Docker
Levanta la plataforma completa con un solo comando:
```bash
docker-compose up --build
```

### 3. Educación Robusta: Modo Fallback
Entendemos que el acceso a la tecnología puede fallar. Por ello, el **Tutor IA cuenta con un Modo Fallback robusto**. Si el servicio de IA es inaccesible, el sistema activa explicaciones técnicas pre-programadas que mantienen la calidad educativa. Esto convierte a Saberly en una herramienta **resiliente y pedagógicamente infalible** ante cortes de red.

---

**Saberly** - *Inteligencia Colectiva, Futuro Brillante. Impulsado por Gemma 4.* 🚀
