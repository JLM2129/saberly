# Ciencia Loca - Backend (Simulador ICFES)

Este es el backend oficial para la aplicación **Ciencia Loca**, construido con Django, Django Rest Framework y PostgreSQL.

## 🚀 Requisitos Previos
- Python 3.10+
- PostgreSQL instalado y corriendo.
- Virtualenv recomendado.

## 🛠️ Instalación y Configuración

1. **Crear entorno virtual**
   ```bash
   python -m venv venv
   # Windows
   .\venv\Scripts\activate
   # Linux/Mac
   source venv/bin/activate
   ```

2. **Instalar dependencias**
   ```bash
   pip install -r requirements.txt
   ```

3. **Configurar Variables de Entorno**
   - Copia el archivo `.env.example` a `.env` en `backend/`.
   - Modifica los valores de base de datos y llaves secretas.

4. **Base de Datos**
   - Asegúrate de crear la base de datos en Postgres:
     ```sql
     CREATE DATABASE ciencia_loca_db;
     ```
   - Corre las migraciones (desde la carpeta `backend/`):
     ```bash
     cd backend
     python manage.py makemigrations
     python manage.py migrate
     ```

5. **Crear Superusuario**
   ```bash
   python manage.py createsuperuser
   ```

6. **Correr el Servidor**
   ```bash
   python manage.py runserver
   ```

## 📂 Estructura del Proyecto

- **apps/users**: Gestión de usuarios, autenticación JWT, registro.
- **apps/preguntas**: Banco de preguntas, Áreas, Subáreas.
  - *Modelos*: Area, SubArea, Pregunta, OpcionRespuesta.
- **apps/simulacros**: Lógica para generar exámenes aleatorios y guardar resultados.
  - *Endpoints*: `/api/simulacros/generar/`, `/api/simulacros/{id}/finalizar/`.
- **apps/estadisticas**: Consultas de rendimiento del estudiante.

## 🔒 Endpoints Principales

- **Auth**:
  - `POST /api/users/login/` - Obtener Token JWT.
  - `POST /api/users/register/` - Crear cuenta.
- **Simulacros**:
  - `POST /api/simulacros/generar/` - `{ "cantidad": 10, "areas": [] }`.
  - `POST /api/simulacros/{id}/finalizar/` - Enviar respuestas para calificar.

## ☁️ Recomendaciones para Despliegue y Escalabilidad

1. **Servidor WSGI/ASGI**: En producción, no uses `runserver`. Usa **Gunicorn** o **Uvicorn**.
2. **Base de Datos**: Usa un servicio gestionado como **AWS RDS** o **DigitalOcean Managed Databases** para PostgreSQL.
3. **Archivos Estáticos**: Configurar `Whitenoise` o servir archivos estáticos via Nginx/S3 si la app crece.
4. **Seguridad**:
   - `DEBUG=False` en producción.
   - Configurar `CORS_ALLOWED_ORIGINS` estrictamente al dominio del frontend.
5. **Cache**: Implementar **Redis** para cachear respuestas de preguntas frecuentes o estadísticas pesadas.
6. **Docker**: Contenerizar la aplicación con Docker para facilitar el despliegue en cualquier plataforma (AWS ECS, Kubernetes, etc.).

## 🧪 Testing
Para correr tests (cuando se implementen):
```bash
python manage.py test
```
