// End-to-end smoke test of the bundled Basic Pitch ONNX model on known synthetic piano notes.
// Run with: node --experimental-transform-types --no-warnings tests/basicPitchModel.ts
import { readFileSync } from 'node:fs';
import * as ort from 'onnxruntime-web/wasm';
import { BP_PITCHES, BP_SR, BP_WINDOW, bpNotes, bpUnwrap, bpWindows, noteOptionsForSource } from '../src/analysis/basicPitch.ts';

ort.env.wasm.numThreads = 1;
ort.env.logLevel = 'error';

const duration = 3;
const audio = new Float32Array(BP_SR * duration);
function pianoNote(midi: number, start: number, end: number, amplitude: number) {
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

// Two separate notes with known pitches and onsets, like a simple piano exercise.
pianoNote(60, 0.5, 1.35, 0.48);
pianoNote(64, 1.65, 2.45, 0.48);

const modelUrl = new URL('../src/analysis/models/basic-pitch.onnx', import.meta.url);
const model = new Uint8Array(readFileSync(modelUrl));
const session = await ort.InferenceSession.create(model, { executionProviders: ['wasm'] });
const windows = bpWindows(audio);
const noteParts: Float32Array[] = [];
const onsetParts: Float32Array[] = [];
for (const window of windows) {
  if (window.length !== BP_WINDOW) throw new Error('Basic Pitch window has an unexpected size');
  const result = await session.run({
    'serving_default_input_2:0': new ort.Tensor('float32', window, [1, BP_WINDOW, 1]),
  });
  noteParts.push(result['StatefulPartitionedCall:1'].data as Float32Array);
  onsetParts.push(result['StatefulPartitionedCall:2'].data as Float32Array);
}
const noteGrid = bpUnwrap(noteParts, BP_PITCHES, audio.length);
const onsetGrid = bpUnwrap(onsetParts, BP_PITCHES, audio.length);
const detected = bpNotes(noteGrid.data, onsetGrid.data, noteGrid.frames, noteOptionsForSource('Piano'));
await session.release();

const near = (pitch: number, start: number, end: number) =>
  detected.find((n) => n.pitch === pitch && Math.abs(n.start - start) <= 0.16 && Math.abs(n.end - end) <= 0.04);
const c4 = near(60, 0.5, 1.35);
const e4 = near(64, 1.65, 2.45);
console.log('Basic Pitch model synthetic piano transcription:', JSON.stringify(detected));
if (!c4 || !e4 || detected.some((n) => n.pitch === 100)) {
  console.error('FAIL  bundled ONNX model recovers piano note onsets/releases and suppresses the synthetic high harmonic');
  console.error('Expected MIDI 60 at 0.50–1.35 s and MIDI 64 at 1.65–2.45 s (onset ±160 ms, release ±40 ms).');
  process.exitCode = 1;
} else {
  console.log('PASS  bundled ONNX model recovers both known piano notes and suppresses the synthetic high harmonic');
}
