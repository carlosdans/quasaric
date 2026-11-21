import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { StemSeparatorEngine } from './StemSeparatorEngine.js';
import { PROGRESSIONS, PIANO_NOTES } from '../data/pianoPatterns.js';

test('[VALIDATION] StemSeparatorEngine initializes with correct default values', () => {
  const engine = new StemSeparatorEngine();

  assert.equal(engine.modelLoaded, false);
  assert.equal(engine.modelType, 'onnx');
  // Orden correcto del modelo htdemucs: [drums, bass, other, vocals, guitar, piano]
  assert.deepEqual(engine.stemNames, ['drums', 'bass', 'other', 'vocals', 'guitar', 'piano']);
});

test('[VALIDATION] StemSeparatorEngine has correct stem configuration', () => {
  const engine = new StemSeparatorEngine();

  // Verificar configuración de modelo
  assert.ok(engine.MODEL_INFO, 'Model info exists');
  assert.equal(engine.stemNames.length, 6, 'Has 6 stem names');
  assert.equal(engine.stemNames[0], 'drums', 'First stem is drums (model order)');
  assert.equal(engine.stemNames[3], 'vocals', 'Vocals is 4th stem (model order)');
  assert.equal(engine.stemNames[5], 'piano', 'Last stem is piano (model order)');
});

test('[VALIDATION] ONNX model is MIT licensed from StemSplit', () => {
  const engine = new StemSeparatorEngine();
  const info = engine.getModelInfo();

  assert.equal(info.license, 'MIT', 'Model is MIT licensed');
  assert.ok(info.source.includes('StemSplit'), 'Source is StemSplit');
  assert.equal(info.sampleRate, 44100, 'Sample rate 44.1kHz');
  // Verificar que los tensores son waveforms, no spectrograms
  assert.equal(info.inputShape[1], 2, 'Input shape has 2 channels (stereo)');
  assert.equal(info.outputShape[1], 6, 'Output shape has 6 stems');
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

  // Verificar que no hay dependencias pesadas de IA en producción
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };

  // onnxruntime-web no debería estar en dependencias DIRECTAS (se carga dinámicamente desde CDN)
  // onnxruntime-node es permitido como devDependency para pruebas
  console.log('Dependencies:', Object.keys(deps).join(', '));

  // onnxruntime-web debe estar en devDependencies o no estar presente
  // onnxruntime-node es permitido para pruebas
  const hasOnnxRuntimeWebProd = pkg.dependencies['onnxruntime-web'] !== undefined;
  assert.ok(!hasOnnxRuntimeWebProd,
    'onnxruntime-web should not be in production dependencies (load from CDN)');

  // Verificar que no hay otros bundles pesados
  const heavyDeps = ['tensorflow', 'torch', 'pytorch', '@tensorflow'];
  for (const dep of heavyDeps) {
    assert.ok(!deps[dep], `${dep} should not be a dependency`);
  }
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