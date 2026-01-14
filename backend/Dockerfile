# Usar imagen base ligera de Python 3.11
FROM python:3.11-slim-bookworm

# Prevenir que Python escriba archivos .pyc y forzar logs a stdout
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Establecer directorio de trabajo
WORKDIR /app

# Instalar dependencias del sistema necesarias
# No se requieren compiladores para psycopg2-binary ni Pillow en esta imagen base
# RUN apt-get update && apt-get install -y --no-install-recommends \
#     gcc \
#     libpq-dev \
#     && rm -rf /var/lib/apt/lists/*

# Copiar requirements e instalar dependencias
COPY requirements.txt .
RUN pip install --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copiar el código del proyecto
COPY . .

# Exponer el puerto
EXPOSE 8000

# Comando por defecto (será sobreescrito por docker-compose normalmente)
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]
