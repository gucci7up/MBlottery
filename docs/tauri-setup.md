# Tauri v2 — App nativa para Windows, Linux y Android

## Prerrequisitos

### Todos los sistemas
- [Rust](https://rustup.rs/) — `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`
- Node.js 20+

### Windows
- [Microsoft C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) o Visual Studio
- WebView2 (incluido en Windows 10/11)

### Linux (Ubuntu/Debian)
```bash
sudo apt-get install -y \
  libwebkit2gtk-4.1-dev \
  libappindicator3-dev \
  librsvg2-dev \
  patchelf \
  libssl-dev
```

### Android (adicional)
- Android Studio + SDK
- NDK versión 27
- Java 17
- Agregar targets Rust:
```bash
rustup target add aarch64-linux-android armv7-linux-androideabi x86_64-linux-android i686-linux-android
```

---

## Generar íconos

Coloca un PNG de al menos 1024×1024px como `logo.png` y ejecuta:

```bash
cd apps/frontend
npm run tauri:icon -- logo.png
```

Esto genera automáticamente todos los tamaños en `src-tauri/icons/`.

---

## Desarrollo local

```bash
cd apps/frontend
npm install

# Desktop (abre ventana nativa)
npm run tauri:dev

# Android (Sunmi conectado por USB o emulador)
npm run tauri:android:init   # Solo la primera vez
npm run tauri:android:dev
```

---

## Build para distribución

### Windows (.msi + .exe)
```bash
cd apps/frontend
npm run tauri:build
# Salida: src-tauri/target/release/bundle/msi/
#         src-tauri/target/release/bundle/nsis/
```

### Linux (.deb + .AppImage)
```bash
cd apps/frontend
npm run tauri:build
# Salida: src-tauri/target/release/bundle/deb/
#         src-tauri/target/release/bundle/appimage/
```

### Android (.apk)
```bash
cd apps/frontend
npm run tauri:android:init   # Solo la primera vez
npm run tauri:android:build -- --apk
# Salida: src-tauri/gen/android/app/build/outputs/apk/
```

---

## Build automático vía GitHub Actions

Los workflows en `.github/workflows/` generan los instaladores automáticamente al crear un tag:

```bash
git tag v1.0.0
git push origin v1.0.0
```

Esto dispara:
- `build-desktop.yml` → genera `.msi` (Windows) + `.deb`/`.AppImage` (Linux)
- `build-android.yml` → genera `.apk` (Android/Sunmi)

Los archivos quedan como **Release Draft** en GitHub → `Releases`.

También puedes dispararlo manualmente desde **Actions → Run workflow** e ingresar la URL del backend.

---

## Configuración en el dispositivo (primera vez)

Al abrir la app nativa por primera vez aparece la pantalla de configuración:

1. Ingresa la URL del backend: `https://api.tu-dominio.com`
2. Presiona **Probar conexión** — verifica que el servidor responde
3. Presiona **Guardar y continuar**

La URL se guarda en el dispositivo y no es necesario ingresarla de nuevo.

---

## Instalación en Sunmi V2S (Android)

1. Descargar el `.apk` desde GitHub Releases
2. Transferir al Sunmi por USB o QR de descarga
3. En el Sunmi: Configuración → Seguridad → Instalar apps de fuentes desconocidas
4. Abrir el `.apk` e instalar
5. Configurar la URL del servidor la primera vez

El Sunmi V2S corre Android 7.1 (API 25) — Tauri v2 requiere mínimo API 24. ✅

---

## Estructura de archivos Tauri

```
apps/frontend/
├── src-tauri/
│   ├── src/
│   │   ├── main.rs      # Entry point desktop
│   │   └── lib.rs       # Lógica Tauri + comandos
│   ├── capabilities/
│   │   ├── default.json # Permisos desktop
│   │   └── mobile.json  # Permisos Android
│   ├── icons/           # Íconos (generar con tauri:icon)
│   ├── tauri.conf.json  # Configuración principal
│   ├── Cargo.toml       # Dependencias Rust
│   └── build.rs         # Script de build
└── src/
    ├── lib/
    │   └── tauri.ts     # Detección Tauri + manejo URL
    └── pages/
        └── setup/
            └── ServerSetupPage.tsx  # Pantalla de configuración
```
