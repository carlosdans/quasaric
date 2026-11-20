# Notas de implementación de separación de instrumentos

## Modelos disponibles:

1. **Spleeter models** (Deezer)
   - 2-stems, 4-stems, 5-stems
   - Tamaño: 200MB-1GB
   - Precisión: Muy buena para voces

2. **Demucs** (Facebook)
   - 4-stems: drums, bass, other, vocals
   - 44kHz, estéreo
   - Precisión: Excelente para batería y bajo

3. **Open-Unmix**
   - 4-stems por defecto
   - Modelo 6-stems disponible
   - 44.1kHz, estéreo

## Límite de archivos:

- **Modelos ONNX**: ~500MB - 1GB
- **Descarga**: Se puede cachear en localStorage/indexedDB
- **RAM**: 2-4GB durante inferencia
- **VRAM**: No necesita, todo en CPU

## Estrategia:

1. Primera carga: descargar modelo ONNX pequeño (~200MB)
2. Cache local usando IndexedDB
3. Procesamiento en background con Web Worker
4. Mostrar progreso: "Downloading model..." → "Processing..." → "Complete"

## Para 6 stems:

- Usar Open-Unmix 6-stems
- Stems: vocals, drums, bass, left, right, other
- Mapear: piano→left, guitar→right, otros→other

## Alternativa si WASM falla:

- Instrucciones para instalar Spleeter localmente
- Script que se ejecuta offline
- El usuario procesa sus archivos sin subirlos