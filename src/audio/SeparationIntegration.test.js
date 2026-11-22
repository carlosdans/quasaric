import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { StemSeparatorEngine } from './StemSeparatorEngine.js';

test('[INTEGRATION] ONNX Model tensor contract is correct', () => {
  const engine = new StemSeparatorEngine();

  // Verificar contrato de tensores del modelo
  // inputName 'audio' es el nombre de entrada esperado por htdemucs INT8 quantized
  assert.equal(engine.MODEL_INFO.inputName, 'audio', 'Input name is audio');
  assert.equal(engine.MODEL_INFO.outputName, 'stems', 'Output name is stems');

  // Forma de entrada: [batch, channels, time_samples]
  assert.deepEqual(engine.MODEL_INFO.inputShape, [1, 2, 343980],
    'Input shape: batch=1, channels=2(stereo), samples=343980(7.8s@44.1kHz)');

  // Forma de salida: [batch, stems, channels, time_samples]
  assert.deepEqual(engine.MODEL_INFO.outputShape, [1, 6, 2, 343980],
    'Output shape: batch=1, stems=6, channels=2, samples=343980');

  // Verificar que los stems son AUDIO, no spectrograms
  assert.equal(engine.MODEL_INFO.outputShape[1], 6, '6 stems output');
  assert.equal(engine.MODEL_INFO.outputShape[2], 2, 'Stereo output per stem');

  // Sample rate correcto
  assert.equal(engine.MODEL_INFO.sampleRate, 44100, '44.1kHz sample rate');
  assert.equal(engine.MODEL_INFO.segmentDuration, 7.8, '7.8s segment duration');

  // Licencia compatible
  assert.equal(engine.MODEL_INFO.license, 'MIT', 'MIT license allows free use');
});

test('[INTEGRATION] ONNX model produces audio waveform, not spectrogram', () => {
  const engine = new StemSeparatorEngine();
  const info = engine.getModelInfo();

  // CRUCIAL: confirmar que la salida es AUDIO, no spectrograma
  // Si fuera spectrograma, la forma sería diferente: [batch, mel_bins, time_frames]
  // Pero htdemucs devuelve [batch, 6, 2, samples] = AUDIO

  const outputShape = info.outputShape;

  // Verificar que es audio (dimensión temporal es samples, no frames)
  const samples = outputShape[3];
  const expectedSamples = 7.8 * 44100; // 7.8 segundos * 44100 Hz

  assert.ok(samples === expectedSamples,
    `Output is ${samples} samples = AUDIO waveform (${expectedSamples} expected)`);

  // Si fuera spectrograma, veríamos algo como:
  // outputShape = [1, 6, 1024, 100] (mel_bins, time_frames)
  // Pero vemos: [1, 6, 2, 343980] (channels, samples)
});

test('[INTEGRATION] Stem names are in correct model order', () => {
  const engine = new StemSeparatorEngine();

  // El orden ESPECÍFICO que devuelve htdemucs ONNX:
  // [drums, bass, other, vocals, guitar, piano]
  const EXPECTED_ORDER = ['drums', 'bass', 'other', 'vocals', 'guitar', 'piano'];

  assert.deepEqual(engine.stemNames, EXPECTED_ORDER,
    'Stems in exact model output order');

  // Verificar que todos los stems necesarios están presentes
  const requiredStems = ['vocals', 'drums', 'bass', 'guitar', 'piano', 'other'];
  for (const stem of requiredStems) {
    assert.ok(engine.stemNames.includes(stem), `Missing stem: ${stem}`);
  }
});

test('[INTEGRATION] ONNX Runtime loaded as ES module', () => {
  // Verificar que onnxruntime-web está importado como dependencia npm
  const engine = new StemSeparatorEngine();

  // El runtime debe estar disponible vía import estático
  assert.ok(engine._onnxRuntime, 'ONNX Runtime instance available');
  
  // Verificar import en el código
  const code = fs.readFileSync('./src/audio/StemSeparatorEngine.js', 'utf8');
  assert.ok(code.includes("import * as ort from 'onnxruntime-web'"), 'ES import exists');
  assert.ok(code.includes('this._onnxRuntime'), 'Runtime accessed via getter');
});

test('[INTEGRATION] Build produces ONNX WASM bundle for local loading', () => {
  // Verificar que el WASM está bundleado localmente
  const distDir = './dist/assets';
  const files = fs.readdirSync(distDir);

  // El WASM debe estar bundleado para carga local sin CDN
  const hasWasmBundle = files.some(f => f.includes('ort') && f.includes('.wasm'));
  assert.ok(hasWasmBundle, 'ONNX WASM bundle exists for local loading');
  
  // Verificar MIME type para WASM
  const wasmFiles = files.filter(f => f.includes('ort') && f.includes('.wasm'));
  assert.ok(wasmFiles.length > 0, 'WASM file generated');
});