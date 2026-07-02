# Saberly Mobile Offline

Esta carpeta contiene una versión independiente de la app para pruebas móviles offline.

## Qué incluye

- `app/`: frontend estático construido desde `frontend/dist`
- `server/`: servidor Express ligero que sirve la aplicación y ofrece endpoints básicos de auth offline
- `server/data/users.json`: usuarios de prueba para login offline

## Cómo usar

1. Instala dependencias:

```bash
cd mobile-offline
npm install
```

2. Construye la app web y copia los archivos estáticos al instalador offline:

```bash
npm run build
```

   Esto compila `frontend` y deposita el resultado en `mobile-offline/app`.

3. Arranca el servidor offline desde el computador que estará en la misma red Wi-Fi que el celular:

```bash
npm start
```

4. En el celular, abre el navegador y accede a la dirección del servidor:

```bash
http://<IP-del-PC>:3000
```

   - No uses `localhost` en el celular.
   - Si no conoces la IP del PC, puedes verla con `ipconfig` (Windows) y buscar la dirección IPv4 de la conexión Wi-Fi.

5. En la app, elige "Continuar como Invitado (Offline) ⚡" para usar preguntas y simulacros sin backend.

## Qué funciona offline

- Generación de simulacros locales
- Preguntas y juegos con datos embebidos
- Respuestas y resultados guardados localmente
- El contenido offline está dentro de la app: `frontend/src/offline/questions_data.js`

## Usuario de prueba (solo si quieres registro/login)

- Email: `guest@example.com`
- Contraseña: `password123`

## Nota importante

- Esta versión offline es independiente del backend principal.
- Solo necesitas `mobile-offline/` y `frontend/dist` para construirla.
- Para ejecutar en el celular con este paquete, el servidor Node debe estar corriendo en el PC y el celular debe estar en la misma red.
- Si quieres un instalador completamente independiente sin servidor, usa la guía de Capacitor en `frontend/README_CAPACITOR.md` y genera un APK que puedas pasar a tus amigos.

## Instalar como PWA en el celular

1. Accede con Chrome/Edge/Brave a `http://<IP-del-PC>:3000`.
2. Cuando cargue la app, abre el menú del navegador.
3. Elige "Agregar a pantalla de inicio" o "Instalar app".
4. La app quedará disponible como acceso directo en el celular.
