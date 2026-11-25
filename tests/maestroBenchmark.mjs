// Compare Basic Pitch with a real MAESTRO piano recording and its paired MIDI reference.
import { readFileSync } from 'node:fs';
import * as ort from 'onnxruntime-web/wasm';
import { BP_PITCHES, BP_WINDOW, bpNotes, bpUnwrap, bpWindows, noteOptionsForSource } from '../src/analysis/basicPitch.ts';
import { decimate2 } from '../src/analysis/resample.ts';

ort.env.wasm.numThreads = 1;
ort.env.logLevel = 'error';

function readVar(b, s) {
  let v = 0;
  for (let i = 0; i < 4; i++) {
    if (s.pos >= s.end) throw new Error('Truncated MIDI variable value');
    const x = b[s.pos++]; v = (v << 7) | (x & 127);
    if (!(x & 128)) return v;
  }
  throw new Error('Invalid MIDI variable value');
}
function parseMidi(b) {
  if (b.toString('ascii', 0, 4) !== 'MThd') throw new Error('Invalid MIDI');
  const h = b.readUInt32BE(4), tracks = b.readUInt16BE(10), ppq = b.readUInt16BE(12);
  if (!ppq || (ppq & 0x8000)) throw new Error('Unsupported MIDI time division');
  const tempos = [{ tick: 0, us: 500000 }], raw = [];
  let pos = 8 + h;
  for (let tr = 0; tr < tracks; tr++) {
    if (b.toString('ascii', pos, pos + 4) !== 'MTrk') throw new Error('Invalid MIDI track');
    const len = b.readUInt32BE(pos + 4), s = { pos: pos + 8, end: pos + 8 + len };
    pos = s.end;
    let tick = 0, running = 0;
    const active = new Map();
    while (s.pos < s.end) {
      tick += readVar(b, s);
      let status = b[s.pos];
      if (status & 128) { s.pos++; if (status < 240) running = status; }
      else { if (!running) throw new Error('Invalid running status'); status = running; }
      if (status === 255) {
        const type = b[s.pos++], size = readVar(b, s);
        if (type === 81 && size === 3) {
          const us = (b[s.pos] << 16) | (b[s.pos + 1] << 8) | b[s.pos + 2];
          if (us) tempos.push({ tick, us });
        }
        s.pos += size; continue;
      }
      if (status === 240 || status === 247) { s.pos += readVar(b, s); running = 0; continue; }
      const kind = status & 240, channel = status & 15, pitch = b[s.pos++];
      const velocity = (kind === 192 || kind === 208) ? 0 : b[s.pos++];
      const key = tr + ':' + channel + ':' + pitch;
      if (kind === 144 && velocity > 0) {
        const q = active.get(key) ?? []; q.push(tick); active.set(key, q);
      } else if (kind === 128 || (kind === 144 && velocity === 0)) {
        const q = active.get(key);
        if (q?.length) { raw.push({ pitch, startTick: q.shift(), endTick: tick }); if (!q.length) active.delete(key); }
      }
    }
  }
  tempos.sort((a, b) => a.tick - b.tick);
  const segs = [];
  let last = 0, seconds = 0, us = 500000;
  for (const e of tempos) {
    if (e.tick < last) continue;
    seconds += (e.tick - last) * us / (ppq * 1e6);
    last = e.tick; us = e.us; segs.push({ tick: last, seconds, us });
  }
  const time = target => {
    let lo = 0, hi = segs.length - 1;
    while (lo < hi) { const m = Math.ceil((lo + hi) / 2); if (segs[m].tick <= target) lo = m; else hi = m - 1; }
    const x = segs[lo]; return x.seconds + (target - x.tick) * x.us / (ppq * 1e6);
  };
  return raw.filter(n => n.pitch >= 21 && n.pitch <= 108 && n.endTick > n.startTick)
    .map(n => ({ pitch: n.pitch, start: time(n.startTick), end: time(n.endTick) }))
    .sort((a, b) => a.start - b.start || a.pitch - b.pitch);
}
const percentile = (a, p) => a.length ? [...a].sort((x, y) => x - y)[Math.min(a.length - 1, Math.ceil(p * a.length) - 1)] : null;
const [audioPath, midiPath] = process.argv.slice(2);
if (!audioPath || !midiPath) throw new Error('Usage: maestroBenchmark.mjs <mono-44100-s16le.pcm> <reference.mid>');
const pcm = readFileSync(audioPath);
if (pcm.length % 2) throw new Error('Incomplete PCM sample');
const mono = new Float32Array(pcm.length / 2);
for (let i = 0; i < mono.length; i++) mono[i] = pcm.readInt16LE(i * 2) / 32768;
const duration = mono.length / 44100, audio = decimate2(mono, 63);
const reference = parseMidi(readFileSync(midiPath)).filter(n => n.start < duration).map(n => ({ ...n, end: Math.min(n.end, duration) }));
const model = new Uint8Array(readFileSync(new URL('../src/analysis/models/basic-pitch.onnx', import.meta.url)));
const session = await ort.InferenceSession.create(model, { executionProviders: ['wasm'] });
const noteParts = [], onsetParts = [], windows = bpWindows(audio);
for (let i = 0; i < windows.length; i++) {
  const r = await session.run({ 'serving_default_input_2:0': new ort.Tensor('float32', windows[i], [1, BP_WINDOW, 1]) });
  noteParts.push(r['StatefulPartitionedCall:1'].data);
  onsetParts.push(r['StatefulPartitionedCall:2'].data);
  console.log('Inference window', i + 1, '/', windows.length);
}
const ng = bpUnwrap(noteParts, BP_PITCHES, audio.length), og = bpUnwrap(onsetParts, BP_PITCHES, audio.length);
await session.release();

