# Quasaric - Project Status

**Última actualización:** 2026-11-20

## Validación Funcional Real - ESTADO ACTUAL

### 1. SEPARACIÓN DE INSTRUMENTOS

#### 📌 RESULTADO TÉCNICO: **NO IMPLEMENTADA (Separación real no probada)**

**Lo que SÍ está implementado:**
- ✅ ONNX Runtime Web cargado desde CDN (`cdn.jsdelivr.net/npm/onnxruntime-web`)
- ✅ Sesión ONNX creada con modelo htdemucs_6s-onnx (136MB MIT)
- ✅ Pre-procesamiento de audio funcional
- ✅ Inferencia del modelo integrada

**Lo que FALTA para separación REAL:**
- ❌ **Post-procesamiento espectral** (Griffin-Lim o Similar)
- ❌ **Conversión de espectrogramas → audio**
- ❌ **Generación de AudioBuffers reproductibles**
- ❌ **Prueba con canción real** (no hemos verificado stems independientes)

**El problema técnico:**
```javascript
// htdemucs ONNX output format (según documentación StemSplit):
// Output: 6 tensores de forma [batch, 2, 4096, 128] (espectrogramas)
// NO audio decodificado directamente

// Lo que necesitamos:
// 1. Tensor → Espectrograma (STFT inverse)
// 2. Espectrograma → Audio (Griffin-Lim algorithm)
// 3. Audio → AudioBuffer (para reproducir)
```

**Tamaño del modelo:** 136MB
- Para una web estática: 136MB × 6 stems = 816MB máximo
- Requiere: Internet, tiempo de descarga, espacio cache
- **No viable para descarga automática**

**Conclusión honesta:** La separación ONNX está CONFIGURADA pero sin implementar la parte crítica de reconstrucción de audio. Sin esto, los "stems" son solo tensores sin valor musical.

---

### 2. DSP MODE - NO ES SEPARACIÓN REAL

**Estado:** IMPLEMENTADO PERO CON LIMITACIONES CONOCIDAS

```javascript
// Filtrado espectral (NO separación de instrumentos):
- vocals: Filtro banda 300-4000Hz (no corta otras frecuencias)
- drums: Filtros combinados (no separa batería real)
- bass: Pasa bajos 30-250Hz (no extrae bajo musical)
- guitar/piano: Filtros combinados (no separa instrumentos)
- other: Copia original (no filtro real)
```

**Resultado:** Audio filtrado ≈ distorsionado, ≠ instrumentos separados

---

### 3. TRANSCRIPCIÓN DE ACORDES

#### 📌 RESULTADO: **NO AUTOMÁTICA**

**Implementado:**
- ✅ Interfaz ChordDisplay funcional
- ✅ Visualización de acordes en UI

**No implementado:**
- ❌ Análisis automático de espectro
- ❌ Detección de acordes del audio
- ❌ Transcripción real

**Datos actuales:**
```javascript
// En pianoPatterns.js - acordes PREDEFINIDOS:
const PROGRESSIONS = {
  'C Major': [
    { chord: 'C', time: 0, duration: 4 },
    { chord: 'Am', time: 4, duration: 4 },
    { chord: 'F', time: 8, duration: 4 },
    { chord: 'G', time: 12, duration: 4 }
  ]
}
```

**Conclusión:** Los acordes son patrones de ejemplo, NO transcriben la canción del usuario.

---

### 4. TRANSCRIPCIÓN MIDI/NOTES

#### 📌 RESULTADO: **NO AUTOMÁTICA**

**Implementado:**
- ✅ Interfaz NoteView estilo Synthesia
- ✅ Visualización de notas caídas

**No implementado:**
- ❌ Detección de notas del piano en el audio
- ❌ Transcripción real de MIDI

**Datos actuales:**
```javascript
// En pianoPatterns.js - arpegios PREDEFINIDOS:
arpeggios: {
  'CMajor': [
    { note: 'C', midi: 60, time: 0, ... },
    { note: 'E', midi: 64, time: 0.5, ... }
  ]
}
```

