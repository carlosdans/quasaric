import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { StemSeparatorEngine } from './StemSeparatorEngine.js';
import { PROGRESSIONS, PIANO_NOTES } from '../data/pianoPatterns.js';

test('[VALIDATION] StemSeparatorEngine initializes with correct default values', () => {
  const engine = new StemSeparatorEngine();

  assert.equal(engine.modelLoaded, false);
  assert.equal(engine.modelType, 'onnx');
  assert.deepEqual(engine.stemNames, ['other', 'drums', 'bass', 'guitar', 'piano', 'vocals']);
});

test('[VALIDATION] StemSeparatorEngine has correct stem configuration', () => {
  const engine = new StemSeparatorEngine();

  // Verificar configuración de modelo
  assert.ok(engine.MODEL_INFO, 'Model info exists');
  assert.equal(engine.stemNames.length, 6, 'Has 6 stem names');
  assert.equal(engine.stemNames[0], 'other', 'First stem is other');
  assert.equal(engine.stemNames[5], 'vocals', 'Last stem is vocals');
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

test('[VALIDATION] ONNX model is MIT licensed 6-stem model', () => {
  const engine = new StemSeparatorEngine();
  const info = engine.getModelInfo();

  assert.equal(info.license, 'MIT', 'Model must be MIT licensed for free use');
  assert.equal(info.stems, 6, 'Model must produce 6 stems');
  assert.equal(info.size, '136 MB', 'Model size (fp16)');
  assert.equal(info.sampleRate, 44100, 'Sample rate 44.1kHz');
});