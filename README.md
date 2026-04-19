# Saberly 🎓 - Democratizing ICFES Success with Gemma 4
# Saberly 🎓 - Democratizando el Éxito en el ICFES con Gemma 4

[English](#english) | [Español](#español)

---

## English

**Saberly** is more than just a study application; it is a project with a deep **social purpose** designed to close the educational gap in Colombia. By integrating the power of Google's open models, specifically **Gemma 4**, we have created the first intelligent tutor adapted to the regional context of standardized tests (ICFES), allowing any student, regardless of their socioeconomic level, to have access to premium preparation.

### 🌍 Social and Regional Impact: The Soul of Saberly
In Colombia, access to ICFES preparation courses is often limited by cost. Saberly breaks this barrier using cutting-edge artificial intelligence to:
*   **Knowledge Regionalization**: The AI Tutor is pre-trained to understand the competency structure (Citizenship, Critical Reading, etc.) specific to the Colombian reality.
*   **Technological Inclusivity**: Thanks to its nature as a PWA and its **Offline Mode**, Saberly reaches areas with limited connectivity, allowing knowledge to flow where other resources fail.
*   **24/7 Mentorship**: We democratize access to a high-level "private teacher" (Gemma 4) that guides each student's critical reasoning in a personalized way.

### ✨ Features Powered by Gemma 4

#### 🧠 AI Tutor with Gemma's Soul
Saberly's intelligence resides in **Gemma 4**. Unlike generic systems, our implementation focuses on *Socratic reasoning*:
*   **Error Logic Analysis**: It doesn't just say what's wrong; it understands *why* the student might have been confused.
*   **Contextualized Explanations**: Uses regional analogies and clear language to make complex test concepts easy to digest.
*   **Autonomy Promotion**: Guides the user toward the correct answer by reinforcing competencies instead of just delivering results.

#### 🃏 Personalized Reinforcement Flashcard Generator
We don't just explain the error; we help prevent it from happening again. Gemma analyzes the **5 topics with the highest error rate** and automatically generates a personalized study deck:
*   **"Master Concept" Focus**: Instead of simple questions, it generates cards with the key concept and a **"Golden Rule"** specific to the ICFES.
*   **Active Recall**: Transforms failures into a dynamic learning tool, allowing students to review high-pedagogical-value syntheses designed by the IA.
*   **Intelligent Persistence**: Cards are saved to the user profile for spaced and constant review.

#### 📝 Dynamic and Intelligent Mock Exams
We use selection algorithms that replicate the real distribution of ICFES topics, allowing practice focused on the areas of greatest impact for the student.

#### ⚔️ Real-Time Multiplayer Duels
Gamification as a learning engine. Students can compete in real-time, turning exam preparation into a social and motivating process.

### 🛠️ Tech Stack: Powered by Gemma 4
*   **The Engine (Gemma 4)**: We use **Gemma 4 (Open Weights Model)** as the brain. Accessed via **Google GenAI API** for maximum stability and performance.
*   **Frontend**: React 19 + Vite.
*   **Backend**: Django 5.x + DRF.
*   **Persistence**: PostgreSQL + LocalStorage (Offline support).

### 🚀 Quick Start Guide
1. **Gemma Configuration**:
   ```env
   GEMMA_API_KEY=your_gemma_api_key_here
   GEMMA_MODEL_ID=gemma-4-31b-it
   ```
2. **Deploy with Docker**:
   ```bash
   docker-compose up --build
   ```

---

## Español

**Saberly** no es solo una aplicación de estudio; es un proyecto con un profundo **propósito social** diseñado para cerrar la brecha educativa en Colombia. Al integrar el poder de los modelos abiertos de Google, específicamente **Gemma 4**, hemos creado el primer tutor inteligente adaptado al contexto regional de las pruebas de estado (ICFES).

### 🌍 Impacto Social y Regional: El Alma de Saberly
En Colombia, el acceso a cursos de preparación suele estar limitado por el costo. Saberly rompe esta barrera para:
*   **Regionalización del Conocimiento**: Entiende la estructura de competencias (Ciudadanas, Lectura Crítica, etc.) de la realidad colombiana.
*   **Inclusividad Tecnológica**: Como PWA y con **Modo Offline**, llega a zonas con conectividad limitada.
*   **Mentoría 24/7**: Democratizamos el acceso a un "profesor particular" de alto nivel (Gemma 4).

### ✨ Características Potenciadas por Gemma 4

#### 🧠 Tutor IA con Alma de Gemma
Nuestra implementación se enfoca en el *razonamiento socrático*:
*   **Analiza la lógica del error**: Entiende *por qué* el estudiante se confundió.
*   **Explicaciones Contextualizadas**: Usa analogías regionales y lenguaje claro.
*   **Fomento de la Autonomía**: Guía al usuario hacia la respuesta correcta reforzando competencias.

#### 🃏 Generador de Flashcards de Refuerzo
Gemma analiza los **5 temas con mayor índice de error** y genera automáticamente un mazo de estudio personalizado:
*   **Enfoque en el "Concepto Maestro"**: Cartas con el concepto clave y una **"Regla de Oro"** para el ICFES.
*   **Active Recall (Recuerdo Activo)**: Transforma los fallos en una herramienta de aprendizaje dinámico.
*   **Persistencia Inteligente**: Las cartas se guardan en el perfil del usuario.

#### 📝 Simulacros Dinámicos e Inteligentes
Replican la distribución real de temas del ICFES para una práctica enfocada.

#### ⚔️ Duelos Multijugador Real-Time
Los estudiantes pueden competir en tiempo real, convirtiendo el estudio en un proceso social.

### 🛠️ Stack Tecnológico: Impulsado por Gemma 4
*   **El Motor (Gemma 4)**: Usado como el cerebro de la plataforma vía **Google GenAI API**.
*   **Frontend**: React 19 + Vite.
*   **Backend**: Django 5.x + DRF.
*   **Persistencia**: PostgreSQL + LocalStorage.

### 🚀 Guía de Inicio Rápido
1. **Configuración de Gemma**:
   ```env
   GEMMA_API_KEY=tu_gemma_api_key_aqui
   GEMMA_MODEL_ID=gemma-4-31b-it
   ```
2. **Despliegue con Docker**:
   ```bash
   docker-compose up --build
   ```

---

**Saberly** - *Collective Intelligence, Bright Future. Powered by Gemma 4.* 🚀
**Saberly** - *Inteligencia Colectiva, Futuro Brillante. Impulsado por Gemma 4.* 🚀
