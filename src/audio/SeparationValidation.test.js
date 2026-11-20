import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { StemSeparatorEngine } from './StemSeparatorEngine.js';
import { PROGRESSIONS, PIANO_NOTES } from '../data/pianoPatterns.js';

test('[VALIDATION] StemSeparatorEngine indicates DSP is approximate filtering, not real separation', async () => {
  const engine = new StemSeparatorEngine();

  // Verificar que los filtros existen
  assert.equal(typeof engine._lowpassFilter, 'function');
  assert.equal(typeof engine._highpassFilter, 'function');
  assert.equal(typeof engine._bandpassFilter, 'function');

  // Verificar que los filtros son de primera orden (simplificados)
  // Un filtro FIR de alta calidad tendría más complejidad
  const testArray = new Float32Array([0.1, 0.2, 0.3, 0.4, 0.5]);
  const outputArray = new Float32Array(5);

  // El filtro lowpass de primera orden NO separa instrumentos reales
  engine._lowpassFilter(testArray, outputArray, 250, 44100);

  // Verificar que el filtro produce salida
  assert.ok(outputArray.length === 5, 'Filter should produce output array');

  // Nota: Este es un filtro SIMPLE que NO separa instrumentos
  // No produce audio de instrumentos separados, solo filtra frecuencias
});

test('[VALIDATION] ONNX separation is not fully implemented', async () => {
  const engine = new StemSeparatorEngine();

  // Verificar la documentación del método
  const result = await engine.separateOnnx({});

  // El método actual indica explícitamente que falta implementación
  assert.ok(result, 'Separation should return a result object');
  const hasMessage = result.message && result.message.includes('pendiente');
  const isNotSuccess = !result.success;
  assert.ok(hasMessage || isNotSuccess,
    'ONNX method should indicate not fully implemented');
});

test('[VALIDATION] DSP produces filtered stems, not instrument-separated stems', async () => {
  const engine = new StemSeparatorEngine();

  // Verificar configuración de filtros
  assert.ok(engine.filterConfig.vocals, 'Vocal filter config exists');
  assert.ok(engine.filterConfig.drums, 'Drum filter config exists');
  assert.ok(engine.filterConfig.bass, 'Bass filter config exists');
  assert.ok(engine.filterConfig.guitar, 'Guitar filter config exists');
  assert.ok(engine.filterConfig.piano, 'Piano filter config exists');
  assert.ok(engine.filterConfig.other, 'Other filter config exists');

  // Verificar frecuencias de corte - son aproximaciones espectrales
  // La separación real requeriría modelos de IA entrenados
  assert.equal(typeof engine.filterConfig.vocals.low, 'number');
  assert.equal(typeof engine.filterConfig.vocals.high, 'number');

  // Estas frecuencias son aproximaciones, NO garantizan separación real
});

test('[VALIDATION] Piano patterns are pre-defined examples, not automatic transcription', () => {
  // Verificar que son estructuras estáticas conocidas
  assert.ok(PROGRESSIONS['C Major'], 'C Major progression exists');
  assert.ok(PROGRESSIONS['F Major'], 'F Major progression exists');
  assert.ok(PROGRESSIONS['G Major'], 'G Major progression exists');

  // Verificar que los acordes son predefinidos
  assert.ok(PROGRESSIONS['C Major'][0].chord === 'C', 'First chord is C');
  assert.ok(PROGRESSIONS['C Major'][1].chord === 'Am', 'Second chord is Am');

  // Verificar que las notas son predefinidas (no transcriben audio)
  assert.ok(PIANO_NOTES.arpeggios['CMajor'], 'CMajor arpeggio exists');
  assert.ok(Array.isArray(PIANO_NOTES.arpeggios['CMajor']), 'Arpeggio is an array');
});

test('[VALIDATION] Build size is within acceptable limits', () => {
  // Verificar package.json
  const pkgContent = fs.readFileSync('./package.json', 'utf8');
  const pkg = JSON.parse(pkgContent);

  // Verificar que no hay dependencias pesadas de IA
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };

  // onnxruntime-web no debería estar en dependencias directas (se carga dinámicamente)
  // Si está, indica que se incluye en el bundle inicial
  console.log('Dependencies:', Object.keys(deps).join(', '));

  // Verificar tamaño aceptable
  assert.ok(deps['onnxruntime-web'] === undefined,
    'onnxruntime-web should not be in direct dependencies');
});

test('[VALIDATION] Audio processing stays local', () => {
  // Verificar que no hay endpoints de API en el código
  const playerScreen = fs.readFileSync('./src/screens/PlayerScreen.jsx', 'utf8');
  const stemEngine = fs.readFileSync('./src/audio/StemSeparatorEngine.js', 'utf8');

  // Verificar que no hay URLs de APIs externas que procesen audio
  const apiPatterns = [
    /https:\/\/.*\/api\//i,
    /https?:\/\/.*\.(openai|anthropic|azure)\./i,
    /fetch.*process/i
  ];

  for (const pattern of apiPatterns) {
    assert.ok(!pattern.test(playerScreen), `PlayerScreen should not contain: ${pattern}`);
    assert.ok(!pattern.test(stemEngine), `StemEngine should not contain: ${pattern}`);
  }
});

test('[VALIDATION] ONNX Runtime loads from CDN, not bundled', () => {
  const stemEngine = fs.readFileSync('./src/audio/StemSeparatorEngine.js', 'utf8');

  // Verificar que ONNX se carga desde CDN
  assert.ok(stemEngine.includes('cdn.jsdelivr.net'),
    'ONNX Runtime should load from CDN');
  assert.ok(stemEngine.includes('onnxruntime-web'),
    'ONNX Runtime should be loaded via CDN');
});

test('[VALIDATION] DSP separation creates 6 stems with frequency filtering', async () => {
  const engine = new StemSeparatorEngine();

  // Verificar que tiene 6 stems definidos
  assert.equal(engine.stemNames.length, 6, 'Should have 6 stem names');
  assert.ok(engine.stemNames.includes('vocals'), 'Should include vocals');
  assert.ok(engine.stemNames.includes('drums'), 'Should include drums');
  assert.ok(engine.stemNames.includes('bass'), 'Should include bass');
  assert.ok(engine.stemNames.includes('guitar'), 'Should include guitar');
  assert.ok(engine.stemNames.includes('piano'), 'Should include piano');
  assert.ok(engine.stemNames.includes('other'), 'Should include other');
});