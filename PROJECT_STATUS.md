# Quasaric - Project Status

**Última actualización:** 2026-11-20

## Validación Funcional Real

### 🚫 CARACTERÍSTICAS **NO IMPLEMENTADAS** (Documentadas honestamente)

#### 1. Separación de Instrumentos por IA - **NO FUNCIONAN**

**DSP Mode** - Separación con filtros:
- **Estado**: Implementado técnicamente
- **Realidad**: Aplica filtros de frecuencia (low-pass, high-pass, band-pass) 
- **No separa**: Los 6 "stems" son aproximaciones espectrales, no instrumentos musicales reales
- **Resultado**: El audio se filtra pero NO se separa en contenidos musicales distintos
- **Uso recomendado**: Demostración solo, no práctica musical real

**ONNX Mode** - Separación con Demucs:
- **Estado**: Parcialmente implementado (faltan componentes críticos)
- **Problema**: No hay código de inferencia real
  - El método `separateOnnx()` devuelve mensaje de "pendiente"
  - Faltan: pre-procesamiento, inferencia model, post-procesamiento
  - Modelo htdemucs_6s-onnx (136MB) no se ejecuta
- **Tamaño**: 136MB - inviable para descarga automática
- **Requisitos**: Internet, 136MB+ espacio, proceso manual

#### 2. Transcripción de Acordes - **NO AUTOMÁTICA**

**ChordDisplay**:
- **Estado**: Implementado
- **Realidad**: Usa acordes predefinidos en código
- **No hace**: No analiza la canción importada
- **Datos estáticos**: `C Major`, `F Major`, `G Major` con tiempos fijos
- **Alternativa viable**: Necesitaría análisis de espectro o librería externa open source

#### 3. Transcripción MIDI - **NO AUTOMÁTICA**

**NoteView**:
- **Estado**: Implementado
- **Realidad**: Usa patrones de arpegio predefinidos
- **No hace**: No transcribe el piano de la canción
- **Datos estáticos**: Patrones `CMajor`, `Fmajor`, `Gmajor`
- **Alternativa viable**: Necesitaría detección de ondas o integración con Whisper-like para audio

---

### ✓ CARACTERÍSTICAS **FUNCIONALES** (Validadas)

#### Import y Reproducción de Audio
- ✅ Archivos MP3/WAV se importan correctamente (máximo 100MB)
- ✅ Audio se reproduce con sincronización precisa
- ✅ Seek funciona correctamente
- ✅ Volumen, mute y solo operan por track

#### Controles Básicos
- ✅ Transport (play/pause, seek)
- ✅ Loop A-B sincronizado con AudioContext
- ✅ Controles de volumen por pista
- ✅ Mute/solo por instrumento

#### Interfaz
- ✅ Bilingüe (ES/EN) con detección automática
- ✅ UI responsive para móviles
- ✅ Todos los botones conectados a funcionalidad real

---

## Limitaciones Técnicas

### 1. Separación de Instrumentos
```
Problema: La separación musical real requiere IA especializada
Alternativa viable:
  - Usar modelo más pequeño (mdx-net tiny, ~10MB) desde HuggingFace
  - O implementar separación básica con filtros y advertir al usuario
```

### 2. Transcripción de Acordes
```
Problema: Detectar acordes requiere análisis de espectro
Alternativa viable:
  - Usar librería open source como Chordino o Madmom
  - Implementar estimación básica de energía por frecuencia
  - O pedir al usuario que ingrese acordes manualmente
```

### 3. Transcripción MIDI
```
Problema: La transcripción automática de piano es complejo
Alternativa viable:
  - Ofrecer modo manual: arrastrar notas a teclas
  - Usar patrones predefinidos como base de práctica
  - No prometer transcripción automática sin probarla
```

---

## Soluciones Recomendadas (Sin coste, procesamiento local)

### Opción A: Separación DSP Mejorada (Actual)
```
- Usar filtros FIR más complejos
- Agregar separación de bajo (frecuencias 50-250Hz)
- Agregar separación de voz (frecuencias 300-4000Hz)
- Documentar como "separación espectral" no IA
```

### Opción B: ONNX Local (Futuro)
```
- Descargar modelo htdemucs_6s-onnx (136MB) previamente
- Implementar pre/post-procesamiento completo
- Agregar progreso de descarga y caché
```

### Opción C: Modelos más pequeños
```
- Investigar MDX-Net tiny (~5-10MB)
- Research Spleeter WebGPU versión
- Considerar separación 2-stems en lugar de 6
```

---

## Archivos Clave para Referencia

| Archivo | Propósito | Estado |
|---------|-----------|--------|
| `src/audio/StemSeparatorEngine.js` | Motor de separación | DSP funcional, ONNX incompleto |
| `src/audio/MultiTrackPlayer.js` | Reproductor audio | ✅ Funcional |
| `src/components/ChordDisplay.jsx` | Visualizador acordes | ✅ UI, datos estáticos |
| `src/components/NoteView.jsx` | Vista Synthesia | ✅ UI, datos estáticos |
| `src/data/pianoPatterns.js` | Datos de acordes/notas | ✅ Referencia datos estáticos |
| `src/i18n.js` | Traducciones | ✅ Completo ES/EN |

---

## Pruebas Realizadas

- ✅ Build de producción exitoso (80KB gzipped)
- ✅ 10/10 pruebas unitarias pasadas
- ✅ Importación de archivos MP3/WAV
- ✅ Reproducción sincronizada
- ✅ Controles de volumen/mute/solo
- ✅ Loop A-B
- ⚠️ Separación de instrumentos (filtrado espectral)
- ⚠️ Transcripción acordes (datos estáticos)
- ⚠️ Transcripción notas MIDI (patrones predefinidos)

---

## Próximos Pasos Recomendados

1. **Mejorar DSP**: Usar filtros más avanzados (FFT, Wiener filtering)
2. **AGregar modo manual**: Permitir al usuario arrastrar acordes/notas
3. **Investigar modelos**: Buscar modelos ONNX más pequeños (<10MB)
4. **Agregar ejemplos**: Incluir archivos de demostración con acordes conocidos
5. **Documentar limitaciones**: Mostrar advertencia clara sobre la separación DSP

---

**Resumen honesto**: El proyecto NO tiene separación de instrumentos real ni transcripción musical automática. Lo que existe son:
- Un filtro de frecuencia básico que NO separa instrumentos reales
- Patrones de acordes y notas predefinidos que NO vinculan con la canción
- Controles de audio funcionales pero sin procesamiento avanzado

Esto se documenta claramente para cumplir con el principio: "No simular separación ni transcripción" y "No declarar terminada una función sin pruebas reales".