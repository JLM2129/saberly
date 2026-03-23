# Panel de Docentes - Guía de Uso

## Descripción General

El Panel de Docentes es una funcionalidad especial que permite a los usuarios con credenciales de docente agregar nuevas preguntas al banco de preguntas del sistema.

## Características Principales

### 1. **Control de Acceso**
- Solo usuarios con el flag `is_teacher` activado pueden acceder al panel
- Los docentes verán un enlace especial "📚 Panel Docente" en la barra de navegación
- Protección mediante permisos personalizados en el backend

### 2. **Creación de Preguntas**
El formulario permite crear preguntas completas con:

#### Clasificación
- **Área**: Matemáticas, Lectura Crítica, Ciencias Naturales, Sociales, etc.
- **Subárea**: (Opcional) Categoría específica dentro del área
- **Tipo de Pregunta**: Selección múltiple, asociada a contexto, interpretación, etc.
- **Dificultad**: Fácil, Media, Difícil
- **Competencia**: Interpretar, Argumentar, Proponer, etc.

#### Contexto (Opcional)
- Permite agregar un contexto compartido para la pregunta
- Tipos disponibles: Texto, Imagen, Tabla, Gráfica, Audio
- Campos:
  - Título del contexto
  - Contenido del contexto

#### Enunciado
- Texto principal de la pregunta
- Opción para agregar URL de imagen (opcional)

#### Opciones de Respuesta
- Mínimo 2 opciones, máximo ilimitado
- Cada opción tiene:
  - Texto de la opción
  - Checkbox para marcar como correcta
- **Validaciones automáticas**:
  - Al menos 2 opciones con texto
  - Exactamente 1 opción marcada como correcta
  - Botón para agregar/eliminar opciones

#### Explicación
- Campo para explicar por qué la respuesta es correcta
- Ayuda a los estudiantes a aprender de sus errores

### 3. **Validaciones**
El sistema incluye validaciones tanto en frontend como backend:
- Campos obligatorios marcados con *
- Verificación de que hay opciones suficientes
- Verificación de que existe una (y solo una) respuesta correcta
- Mensajes de error claros y específicos

### 4. **Feedback Visual**
- Mensajes de éxito en verde cuando se crea la pregunta
- Mensajes de error en rojo si algo falla
- Estados de carga con botón deshabilitado durante el proceso

## Cómo Activar un Docente

### Método 1: Admin de Django
1. Acceder al panel de administración de Django (`/admin`)
2. Ir a "Users"
3. Seleccionar el usuario que será docente
4. Marcar el checkbox "Is teacher"
5. Guardar cambios

### Método 2: Mediante Python Shell
```bash
cd c:\Users\HP\Documents\pruebas_app\backend
python manage.py shell
```

Luego ejecutar:
```python
from apps.users.models import User

# Activar docente por email
user = User.objects.get(email='docente@ejemplo.com')
user.is_teacher = True
user.save()

# Verificar
print(f"{user.email} es docente: {user.is_teacher}")
```

### Método 3: Mediante Script
Crear un archivo `make_teacher.py` en el directorio backend:

```python
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.users.models import User

email = input("Ingrese el email del usuario: ")
try:
    user = User.objects.get(email=email)
    user.is_teacher = True
    user.save()
    print(f"✅ {user.email} ahora es docente")
except User.DoesNotExist:
    print(f"❌ No existe usuario con email {email}")
```

Ejecutar:
```bash
python make_teacher.py
```

## Endpoints de la API

### Para Docentes

**POST** `/api/preguntas/teacher/`
- Crear una nueva pregunta
- Requiere autenticación y permisos de docente
- Body (JSON):
```json
{
  "area": 1,
  "subarea": null,
  "enunciado": "¿Cuál es la capital de Colombia?",
  "tipo": "seleccion_unica",
  "dificultad": "facil",
  "competencia": "interpretar",
  "explicacion": "Bogotá es la capital de Colombia desde 1991.",
  "imagen_url": null,
  "opciones": [
    {
      "texto": "Bogotá",
      "es_correcta": true,
      "orden": 0
    },
    {
      "texto": "Medellín",
      "es_correcta": false,
      "orden": 1
    },
    {
      "texto": "Cali",
      "es_correcta": false,
      "orden": 2
    },
    {
      "texto": "Barranquilla",
      "es_correcta": false,
      "orden": 3
    }
  ],
  "contexto_data": null
}
```

