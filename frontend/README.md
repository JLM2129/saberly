# Saberly - Frontend 📱

Este es el cliente de **Saberly**, una aplicación web moderna (SPA) construida con **React** y **Vite**. Está diseñada como una **Progressive Web App (PWA)** para permitir el estudio de simulacros incluso sin conexión a internet.

## ✨ Características Específicas

- **Interfaz Reactiva:** Construida con componentes funcionales y Hooks.
- **PWA (Progressive Web App):** Configurada para ser instalada en dispositivos móviles y funcionar offline.
- **Gestión de Estado:** Manejo de simulacros locales mediante `localStorage` para persistencia.
- **Tailwind CSS:** Estilos modernos y responsivos.

## 🛠️ Tecnologías

- **React 18**
- **Vite** (Build tool ultra rápido)
- **Vite PWA Plugin** (Service Workers y Manifiesto)
- **React Router Dom** (Navegación)

## 🚀 Desarrollo Local

Si deseas ejecutar el frontend fuera de Docker (requiere Node.js instalado):

1. **Instalar dependencias:**
   ```bash
   npm install

2. Configurar variables de entorno: Crea un archivo .env en esta carpeta:

VITE_API_URL=http://localhost:8000/api

3. Iniciar servidor de desarrollo:

npm run dev

🐳 Uso con Docker
Este frontend está configurado para servirse automáticamente mediante el docker-compose.yml en la raíz. El puerto por defecto en desarrollo es el 5173.

Nota: Para que la PWA funcione correctamente en producción, el sitio debe servirse bajo HTTPS.


