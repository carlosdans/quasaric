// Real-world Transkun v2 benchmark. The upstream browser decoder is cloned at CI time,
// not vendored or bundled into Quasaric; this keeps the experiment isolated from production.
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const upstream = '/tmp/TranskunWeb/src/transkun/';
const { loadTranskunBuffers } = await import(pathToFileURL(upstream + 'buffers.ts'));
const { TranskunModel, TranskunHeadsModel } = await import(pathToFileURL(upstream + 'onnxModel.ts'));
const { TranskunTranscriber } = await import(pathToFileURL(upstream + 'transcriber.ts'));

function readVar(b, s) {
  let v = 0;
  for (let i = 0; i < 4; i++) {
    if (s.pos >= s.end) throw new Error('Truncated MIDI variable value');
    const x = b[s.pos++]; v = (v << 7) | (x & 127);
    if (!(x & 128)) return v;
  }
  throw new Error('Invalid MIDI variable value');
}
function parseMidi(buffer) {
  if (buffer.toString('ascii', 0, 4) !== 'MThd') throw new Error('Invalid MIDI');
  const h = buffer.readUInt32BE(4), tracks = buffer.readUInt16BE(10), ppq = buffer.readUInt16BE(12);
  if (!ppq || (ppq & 0x8000)) throw new Error('Unsupported MIDI time division');
  const tempos = [{ tick: 0, us: 500000 }], raw = [];
  let pos = 8 + h;
  for (let tr = 0; tr < tracks; tr++) {
    if (buffer.toString('ascii', pos, pos + 4) !== 'MTrk') throw new Error('Invalid MIDI track');
    const len = buffer.readUInt32BE(pos + 4), s = { pos: pos + 8, end: pos + 8 + len };
    pos = s.end;
    let tick = 0, running = 0;
    const active = new Map();
    while (s.pos < s.end) {
      tick += readVar(buffer, s);
      let status = buffer[s.pos];
      if (status & 128) { s.pos++; if (status < 240) running = status; }
      else { if (!running) throw new Error('Invalid running status'); status = running; }
      if (status === 255) {
        const type = buffer[s.pos++], size = readVar(buffer, s);
        if (type === 81 && size === 3) {
          const us = (buffer[s.pos] << 16) | (buffer[s.pos + 1] << 8) | buffer[s.pos + 2];
          if (us) tempos.push({ tick, us });
        }
        s.pos += size; continue;
      }
      if (status === 240 || status === 247) { s.pos += readVar(buffer, s); running = 0; continue; }
      const kind = status & 240, channel = status & 15, pitch = buffer[s.pos++];
      const velocity = (kind === 192 || kind === 208) ? 0 : buffer[s.pos++];
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
function score(predicted, reference) {
  const remaining = new Set(reference.map((_, i) => i));
  const onsetAbs = [], onsetSigned = [], endAbs = [], endSigned = [];
  let tp = 0;
  for (const note of [...predicted].sort((a, b) => a.start - b.start)) {
    let best = -1, error = Infinity;
    for (const i of remaining) {
      const target = reference[i];
      if (target.pitch !== note.pitch) continue;
      const e = Math.abs(target.start - note.start);
      if (e <= 0.1 && e < error) { best = i; error = e; }
    }
    if (best >= 0) {
      remaining.delete(best); tp++;
      const on = (note.start - reference[best].start) * 1000;
      const off = (note.end - reference[best].end) * 1000;
      onsetAbs.push(Math.abs(on)); onsetSigned.push(on); endAbs.push(Math.abs(off)); endSigned.push(off);
    }
  }
  const fp = predicted.length - tp, fn = reference.length - tp;
  const precision = tp / Math.max(1, tp + fp), recall = tp / Math.max(1, tp + fn);
  return {
    predictedNotes: predicted.length, truePositives: tp, falsePositives: fp, falseNegatives: fn,
    precision: +precision.toFixed(4), recall: +recall.toFixed(4),
    f1: +(2 * precision * recall / Math.max(1e-9, precision + recall)).toFixed(4),
    onsetAbsMs: { median: percentile(onsetAbs, 0.5), p95: percentile(onsetAbs, 0.95), signedMedian: percentile(onsetSigned, 0.5) },
    keyReleaseAbsMs: { median: percentile(endAbs, 0.5), p95: percentile(endAbs, 0.95), signedMedian: percentile(endSigned, 0.5) },
  };
}

const pcm = readFileSync('/tmp/maestro-44k.pcm');
if (pcm.length % 4) throw new Error('Invalid float32 PCM');
const audio = new Float32Array(pcm.length / 4);
for (let i = 0; i < audio.length; i++) audio[i] = pcm.readFloatLE(i * 4);
const reference = parseMidi(readFileSync('/tmp/maestro.midi'));
const buffers = await loadTranskunBuffers('https://huggingface.co/TuesdayCrowd/transkun-onnx/resolve/main/');
console.log('Transkun parameters:', buffers.params);
const model = new TranskunModel(new Uint8Array(readFileSync('/tmp/transkun.onnx')));
const heads = new TranskunHeadsModel(new Uint8Array(readFileSync('/tmp/transkun-heads.onnx')));
await model.load(['cpu']);
await heads.load(['cpu']);
const transcriber = new TranskunTranscriber(buffers, model, heads);
const result = await transcriber.transcribe(audio, p => {
  if (p.stage === 'merge') console.log('Transkun segment', p.segmentsDone, '/', p.segmentsTotal);
});
const predicted = result.notes.map(n => ({
  pitch: n.pitch, start: n.onsetSample / buffers.params.fs,
  end: (n.onsetSample + n.durationSample) / buffers.params.fs,
}));
const report = {
  dataset: 'MAESTRO v3.0.0 held-out test performance',
  model: 'Transkun v2 ONNX + semi-CRF decoder (WASM CPU)',
  audioSeconds: +(audio.length / buffers.params.fs).toFixed(2),
  predictedPedalChanges: result.pedal.length,
  referenceNotes: reference.length,
  metrics: score(predicted, reference),
};
console.log('TRANSKUN REAL-PIANO BENCHMARK');
console.log(JSON.stringify(report, null, 2));
if (!predicted.length) throw new Error('Transkun produced no notes');
