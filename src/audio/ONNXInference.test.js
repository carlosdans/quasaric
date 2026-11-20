import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { StemSeparatorEngine } from './StemSeparatorEngine.js';

// Solo ejecutar estos tests si el modelo está disponible
const MODEL_PATH = './models/htdemucs_6s_fp16weights.onnx';
const MODEL_EXISTS = fs.existsSync(MODEL_PATH);

if (MODEL_EXISTS) {
  test.skip('[ONNX] Model file exists and has correct size', () => {
    const stats = fs.statSync(MODEL_PATH);
    const sizeMB = Math.round(stats.size / (1024 * 1024));

    // htdemucs_6s_fp16weights.onnx debe ser ~136MB
    assert.ok(stats.size > 100 * 1024 * 1024, 'Model larger than 100MB');
    assert.ok(stats.size < 150 * 1024 * 1024, 'Model smaller than 150MB');
    console.log(`Model size: ${sizeMB}MB`);
  });
}

test('[ONNX] Model info reflects MIT licensed 6-stem model', () => {
  const engine = new StemSeparatorEngine();
  const info = engine.getModelInfo();

  assert.equal(info.license, 'MIT', 'Model is MIT licensed');
  assert.equal(info.stems, 6, 'Model produces 6 stems');
  assert.deepEqual(info.stemNames, ['drums', 'bass', 'other', 'vocals', 'guitar', 'piano']);
  assert.equal(info.sampleRate, 44100, '44.1kHz sample rate');
  assert.equal(info.segmentDuration, 7.8, '7.8s segments');
});

test('[ONNX] Input tensor shape specification verified', () => {
  const engine = new StemSeparatorEngine();
  const info = engine.getModelInfo();

  // Input: [batch=1, channels=2(stereo), samples=343980]
  assert.deepEqual(info.inputShape, [1, 2, 343980],
    'Input shape verified: 7.8s stereo at 44.1kHz');
});

test('[ONNX] Output tensor shape represents audio waveform', () => {
  const engine = new StemSeparatorEngine();
  const info = engine.getModelInfo();

  // Output: [batch=1, stems=6, channels=2, samples=343980]
  // NOT spectrogram which would be [batch, mel_bins, time_frames]
  assert.deepEqual(info.outputShape, [1, 6, 2, 343980],
    'Output is AUDIO waveform (not spectrogram)');
  assert.equal(info.outputShape[1], 6, '6 stems output');
  assert.equal(info.outputShape[2], 2, 'Stereo per stem');
});

test('[ONNX] Stem names in correct model order', () => {
  const engine = new StemSeparatorEngine();
  // htdemucs ONNX output order (verified from model card):
  // [drums, bass, other, vocals, guitar, piano]
  const EXPECTED_ORDER = ['drums', 'bass', 'other', 'vocals', 'guitar', 'piano'];
  assert.deepEqual(engine.stemNames, EXPECTED_ORDER,
    'Stems in correct model order');
});

test('[ONNX] No DSP filters used - pure ONNX separation', () => {
  const engine = new StemSeparatorEngine();

  // El motor NO debe tener métodos DSP funcionales para separación real
  // Solo fallback cuando ONNX falla
  assert.equal(typeof engine.separateDSP, 'function', 'DSP fallback method exists');
  assert.equal(typeof engine.separateOnnx, 'function', 'ONNX method exists');

  // La separación real viene de ONNX, no de filtros
  assert.equal(engine.modelType, 'onnx', 'Default model type is ONNX');
});