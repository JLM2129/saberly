# 📚 Panel de Docentes - Quick Start

## ✨ Funcionalidad Implementada

Se ha implementado un **Panel de Docentes** que permite a usuarios con credenciales especiales agregar preguntas con sus respuestas al banco de preguntas.

## 🚀 Inicio Rápido

### 1. Activar un Docente

Opción más fácil usando el script interactivo:

```bash
cd backend
python make_teacher.py
```

El script te mostrará un menú con opciones para:
- ✅ Convertir usuario en docente
- ❌ Remover permisos de docente
- 📋 Listar todos los docentes
- 👥 Listar todos los usuarios

### 2. Acceder al Panel

1. Iniciar sesión con una cuenta de docente
2. Verás un botón **"📚 Panel Docente"** en la barra de navegación
3. ¡Haz clic y comienza a crear preguntas!

## 📁 Archivos Creados/Modificados

### Backend
- ✅ `apps/users/models.py` - Campo `is_teacher` agregado
- ✅ `apps/preguntas/serializers.py` - Serializers para crear preguntas
- ✅ `apps/preguntas/views.py` - ViewSet para docentes con permisos
- ✅ `apps/preguntas/urls.py` - Ruta `/api/preguntas/teacher/`
- ✅ `apps/users/serializers.py` - Campo `is_teacher` expuesto
- ✅ `make_teacher.py` - Script de utilidad
- ✅ `apps/users/migrations/0002_user_is_teacher.py` - Migración aplicada

### Frontend
- ✅ `src/pages/TeacherPanel.jsx` - Componente principal
- ✅ `src/pages/TeacherPanel.css` - Estilos del panel
- ✅ `src/components/Navbar.jsx` - Mostrar enlace para docentes
- ✅ `src/App.jsx` - Ruta `/teacher-panel`

### Documentación
- ✅ `TEACHER_PANEL_GUIDE.md` - Guía completa de uso

## 🎨 Características del Panel

### Formulario Completo de Preguntas
- 📝 Clasificación (Área, Subárea, Tipo, Dificultad, Competencia)
- 📄 Contexto opcional (Texto, Imagen, Tabla, Gráfica)
- ❓ Enunciado con opción de imagen
- ✔️ Opciones de respuesta (mínimo 2, agregar/eliminar dinámicamente)
- 💡 Explicación de la respuesta correcta

### Validaciones Automáticas
- ✅ Al menos 2 opciones con texto
- ✅ Exactamente 1 respuesta correcta
- ✅ Campos obligatorios validados
- ✅ Mensajes de error claros

### UI Moderna
- 🎨 Diseño con glassmorphism
- 🌈 Gradientes y animaciones
- 📱 Responsive design
- ✨ Feedback visual inmediato

## 🔐 Seguridad

- 🔒 Solo usuarios con `is_teacher=True` pueden acceder
- 🔑 Autenticación JWT requerida
- 🛡️ Validaciones tanto en frontend como backend
- ⚡ Permisos personalizados en Django REST Framework

## 📡 Endpoints de API

```
POST   /api/preguntas/teacher/              # Crear pregunta
GET    /api/preguntas/teacher/              # Listar preguntas
GET    /api/preguntas/teacher/{id}/         # Detalles de pregunta
PUT    /api/preguntas/teacher/{id}/         # Actualizar pregunta
DELETE /api/preguntas/teacher/{id}/         # Eliminar pregunta
GET    /api/preguntas/teacher/my_questions/ # Mis preguntas
```

## 📖 Ejemplo de Uso

### 1. Convertir usuario en docente
```bash
python make_teacher.py
# Seleccionar opción 1
# Ingresar email del usuario
```

### 2. Crear una pregunta desde el panel

```
1. Login como docente
2. Click en "📚 Panel Docente"
3. Seleccionar área (ej: Matemáticas)
4. Escribir enunciado: "¿Cuánto es 2 + 2?"
5. Agregar opciones:
   - Opción A: "3" 
   - Opción B: "4" ✓ (marcar como correcta)
   - Opción C: "5"
   - Opción D: "6"
6. Agregar explicación
7. Click en "Guardar Pregunta"
```

## 🐛 Solución de Problemas

| Problema | Solución |
|----------|----------|
| No veo el enlace "Panel Docente" | Verificar que `is_teacher=True` en tu usuario |
| Error "No tienes permisos" | Ejecutar `python make_teacher.py` |
| Error al guardar pregunta | Verificar que hay exactamente 1 respuesta correcta |
| No aparecen las áreas | Verificar que existen áreas en la base de datos |

## 📚 Documentación Completa

Para más detalles, consulta `TEACHER_PANEL_GUIDE.md`

## 🎯 Próximos Pasos Recomendados

1. ✅ Crear algunos usuarios de prueba
2. ✅ Convertirlos en docentes con `make_teacher.py`
3. ✅ Crear preguntas de ejemplo
4. ✅ Probar el flujo completo
5. 📝 Personalizar estilos si es necesario

---

**¡Listo para usar!** 🎉
