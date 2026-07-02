# Estado Actual - App Offline Saberly

## ✅ Lo que ya está hecho

1. **Frontend configurado para standalone**
   - Router con hash (`/#/simulacros`, `/#/perfil`, etc.)
   - Base de URL relativa (`./`) para funcionar en cualquier carpeta
   - Modo offline como predeterminado
   - Datos de preguntas embebidos sin dependencia de backend

2. **Capacitor Android agregado**
   - Proyecto Android creado en `frontend/android/`
   - Web assets sincronizados en `frontend/android/app/src/main/assets/public/`
   - Configuración lista para generar APK

3. **Dos opciones para usar la app**
   - **Opción A (Con servidor)**: `npm start` en `mobile-offline/` y acceder desde celular en red local
   - **Opción B (Sin servidor)**: Generar APK y compartir instalable

## 📦 Opción B: Generar APK (recomendado para amigos)

### Requisitos previos
- Descargar e instalar **Android Studio** ([link](https://developer.android.com/studio))
- Asegurar que **JDK 17+** está instalado

### Pasos

1. Abre Android Studio y carga el proyecto:

```bash
cd frontend
npx cap open android
```

2. En Android Studio:
   - Espera a que termine de sincronizar Gradle
   - Click en **Build** > **Build Bundle(s) / APK(s)** > **Build APK(s)**
   - Selecciona **debug** o **release** (release para distribuir)

3. El APK se genera en:
   - Debug: `frontend/android/app/build/outputs/apk/debug/app-debug.apk`
   - Release: `frontend/android/app/build/outputs/apk/release/app-release.apk`

4. Comparte el APK con tus amigos vía:
   - Google Drive
   - WhatsApp
   - Correo
   - Transferencia por cable

5. Ellos simplemente descargan e instalan:
   - En el celular abren Descargas
   - Tocan el APK y presionan "Instalar"

## 📱 Opción A: Servidor local (para testing rápido)

```bash
cd mobile-offline
npm install
npm start
```

Luego en el celular:
- Abre navegador
- Navega a `http://<IP-del-PC>:3000`
- Instala como PWA

## 🔄 Flujo de trabajo actual

- **Cambios en el frontend**: edita `frontend/src/`
- **Recompilar**: `npm run build` en `frontend/`
- **Sincronizar Android**: `npx cap copy android` en `frontend/`
- **Generar nuevo APK**: abre Android Studio y build

## 📋 Archivos importantes

```
frontend/
├── src/
│   ├── offline/
│   │   └── questions_data.js     # Preguntas offline
│   └── App.jsx                    # Rutas principales
├── android/                        # Proyecto Android Capacitor
├── capacitor.config.ts            # Config de Capacitor
├── vite.config.js                 # Configuración de build (base: './')
└── README_CAPACITOR.md            # Guía detallada de APK

mobile-offline/
├── server/                         # Servidor Express para PWA
└── app/                            # Frontend estático
```

## ✨ Nota final

La app está completamente funcional:
- Simulacros con 278 preguntas offline
- Juegos como Desafío Rápido, Bombas de Tiempo, etc.
- Resultados guardados localmente
- No requiere internet

Elige la opción que mejor se adapte a tu caso.