**Conclusión:** Las notas son patrones estáticos, NO transcriben el piano de la canción.

---

### 5. CONTROLES DE AUDIO - ✅ FUNCIONALES

| Función | Estado | Prueba |
|---------|--------|--------|
| Importar MP3/WAV | ✅ | Archivos ≤100MB |
| Reproducir audio | ✅ | Web Audio API sincrónico |
| Volumen por track | ✅ | GainNode conectado |
| Mute/Solo | ✅ | Lógica implementada |
| Loop A-B | ✅ | AudioContext scheduling |
| Seek | ✅ | Posición sincronizada |
| Tempo control | ✅ | Slider BPM 40-200 |

---

## Análisis de Viabilidad Técnica

### ¿Es posible separación REAL en web estática?

**RESPUESTA TÉCNICA:** **SÍ, pero con limitaciones prácticas**

**Opciones viables (coste cero, local):**

1. **ONNX + Post-procesamiento (RECOMENDADO)**
   - Requiere: Implementar Griffin-Lim o usar librería existente
   - Tamaño: 136MB modelo (descarga manual o cache persistente)
   - Calidad: Alta ( modelo Demucs estadounidense)
   - Hardware: 4GB+ RAM recomendado

2. **Modelos más pequeños (NO ENCONTRADOS)**
   - Buscé modelos <10MB en HuggingFace
   - Resultado: Ningún modelo ONNX de separación real bajo 10MB
   - Alternativa: 2-stems separación (muy limitado)

3. **WebAssembly Spleeter/Demucs**
   - Requiere: Compilar Python/C++ a WASM
   - Complejidad: Muy alta
   - Tamaño: Similar al ONNX model

### Declaración de No Simulación

**Cumplimos con:** "No simular separación ni transcripción"

- La DSP NO se promueve como separación real
- Las notas/acordes se documentan como predefinidos
- ONNX se documenta como "configurado pero sin post-procesamiento"
- No se muestra audio separado sin validar primero

---

## Pruebas Necesarias para Validar Separación Real

Para pasar a "separación real" necesitamos:

1. **Implementar STFT/IFFT de calidad**
2. **Implementar Griffin-Lim algorithm**
3. **Probar con archivo MP3 de prueba**
4. **Verificar que 6 stems son independientes**
5. **Medir calidad con SNR/SDR métricas**

**Tiempo estimado:** 2-3 días de desarrollo para post-procesamiento espectral

---

## Archivos Generados

| Archivo | Propósito | Estado |
|---------|-----------|--------|
| `StemSeparatorEngine.js` | Motor ONNX | Setup completo, post-procesamiento pendiente |
| `MultiTrackPlayer.js` | Reproductor | ✅ Funcional |
| `ChordDisplay.jsx` | Acordes | ✅ UI |
| `NoteView.jsx` | Notas | ✅ UI |
| `pianoPatterns.js` | Datos | ✅ Estáticos |
| `i18n.js` | Traducciones | ✅ Completo |

---

## Próximos Pasos (Prioridad Alta)

1. **IMPLEMENTAR post-procesamiento espectral** (Griffin-Lim)
2. **AGREGAR prueba con archivo real** (canción de ejemplo)
3. **VERIFICAR stems independientes** (escuchar cada uno)
4. **DOCUMENTAR resultados** (calidad, DR, SNR)

Si estos pasos NO pueden completarse en 48h, mantener estado actual como "separación configurada pero sin post-procesamiento".

---

**Resumen honesto aplicado a principios innegociables:**
- ❌ No hay separación de instrumentos REAL probada
- ❌ No hay transcripción automática de acordes
- ❌ No hay transcripción MIDI automática
- ✅ Sí hay reproductor funcional
- ✅ Sí hay controles de audio completos
- ✅ Sí hay postura técnica honesta sobre limitaciones