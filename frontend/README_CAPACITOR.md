# Generar APK instalable para Android

## ¿Qué es esto?

Un APK es un archivo instalable de Android. Una vez generado, puedes:
- Enviarlo por correo, WhatsApp o Google Drive a tus amigos
- Ellos lo descargan en su celular y lo instalan directamente
- No necesitan servidor, la app funciona completamente offline

## Prerequisitos

- **Android Studio** instalado ([descargar aquí](https://developer.android.com/studio))
- **Java Development Kit (JDK)** 17+ instalado
- El frontend ya está construido y sincronizado (`frontend/dist/` y `frontend/android/`)

## Pasos para generar el APK

### 1. Abre Android Studio

```bash
cd frontend
npx cap open android
```

O abre `frontend/android/` directamente con Android Studio.

### 2. Dentro de Android Studio

- Espera a que Gradle termine de sincronizar (debería aparecer en la barra inferior).
- Ve a **Build** > **Build Bundle(s) / APK(s)** > **Build APK(s)**.

### 3. Espera a que se construya

- Verás un progreso en la ventana inferior.
- Una vez termine, aparecerá un botón "Locate" para abrir la carpeta con el APK.

### 4. El APK está en

```
frontend/android/app/build/outputs/apk/debug/app-debug.apk
```

O en `frontend/android/app/build/outputs/bundle/release/app-release.aab` si generas una versión Release (recomendado para distribuir).

## Para Release (versión para amigos)

1. En Android Studio: **Build** > **Build Bundle(s) / APK(s)** > **Build APK(s)**.
2. Selecciona **Release** en lugar de **Debug**.
3. Se te pedirá crear una **firma digital** (signing key):
   - Clic en "Create new..." 
   - Completa los datos básicos (puede ser cualquier cosa para una app de prueba).
4. El APK release quedará en `frontend/android/app/build/outputs/apk/release/app-release.apk`.

## Cómo instalar el APK en un celular

### Opción 1: Conectar el celular con cable USB (desde Android Studio)

- Conecta el celular con cable USB.
- En Android Studio: **Run** > **Run 'app'**.
- Selecciona tu celular como target y presiona OK.

### Opción 2: Transferir el APK manualmente

1. Copia el APK (ej: `app-debug.apk`) al celular vía:
   - Google Drive
   - WhatsApp
   - Correo electrónico
   - Cable USB (guardar en carpeta de descargas)

2. En el celular:
   - Abre **Archivos** (File Manager).
   - Navega a la carpeta de descargas.
   - Toca el APK.
   - Presiona **Instalar**.
   - Si aparece un aviso de seguridad, elige **Instalar de todas formas**.

## Verificar que todo está listo

Antes de construir, verifica que los archivos estén en su lugar:

```bash
# En Windows PowerShell
Test-Path "frontend\android\app\src\main\assets\public\index.html"  # Debe ser True
Test-Path "frontend\capacitor.config.ts"  # Debe ser True
```

## Nota importante

- La app corre **100% offline** sin servidor.
- Usa datos incluidos en `frontend/src/offline/questions_data.js`.
- Los resultados se guardan localmente en el celular.
- No requiere conexión a internet después de la instalación.

## Si hay problemas

1. **"Gradle not found"**: Instala Android Studio con la opción de Android SDK.
2. **"Java not found"**: Instala JDK 17+.
3. **APK no se genera**: Limpia el build con **Build** > **Clean Project** y vuelve a intentar.
