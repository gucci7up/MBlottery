# Íconos de la aplicación

Genera los íconos con el CLI de Tauri desde una imagen PNG de al menos 1024x1024px:

```bash
npm run tauri icon ruta/a/tu-logo.png
```

Esto genera automáticamente todos los tamaños necesarios para Windows, Linux y Android.

Archivos requeridos:
- 32x32.png
- 128x128.png
- 128x128@2x.png
- icon.icns (macOS)
- icon.ico (Windows)
- Square30x30Logo.png, Square44x44Logo.png, etc. (Windows Store)
- icon.png (Linux / Android)
