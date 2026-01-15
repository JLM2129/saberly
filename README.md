# Saberly 🎓

**Saberly** es una plataforma integral para la preparación de exámenes de estado (ICFES), diseñada para ofrecer una experiencia de usuario fluida tanto en entornos web como móviles gracias a su naturaleza como PWA.

## ✨ Características Principales

- **Simulacros Dinámicos:** Generación de exámenes basados en áreas específicas cargadas desde JSON.
- **Modo Offline:** Capacidad de persistencia local para continuar estudios sin conexión.
- **Arquitectura Robusta:** Backend escalable con Django REST Framework y Frontend reactivo con React + Vite.
- **PWA Ready:** Instalable en dispositivos móviles para acceso rápido.

## 🛠️ Stack Tecnológico

| Componente | Tecnología |
| :--- | :--- |
| **Frontend** | React 18, Vite, Tailwind CSS, Vite PWA Plugin |
| **Backend** | Django 5.x, Django REST Framework, SimpleJWT |
| **Base de Datos** | PostgreSQL |
| **Contenedores** | Docker & Docker Compose |

---

## 🚀 Guía de Inicio Rápido

### 1. Requisitos
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) instalado.
- Git.

### 2. Instalación
Clona el proyecto y entra en la carpeta:
```bash
git clone [https://github.com/JLM2129/saberly.git](https://github.com/JLM2129/saberly.git)
cd saberly

3. Despliegue con Docker
Construye y levanta todos los servicios (Frontend, Backend, DB):

docker-compose up --build

4. Configuración de Base de Datos
En una nueva terminal, aplica las migraciones y carga los datos de los simulacros:

# Aplicar tablas
docker exec -it pruebas_app-backend-1 python manage.py migrate

# Importar preguntas y áreas desde JSON
docker exec -it pruebas_app-backend-1 python manage.py import_icfes_json

# Crear acceso al administrador
docker exec -it pruebas_app-backend-1 python manage.py createsuperuser

📂 Estructura del Repositorio
/backend: Contiene la lógica del servidor, modelos de Preguntas, Simulacros y la configuración de la API.

/frontend: Aplicación SPA en React con configuración para Service Workers (PWA).

docker-compose.yml: Orquestación de los contenedores para desarrollo.

📱 Modo Offline
El proyecto utiliza localStorage y un Service Worker para permitir que el usuario visualice simulacros previamente cargados incluso si el servidor backend no está disponible.



