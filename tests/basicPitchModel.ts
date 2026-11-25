// End-to-end validation of the bundled Basic Pitch ONNX model on known synthetic piano notes.
// Run with: node --experimental-transform-types --no-warnings tests/basicPitchModel.ts
import { readFileSync } from 'node:fs';
import * as ort from 'onnxruntime-web/wasm';
import { BP_PITCHES, BP_SR, BP_WINDOW, bpNotes, bpUnwrap, bpWindows, noteOptionsForSource } from '../src/analysis/basicPitch.ts';

ort.env.wasm.numThreads = 1;
ort.env.logLevel = 'error';

function renderPianoNote(audio: Float32Array, midi: number, start: number, end: number, amplitude: number) {
  const fundamental = 440 * 2 ** ((midi - 69) / 12);
  const first = Math.floor(start * BP_SR);
  const last = Math.min(audio.length, Math.ceil((end + 0.08) * BP_SR));
  for (let i = first; i < last; i++) {
    const t = i / BP_SR - start;
    if (t < 0 || t > end - start + 0.08) continue;
    const attack = Math.min(1, t / 0.012);
    const release = t <= end - start ? 1 : Math.exp(-(t - (end - start)) * 45);
    const envelope = attack * release * Math.exp(-t * 0.45);
    let sample = 0;
    for (let harmonic = 1; harmonic <= 8; harmonic++) {
      const partial = fundamental * harmonic * Math.sqrt(1 + 0.00008 * harmonic * harmonic);
      sample += Math.sin(2 * Math.PI * partial * t) / harmonic ** 1.25;
    }
    audio[i] += amplitude * envelope * sample;
  }
}

const modelUrl = new URL('../src/analysis/models/basic-pitch.onnx', import.meta.url);
const model = new Uint8Array(readFileSync(modelUrl));
const session = await ort.InferenceSession.create(model, { executionProviders: ['wasm'] });

async function transcribe(audio: Float32Array) {
  const noteParts: Float32Array[] = [];
  const onsetParts: Float32Array[] = [];
  for (const window of bpWindows(audio)) {
    if (window.length !== BP_WINDOW) throw new Error('Basic Pitch window has an unexpected size');
    const result = await session.run({
      'serving_default_input_2:0': new ort.Tensor('float32', window, [1, BP_WINDOW, 1]),
    });
    noteParts.push(result['StatefulPartitionedCall:1'].data as Float32Array);
    onsetParts.push(result['StatefulPartitionedCall:2'].data as Float32Array);
  }
  const noteGrid = bpUnwrap(noteParts, BP_PITCHES, audio.length);
  const onsetGrid = bpUnwrap(onsetParts, BP_PITCHES, audio.length);
  return bpNotes(noteGrid.data, onsetGrid.data, noteGrid.frames, noteOptionsForSource('Piano'));
}

// Test 1: isolated notes with known attacks and releases.
const isolatedAudio = new Float32Array(BP_SR * 3);
renderPianoNote(isolatedAudio, 60, 0.5, 1.35, 0.48);
renderPianoNote(isolatedAudio, 64, 1.65, 2.45, 0.48);
const isolated = await transcribe(isolatedAudio);
const near = (events: typeof isolated, pitch: number, start: number, end: number) =>
  events.find((n) => n.pitch === pitch && Math.abs(n.start - start) <= 0.06 && Math.abs(n.end - end) <= 0.04);
const c4 = near(isolated, 60, 0.5, 1.35);
const e4 = near(isolated, 64, 1.65, 2.45);
console.log('Basic Pitch isolated piano transcription:', JSON.stringify(isolated));
if (!c4 || !e4 || isolated.some((n) => n.pitch === 100) || isolated.map(n => n.pitch).sort((a,b)=>a-b).join() !== '60,64') {
  console.error('FAIL  isolated piano notes must be timed within 60 ms at onset / 40 ms at release, with no extra notes');
  process.exitCode = 1;
} else {
  console.log('PASS  isolated piano notes meet tight timing tolerances with no false notes');
}

// Test 2: a real piano-learning use case — a simultaneous C-major chord plus a later D5 melody note.
const polyAudio = new Float32Array(BP_SR * 2.2);
renderPianoNote(polyAudio, 60, 0.35, 1.35, 0.28); // C4
renderPianoNote(polyAudio, 64, 0.35, 1.35, 0.28); // E4
renderPianoNote(polyAudio, 67, 0.35, 1.35, 0.28); // G4
renderPianoNote(polyAudio, 74, 0.90, 1.60, 0.24); // D5, overlapping the chord
const polyphonic = await transcribe(polyAudio);
console.log('Basic Pitch polyphonic piano transcription:', JSON.stringify(polyphonic));
const expected = [
  { pitch: 60, start: 0.35, end: 1.35 },
  { pitch: 64, start: 0.35, end: 1.35 },
  { pitch: 67, start: 0.35, end: 1.35 },
  { pitch: 74, start: 0.90, end: 1.60 },
];
const missing = expected.filter((e) => !polyphonic.some(n =>
  n.pitch === e.pitch && Math.abs(n.start - e.start) <= 0.06 && Math.abs(n.end - e.end) <= 0.04));
const extras = polyphonic.filter(n => !expected.some(e => e.pitch === n.pitch));
if (missing.length || extras.length) {
  console.error('FAIL  polyphonic piano: expected every chord tone and overlapping melody note, with no false pitches');
  console.error('Missing:', JSON.stringify(missing), 'Unexpected:', JSON.stringify(extras));
  process.exitCode = 1;
} else {
  console.log('PASS  polyphonic chord tones and overlapping melody note recovered without false pitches');
}
await session.release();
