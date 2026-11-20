import test from 'node:test';
import assert from 'node:assert/strict';
import { StemSeparatorEngine } from './StemSeparatorEngine.js';

test('[VALIDATION] StemSeparatorEngine initializes with correct default values', () => {
  const engine = new StemSeparatorEngine();

  assert.equal(engine.modelLoaded, false);
  assert.equal(engine.modelType, 'onnx');
  assert.deepEqual(engine.stemNames, ['other', 'drums', 'bass', 'guitar', 'piano', 'vocals']);
  assert.ok(engine.stemNames.includes('vocals'));
  assert.ok(engine.stemNames.includes('drums'));
  assert.ok(engine.stemNames.includes('bass'));
  assert.ok(engine.stemNames.includes('guitar'));
  assert.ok(engine.stemNames.includes('piano'));
  assert.ok(engine.stemNames.includes('other'));
});

test('[VALIDATION] StemSeparatorEngine has correct stem configuration', () => {
  const engine = new StemSeparatorEngine();

  // Verificar configuración de modelo
  assert.ok(engine.MODEL_INFO, 'Model info exists');
  assert.equal(engine.stemNames.length, 6, 'Has 6 stem names');
  assert.equal(engine.stemNames[0], 'other', 'First stem is other');
  assert.equal(engine.stemNames[5], 'vocals', 'Last stem is vocals');
});

test('[VALIDATION] StemSeparatorEngine getModelInfo returns correct info', () => {
  const engine = new StemSeparatorEngine();
  const info = engine.getModelInfo();

  assert.equal(info.stemNames.length, 6, 'Has 6 stems');
  assert.equal(info.license, 'MIT', 'Model is MIT licensed');
  assert.equal(info.size, '136 MB', 'Model size is 136MB fp16');
  assert.equal(info.stems, 6, '6 stems output');
  assert.ok(info.url.includes('huggingface.co'), 'URL includes huggingface');
});

test('[VALIDATION] ONNX model is MIT licensed from StemSplit', () => {
  const engine = new StemSeparatorEngine();
  const info = engine.getModelInfo();

  assert.equal(info.license, 'MIT', 'Model is MIT licensed');
  assert.ok(info.source.includes('StemSplit'), 'Source is StemSplit');
  assert.equal(info.sampleRate, 44100, 'Sample rate 44.1kHz');
});

test('[VALIDATION] StemSeparatorEngine destroy clears resources', () => {
  const engine = new StemSeparatorEngine();
  engine.modelLoaded = true;
  engine.modelType = 'onnx';

  engine.destroy();

  assert.equal(engine.modelLoaded, false);
});