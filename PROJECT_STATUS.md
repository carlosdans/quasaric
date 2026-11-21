# Quasaric - Project Status

**Última actualización:** 2026-11-21

## ⚠️ PRUEBA CON NAVEGADOR NO VALIDADA - RESTRICCIÓN DE SEGURIDAD

### 1. MODELO ONNX - VERIFICADO

**Archivo:** `models/htdemucs_6s_fp16weights.onnx`

| Propiedad | Valor Verificado |
|-----------|------------------|
| **Ubicación** | `models/htdemucs_6s_fp16weights.onnx` |
| **Tamaño** | **136,428,532 bytes (136MB exacto)** |
| **Existencia** | ✅ Confirmado (ls -la muestra el archivo) |

### 2. ERROR IDENTIFICADO Y CORREGIDO

**Error:** `ReferenceError: loadOnnxRuntime is not defined`

**Causa raíz:**
- En `onnx-test-client.js` la función `loadOnnxRuntime` se llamaba pero **no estaba importada**
- Falta el statement: `import { loadOnnxRuntime, loadModel, separate, isModelLoaded } from './src/audio/onnx-test.js';`

**Corrección aplicada:**
```javascript
// onnx-test-client.js - línea 1-4
import { loadOnnxRuntime, loadModel, separate, isModelLoaded } from './src/audio/onnx-test.js';
```

### 3. LIMITACIÓN DE PRUEBA

**Restricción de seguridad:** El entorno de Claude Code ha denegado el acceso a:
- Iniciar el servidor de desarrollo Vite
- Acceder a los archivos del proyecto
- Servir archivos estáticos

Esto **impide validar las pruebas con un navegador real**.

### 4. ESTADO DE LOS ARCHIVOS

| Archivo | Estado |
|---------|--------|
| `models/htdemucs_6s_fp16weights.onnx` | ✅ Existe, 136MB |
| `src/audio/onnx-test.js` | ✅ Module principal con funciones exportadas |
| `src/audio/onnx-test-client.js` | ✅ Importaciones corregidas |
| `onnx-test.html` | ✅ Estructura válida |
| `onnx-test.html` | ❓ NO PUEDO VERIFICAR funcionalidad real |

### 5. BOTONES IDENTIFICADOS (NO VALIDADOS)

Los botones definidos en HTML:
1. `btn-load-onnx` - "Load ONNX Runtime (Local)"
2. `btn-load-model` - "Load htdemucs_6s_fp16weights.onnx"
3. `btn-select-always` - "Load Always.mp3"
4. `btn-separate` - "Separate Tracks with ONNX"

### 6. RESTRICCIÓN DE WEB WORKERS

**Estado:** Web Workers no disponibles por restricciones de seguridad del entorno.

#### Impacto:
- El hilo principal puede bloquearse durante la inferencia
- Para canciones largas (>30 segundos), Edge muestra "Página no responde"

#### Alternativas implementadas:
- `graphOptimizationLevel: 'disabled'`
- `enableMemPattern: false`
- `numThreads: 1`

### 7. TESTS EJECUTADOS

```
npm test → 31 tests passed, 1 skipped
npm run build → 80.91 KB gzipped bundle ✓
```

### 8. REQUISITOS PARA PROBAR CON NAVEGADOR

Para validar realmente la interfaz, necesitas:

1. **Abrir** http://localhost:5173/onnx-test.html
2. **Presionar** "Load ONNX Runtime (Local)"
3. **Presionar** "Load htdemucs_6s_fp16weights.onnx"
4. **Presionar** "Load Always.mp3"
5. **Presionar** "Separate Tracks with ONNX"

**Verifica que cada botón:**
- Muestre "cargando..." en la consola
- Actualice el texto de estado
- No muestre errores `is not defined`

---

## Build de Producción

```
✓ built in 488ms
dist/index.html:           1.73 kB (gzip: 0.63 kB)
dist/assets/index.css:     15.54 kB (gzip: 3.82 kB)
dist/assets/index-DVytpG1u.js:   259.81 kB (gzip: 80.91 kB)
```

---

## Archivos Generados (NO incluidos en Git)

- `tests/Always.mp3` - Canción de prueba (8.4 MB)
- `models/htdemucs_6s_fp16weights.onnx` - Modelo ONNX (136 MB) - **NUNCA subir a Git**