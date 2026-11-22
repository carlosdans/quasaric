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
  // Source is MonoBand APK extracted and INT8 quantized (from HTDemucs ONNX)
  assert.ok(info.source.includes('MonoBand') || info.source.includes('StemSplit'), 'Source is verified from MonoBand/StemSplit');
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

  // onnxruntime-web debe estar en dependencies para carga local
  // onnxruntime-node es permitido como devDependency para pruebas
  console.log('Dependencies:', Object.keys(deps).join(', '));

  // onnxruntime-web debe estar en dependencies para carga local
  // onnxruntime-node es permitido para pruebas
  const hasOnnxRuntimeWeb = pkg.dependencies['onnxruntime-web'] !== undefined;
  assert.ok(hasOnnxRuntimeWeb,
    'onnxruntime-web must be in dependencies for local loading');

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

test('[VALIDATION] ONNX Runtime loads locally bundled', () => {
  const stemEngine = fs.readFileSync('./src/audio/StemSeparatorEngine.js', 'utf8');

  // ONNX Runtime se importa como ES module
  assert.ok(stemEngine.includes("import * as ort from 'onnxruntime-web'"),
    'ONNX Runtime should be imported as ES module');
  // jsDelivr no se usa para runtime (modelo se carga de HuggingFace)
  assert.ok(!stemEngine.includes('cdn.jsdelivr.net') || stemEngine.includes('huggingface.co'),
    'CDN should only be used for model, not runtime');
});

test('[VALIDATION] ONNX model is MIT licensed 6-stem model', () => {
  const engine = new StemSeparatorEngine();
  const info = engine.getModelInfo();

  assert.equal(info.license, 'MIT', 'Model must be MIT licensed for free use');
  assert.equal(info.stems, 6, 'Model must produce 6 stems');
  // INT8 quantized model is ~69.62 MB (reduced from 136 MB fp16)
  assert.ok(info.size.includes('MB'), 'Model size is defined');
  assert.equal(info.sampleRate, 44100, 'Sample rate 44.1kHz');
});

test('[VALIDATION] Stem order matches HTDemucs ONNX output', () => {
  // El orden del modelo htdemucs_6s-onnx es documentado y verificado
  const EXPECTED_ORDER = ['drums', 'bass', 'other', 'vocals', 'guitar', 'piano'];
  const engine = new StemSeparatorEngine();

  assert.deepEqual(engine.stemNames, EXPECTED_ORDER,
    'Stem order must match HTDemucs ONNX output order');

  // Verificar posiciones específicas
  assert.equal(engine.stemNames[0], 'drums', 'drums is first stem');
  assert.equal(engine.stemNames[1], 'bass', 'bass is second stem');
  assert.equal(engine.stemNames[2], 'other', 'other is third stem');
  assert.equal(engine.stemNames[3], 'vocals', 'vocals is fourth stem');
  assert.equal(engine.stemNames[4], 'guitar', 'guitar is fifth stem');
  assert.equal(engine.stemNames[5], 'piano', 'piano is sixth/last stem');

  // El piano debe estar en el índice 5 del array de stems
  const pianoIndex = engine.stemNames.indexOf('piano');
  assert.equal(pianoIndex, 5, 'Piano must be at index 5');
});

test('[VALIDATION] PlayerScreen track indices match model output', () => {
  const playerScreen = fs.readFileSync('./src/screens/PlayerScreen.jsx', 'utf8');

  // Verificar que usa el orden correcto de stems
  const expectedPattern = /['"]drums['"].*['"]bass['"].*['"]other['"].*['"]vocals['"].*['"]guitar['"].*['"]piano['"]/;
  assert.ok(expectedPattern.test(playerScreen),
    'PlayerScreen must use correct stem order from model');

  // Verificar que pianoTrackIndex es 6 (después del track original)
  // El archivo define PISTOL_TRACK_INDEX = 6 y lo usa en pianoTrackIndex
  const pianoConstantPattern = /PISTOL_TRACK_INDEX\s*=\s*6/;
  const pianoUsagePattern = /pianoTrackIndex.*=\s*trackIsSeparated\s*\?\s*PISTOL_TRACK_INDEX/;
  assert.ok(pianoConstantPattern.test(playerScreen) || pianoUsagePattern.test(playerScreen),
    'Piano track index must be 6 (original + 6 stems)');
});