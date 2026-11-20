import test from 'node:test';
import assert from 'node:assert/strict';
import { StemSeparatorEngine } from './StemSeparatorEngine.js';

test('StemSeparatorEngine initializes with correct default values', () => {
  const engine = new StemSeparatorEngine();

  assert.equal(engine.modelLoaded, false);
  assert.equal(engine.modelType, null);
  assert.deepEqual(engine.stemNames, ['vocals', 'drums', 'bass', 'guitar', 'piano', 'other']);
  assert.ok(engine.stemNames.includes('vocals'));
  assert.ok(engine.stemNames.includes('drums'));
  assert.ok(engine.stemNames.includes('bass'));
  assert.ok(engine.stemNames.includes('guitar'));
  assert.ok(engine.stemNames.includes('piano'));
  assert.ok(engine.stemNames.includes('other'));
});

test('StemSeparatorEngine has filter configuration for all stems', () => {
  const engine = new StemSeparatorEngine();

  assert.ok(engine.filterConfig.vocals, 'Missing vocals filter config');
  assert.ok(engine.filterConfig.drums, 'Missing drums filter config');
  assert.ok(engine.filterConfig.bass, 'Missing bass filter config');
  assert.ok(engine.filterConfig.guitar, 'Missing guitar filter config');
  assert.ok(engine.filterConfig.piano, 'Missing piano filter config');
  assert.ok(engine.filterConfig.other, 'Missing other filter config');
});

test('StemSeparatorEngine getModelSizeInfo returns correct info', () => {
  const engine = new StemSeparatorEngine();
  const info = engine.getModelSizeInfo();

  assert.equal(info.htdemucs_6s, '136 MB (fp16)');
  assert.equal(info.htdemucs_ft, '660 MB (fp16)');
  assert.ok(info.recommendation.minimumRam, 'Missing minimumRam recommendation');
  assert.ok(info.recommendation.downloadTime, 'Missing downloadTime recommendation');
});

test('StemSeparatorEngine DSP filters are defined', () => {
  const engine = new StemSeparatorEngine();

  assert.equal(typeof engine._lowpassFilter, 'function');
  assert.equal(typeof engine._highpassFilter, 'function');
  assert.equal(typeof engine._bandpassFilter, 'function');
  assert.equal(typeof engine._applyFilter, 'function');
});

test('StemSeparatorEngine destroy clears resources', () => {
  const engine = new StemSeparatorEngine();
  engine.modelLoaded = true;
  engine.modelType = 'onnx';

  engine.destroy();

  assert.equal(engine.modelLoaded, false);
  assert.equal(engine.modelType, null);
});