function evaluate(predicted) {
  const remaining = new Set(reference.map((_, i) => i));
  const onsetErrors = [], signedOnsets = [], releaseErrors = [], signedReleases = [];
  let tp = 0;
  for (const note of predicted) {
    let best = -1, error = Infinity;
    for (const i of remaining) {
      const target = reference[i];
      if (target.pitch !== note.pitch) continue;
      const e = Math.abs(target.start - note.start);
      if (e <= 0.1 && e < error) { best = i; error = e; }
    }
    if (best >= 0) {
      remaining.delete(best); tp++;
      const onsetDelta = (note.start - reference[best].start) * 1000;
      const releaseDelta = (note.end - reference[best].end) * 1000;
      onsetErrors.push(Math.abs(onsetDelta)); signedOnsets.push(onsetDelta);
      releaseErrors.push(Math.abs(releaseDelta)); signedReleases.push(releaseDelta);
    }
  }
  const fp = predicted.length - tp, fn = reference.length - tp;
  const precision = tp / Math.max(1, tp + fp), recall = tp / Math.max(1, tp + fn);
  return {
    predictedNotes: predicted.length, truePositives: tp, falsePositives: fp, falseNegatives: fn,
    precision: +precision.toFixed(4), recall: +recall.toFixed(4),
    f1: +(2 * precision * recall / Math.max(1e-9, precision + recall)).toFixed(4),
    onsetAbsMs: { median: percentile(onsetErrors, 0.5), p95: percentile(onsetErrors, 0.95), signedMedian: percentile(signedOnsets, 0.5) },
    keyReleaseAbsMs: { median: percentile(releaseErrors, 0.5), p95: percentile(releaseErrors, 0.95), signedMedian: percentile(signedReleases, 0.5) },
  };
}
const base = noteOptionsForSource('Piano');
const profiles = [
  { name: 'current-production', options: base },
  { name: 'balanced', options: { ...base, onsetThresh: 0.60, frameThresh: 0.35, minNoteMs: 80, endOffsetMs: 180 } },
  { name: 'strict', options: { ...base, onsetThresh: 0.65, frameThresh: 0.40, minNoteMs: 90, endOffsetMs: 180 } },
  { name: 'high-precision', options: { ...base, onsetThresh: 0.70, frameThresh: 0.45, minNoteMs: 110, endOffsetMs: 220 } },
  { name: 'short-notes', options: { ...base, onsetThresh: 0.60, frameThresh: 0.35, minNoteMs: 65, endOffsetMs: 220 } },
  { name: 'without-harmonic-filter', options: { ...base, suppressHarmonics: false } },
];
const results = profiles.map(profile => ({
  profile: profile.name,
  ...evaluate(bpNotes(ng.data, og.data, ng.frames, profile.options)),
}));
const report = {
  dataset: 'MAESTRO v3.0.0 (held-out test performance)',
  audioSeconds: +duration.toFixed(2), inferenceWindows: windows.length,
  referenceNotes: reference.length,
  onsetMatchToleranceMs: 100,
  profiles: results,
};
console.log('MAESTRO REAL-PIANO BENCHMARK — NOTE-EXTRACTION PROFILE SWEEP');
console.log(JSON.stringify(report, null, 2));
if (!reference.length || results.every(x => x.predictedNotes === 0)) throw new Error('No note events available for comparison');