**GET** `/api/preguntas/teacher/`
- Listar todas las preguntas
- Requiere autenticación y permisos de docente

**GET** `/api/preguntas/teacher/{id}/`
- Obtener detalles de una pregunta específica
- Requiere autenticación y permisos de docente

**PUT/PATCH** `/api/preguntas/teacher/{id}/`
- Actualizar una pregunta existente
- Requiere autenticación y permisos de docente

**DELETE** `/api/preguntas/teacher/{id}/`
- Eliminar una pregunta
- Requiere autenticación y permisos de docente

**GET** `/api/preguntas/teacher/my_questions/`
- Obtener todas las preguntas creadas (útil para estadísticas)
- Requiere autenticación y permisos de docente

## Flujo de Uso

1. **Login**: El docente inicia sesión con sus credenciales
2. **Acceso al Panel**: Hace clic en "📚 Panel Docente" en la navbar
3. **Completar Formulario**: 
   - Selecciona el área
   - Escribe el enunciado
   - Agrega las opciones de respuesta
   - Marca la opción correcta
   - (Opcional) Agrega contexto y explicación
4. **Validación**: El sistema valida automáticamente los datos
5. **Guardar**: Al hacer clic en "Guardar Pregunta", se crea la pregunta
6. **Confirmación**: Mensaje de éxito y formulario limpio para crear otra pregunta

## Buenas Prácticas

### Para Crear Preguntas de Calidad

1. **Enunciado Claro**
   - Redactar de forma clara y sin ambigüedades
   - Usar lenguaje apropiado para el nivel de los estudiantes

2. **Opciones de Respuesta**
   - Todas las opciones deben ser plausibles
   - Evitar opciones obviamente incorrectas
   - Mantener similar longitud en todas las opciones

3. **Explicación Detallada**
   - Explicar por qué la respuesta es correcta
   - Indicar por qué las otras opciones son incorrectas
   - Proporcionar contexto adicional si es útil

4. **Uso de Contextos**
   - Agregar contexto cuando la pregunta lo requiere
   - Usar contextos realistas y educativos
   - Asegurar que el contexto sea necesario para responder

5. **Clasificación Adecuada**
   - Seleccionar el área y subárea correctas
   - Elegir el nivel de dificultad apropiado
   - Asignar la competencia que realmente evalúa

## Solución de Problemas

### "No tienes permisos de docente"
- Verificar que el flag `is_teacher` esté activado en tu cuenta
- Contactar al administrador del sistema

### "Debe haber al menos una opción correcta"
- Revisar que hayas marcado el checkbox de una de las opciones

### "Solo puede haber una opción correcta"
- Asegurarse de que solo una opción tenga el checkbox marcado

### "Debe haber al menos 2 opciones con texto"
- Completar el texto de al menos 2 opciones de respuesta

### Error al guardar
- Verificar la conexión a internet
- Revisar la consola del navegador para más detalles
- Verificar que todos los campos obligatorios estén completos

## Seguridad

- Todas las peticiones requieren autenticación mediante JWT
- Solo usuarios con `is_teacher=True` pueden acceder
- Validaciones en backend para prevenir datos inválidos
- Protección CSRF habilitada

## Futuras Mejoras

- [ ] Editor de texto enriquecido para enunciados
- [ ] Upload de imágenes directo (sin URLs)
- [ ] Previsualización de la pregunta antes de guardar
- [ ] Estadísticas de preguntas creadas por docente
- [ ] Edición de preguntas existentes desde el panel
- [ ] Importación masiva de preguntas desde CSV/Excel
- [ ] Duplicar pregunta existente para crear variaciones
