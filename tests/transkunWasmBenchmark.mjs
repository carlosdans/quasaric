// Real MAESTRO benchmark using Quasaric's actual Transkun modules and ONNX Runtime Web WASM.
import { readFileSync } from 'node:fs';
import { loadTranskunBuffers } from '../src/analysis/transkun/buffers.ts';
import { TranskunModel, TranskunHeadsModel } from '../src/analysis/transkun/onnxModel.ts';
import { TranskunTranscriber } from '../src/analysis/transkun/transcriber.ts';

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
  const tempos = [{ tick: 0, us: 500000 }], raw = [], pedals = [];
  let pos = 8 + h;
  for (let tr = 0; tr < tracks; tr++) {
    if (buffer.toString('ascii', pos, pos + 4) !== 'MTrk') throw new Error('Invalid MIDI track');
    const len = buffer.readUInt32BE(pos + 4), s = { pos: pos + 8, end: pos + 8 + len };
    pos = s.end;
    let tick = 0, running = 0;
    const active = new Map(), pedalDown = new Map();
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
      const kind = status & 240, channel = status & 15, data1 = buffer[s.pos++];
      const data2 = (kind === 192 || kind === 208) ? 0 : buffer[s.pos++];
      const channelKey = tr + ':' + channel;
      if (kind === 176 && data1 === 64) {
        if (data2 >= 64 && !pedalDown.has(channelKey)) pedalDown.set(channelKey, tick);
        else if (data2 < 64 && pedalDown.has(channelKey)) {
          pedals.push({ track: tr, channel, startTick: pedalDown.get(channelKey), endTick: tick });
          pedalDown.delete(channelKey);
        }
        continue;
      }
      const key = channelKey + ':' + data1;
      if (kind === 144 && data2 > 0) {
        const q = active.get(key) ?? []; q.push(tick); active.set(key, q);
      } else if (kind === 128 || (kind === 144 && data2 === 0)) {
        const q = active.get(key);
        if (q?.length) { raw.push({ track: tr, channel, pitch: data1, startTick: q.shift(), endTick: tick }); if (!q.length) active.delete(key); }
      }
    }
    const lastNoteTick = raw.filter(n => n.track === tr).reduce((m, n) => Math.max(m, n.endTick), tick);
    for (const [key, startTick] of pedalDown) {
      const channel = Number(key.split(':')[1]);
      pedals.push({ track: tr, channel, startTick, endTick: lastNoteTick });
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
  const notes = raw.filter(n => n.pitch >= 21 && n.pitch <= 108 && n.endTick > n.startTick)
    .map(n => ({ pitch: n.pitch, start: time(n.startTick), end: time(n.endTick) }))
    .sort((a, b) => a.start - b.start || a.pitch - b.pitch);
  const pedalIntervals = pedals
    .filter(p => p.endTick > p.startTick)
    .map(p => ({ start: time(p.startTick), end: time(p.endTick) }));
  return { notes, pedalIntervals };

}
const percentile = (a, p) => a.length ? [...a].sort((x, y) => x - y)[Math.min(a.length - 1, Math.ceil(p * a.length) - 1)] : null;
function matchNotes(predicted, reference, accepts) {
  // Maximum-cardinality one-to-one matching. A greedy nearest-note pass can
  // consume the only valid reference for a later prediction and undercount TP.
  const candidates = predicted.map((note, pi) => reference
    .map((target, ri) => ({ ri, error: Math.abs(note.start - target.start) }))
    .filter(({ ri, error }) => accepts(note, reference[ri], error))
    .sort((a, b) => a.error - b.error || a.ri - b.ri));
  const order = predicted.map((_, i) => i)
    .sort((a, b) => candidates[a].length - candidates[b].length || predicted[a].start - predicted[b].start);
  const owner = new Int32Array(reference.length).fill(-1);
  const visit = (pi, seen) => {
    for (const { ri } of candidates[pi]) {
      if (seen[ri]) continue;
      seen[ri] = 1;
      if (owner[ri] < 0 || visit(owner[ri], seen)) {
        owner[ri] = pi;
        return true;
      }
    }
    return false;
  };
  for (const pi of order) visit(pi, new Uint8Array(reference.length));
  const pairs = [];
  for (let ri = 0; ri < owner.length; ri++) if (owner[ri] >= 0) pairs.push({ predictedIndex: owner[ri], referenceIndex: ri });
  return pairs;
}
function score(predicted, reference) {
  const pairs = matchNotes(predicted, reference, (note, target, error) =>
    note.pitch === target.pitch && error <= 0.05);
  const onsetAbs = [], onsetSigned = [], endAbs = [], endSigned = [];
  for (const { predictedIndex, referenceIndex } of pairs) {
    const note = predicted[predictedIndex], target = reference[referenceIndex];
    const on = (note.start - target.start) * 1000;
    const off = (note.end - target.end) * 1000;
    onsetAbs.push(Math.abs(on)); onsetSigned.push(on);
    endAbs.push(Math.abs(off)); endSigned.push(off);
  }
  const tp = pairs.length, fp = predicted.length - tp, fn = reference.length - tp;
  const precision = tp / Math.max(1, tp + fp), recall = tp / Math.max(1, tp + fn);

  // Diagnose duration errors by reference-note length. Signed offset is
  // predicted key release minus reference key release: positive = too long.
  const durationGroups = [
    { label: '<100ms', min: 0, max: 0.1 },
    { label: '100-250ms', min: 0.1, max: 0.25 },
    { label: '250-500ms', min: 0.25, max: 0.5 },
    { label: '>=500ms', min: 0.5, max: Infinity },
  ];
  const durationDiagnostics = durationGroups.map(group => {
    const rows = pairs.map(({ predictedIndex, referenceIndex }) => {
      const note = predicted[predictedIndex], target = reference[referenceIndex];
      return {
        duration: target.end - target.start,
        predictedDuration: note.end - note.start,
        signedMs: (note.end - target.end) * 1000,
        absMs: Math.abs(note.end - target.end) * 1000,
        toleranceMs: Math.max(50, 0.2 * (target.end - target.start) * 1000),
      };
    }).filter(row => row.duration >= group.min && row.duration < group.max);
    const signed = rows.map(row => row.signedMs);
    const absolute = rows.map(row => row.absMs);
    return {
      referenceDuration: group.label,
      notes: rows.length,
      medianSignedMs: percentile(signed, 0.5),
      medianAbsMs: percentile(absolute, 0.5),
      p95AbsMs: percentile(absolute, 0.95),
      tooLong: rows.filter(row => row.signedMs > row.toleranceMs).length,
      tooShort: rows.filter(row => row.signedMs < -row.toleranceMs).length,
      withinOfficialOffsetTolerance: rows.filter(row => row.absMs <= row.toleranceMs).length,
    };
  });

  const predictedDurationDiagnostics = durationGroups.map(group => {
    const rows = pairs.map(({ predictedIndex, referenceIndex }) => {
      const note = predicted[predictedIndex], target = reference[referenceIndex];
      return {
        predictedDuration: note.end - note.start,
        signedMs: (note.end - target.end) * 1000,
        absMs: Math.abs(note.end - target.end) * 1000,
        toleranceMs: Math.max(50, 0.2 * (target.end - target.start) * 1000),
      };
    }).filter(row => row.predictedDuration >= group.min && row.predictedDuration < group.max);
    const signed = rows.map(row => row.signedMs);
    const absolute = rows.map(row => row.absMs);
    return {
      predictedDuration: group.label,
      notes: rows.length,
      medianSignedMs: percentile(signed, 0.5),
      medianAbsMs: percentile(absolute, 0.5),
      p95AbsMs: percentile(absolute, 0.95),
      tooLong: rows.filter(row => row.signedMs > row.toleranceMs).length,
      tooShort: rows.filter(row => row.signedMs < -row.toleranceMs).length,
      withinOfficialOffsetTolerance: rows.filter(row => row.absMs <= row.toleranceMs).length,
    };
  });

  const offsetPairs = matchNotes(predicted, reference, (note, target, onsetError) =>
    note.pitch === target.pitch && onsetError <= 0.05 &&
    Math.abs(target.end - note.end) <= Math.max(0.05, 0.2 * (target.end - target.start)));
  const offsetTp = offsetPairs.length;
  const offsetFp = predicted.length - offsetTp, offsetFn = reference.length - offsetTp;
  const offsetPrecision = offsetTp / Math.max(1, offsetTp + offsetFp);
  const offsetRecall = offsetTp / Math.max(1, offsetTp + offsetFn);

  // The published mir_eval note+offset metric uses a 50 ms minimum offset tolerance,
  // or 20% of the reference note duration when that is larger. Keep the 100 ms minimum
  // as a separate, more permissive sensitivity metric.
  const relaxedOffsetPairs = matchNotes(predicted, reference, (note, target, onsetError) =>
    note.pitch === target.pitch && onsetError <= 0.05 &&
    Math.abs(target.end - note.end) <= Math.max(0.1, 0.2 * (target.end - target.start)));
  const relaxedTp = relaxedOffsetPairs.length;
  const relaxedFp = predicted.length - relaxedTp, relaxedFn = reference.length - relaxedTp;
  const relaxedPrecision = relaxedTp / Math.max(1, relaxedTp + relaxedFp);
  const relaxedRecall = relaxedTp / Math.max(1, relaxedTp + relaxedFn);

  return {
    predictedNotes: predicted.length, truePositives: tp, falsePositives: fp, falseNegatives: fn,
    precision: +precision.toFixed(4), recall: +recall.toFixed(4),
    f1: +(2 * precision * recall / Math.max(1e-9, precision + recall)).toFixed(4),
    onsetOffsetOfficial: {
      criterion: 'onset <= 50 ms; key-release offset <= max(50 ms, 20% of reference duration)',
      truePositives: offsetTp, falsePositives: offsetFp, falseNegatives: offsetFn,
      precision: +offsetPrecision.toFixed(4), recall: +offsetRecall.toFixed(4),
      f1: +(2 * offsetPrecision * offsetRecall / Math.max(1e-9, offsetPrecision + offsetRecall)).toFixed(4),
    },
    onsetOffset100ms: {
      criterion: 'onset <= 50 ms; key-release offset <= max(100 ms, 20% of reference duration)',
      truePositives: relaxedTp, falsePositives: relaxedFp, falseNegatives: relaxedFn,
      precision: +relaxedPrecision.toFixed(4), recall: +relaxedRecall.toFixed(4),
      f1: +(2 * relaxedPrecision * relaxedRecall / Math.max(1e-9, relaxedPrecision + relaxedRecall)).toFixed(4),
    },
    onsetAbsMs: { median: percentile(onsetAbs, 0.5), p95: percentile(onsetAbs, 0.95), signedMedian: percentile(onsetSigned, 0.5) },
    keyReleaseAbsMs: {
      median: percentile(endAbs, 0.5),
      p95: percentile(endAbs, 0.95),
      signedMedian: percentile(endSigned, 0.5),
      signedP90: percentile(endSigned, 0.9),
      signedP95: percentile(endSigned, 0.95),
      tooLongOver100ms: endSigned.filter(x => x > 100).length,
      tooShortOver100ms: endSigned.filter(x => x < -100).length,
    },
    keyReleaseByReferenceDuration: durationDiagnostics,
    keyReleaseByPredictedDuration: predictedDurationDiagnostics,
  };
}


function scorePedal(predicted, reference, toleranceSeconds = 0.1) {
  const candidates = predicted.map((event, pi) => reference
    .map((target, ri) => ({ ri, error: Math.abs(event.time - target.time) }))
    .filter(({ ri, error }) => predicted[pi].on === reference[ri].on && error <= toleranceSeconds)
    .sort((a, b) => a.error - b.error || a.ri - b.ri));
  const order = predicted.map((_, i) => i)
    .sort((a, b) => candidates[a].length - candidates[b].length || predicted[a].time - predicted[b].time);
  const owner = new Int32Array(reference.length).fill(-1);
  const visit = (pi, seen) => {
    for (const { ri } of candidates[pi]) {
      if (seen[ri]) continue;
      seen[ri] = 1;
      if (owner[ri] < 0 || visit(owner[ri], seen)) {
        owner[ri] = pi;
        return true;
      }
    }
    return false;
  };
  for (const pi of order) visit(pi, new Uint8Array(reference.length));
  const errors = [];
  for (let ri = 0; ri < owner.length; ri++) {
    if (owner[ri] >= 0) errors.push(Math.abs(predicted[owner[ri]].time - reference[ri].time) * 1000);
  }
  const tp = errors.length, fp = predicted.length - tp, fn = reference.length - tp;
  const precision = tp / Math.max(1, tp + fp), recall = tp / Math.max(1, tp + fn);
  return {
    toleranceMs: toleranceSeconds * 1000,
    predictedTransitions: predicted.length,
    referenceTransitions: reference.length,
    truePositives: tp, falsePositives: fp, falseNegatives: fn,
    precision: +precision.toFixed(4), recall: +recall.toFixed(4),
    f1: +(2 * precision * recall / Math.max(1e-9, precision + recall)).toFixed(4),
    timingAbsMs: { median: percentile(errors, 0.5), p95: percentile(errors, 0.95) },
  };
}

const [audioPath = '/tmp/maestro-44k.pcm', midiPath = '/tmp/maestro.midi'] = process.argv.slice(2);
const pcm = readFileSync(audioPath);
if (pcm.length % 4) throw new Error('Invalid float32 PCM');
const audio = new Float32Array(pcm.length / 4);
for (let i = 0; i < audio.length; i++) audio[i] = pcm.readFloatLE(i * 4);
const midiBytes = readFileSync(midiPath);
const referenceData = parseMidi(midiBytes);
const reference = referenceData.notes;
const referencePedal = referenceData.pedalIntervals.flatMap(p => [
  { time: p.start, on: true }, { time: p.end, on: false },
]).sort((a, b) => a.time - b.time);
const buffers = await loadTranskunBuffers('https://huggingface.co/TuesdayCrowd/transkun-onnx/resolve/main/');
console.log('Transkun parameters:', buffers.params);
const model = new TranskunModel(new Uint8Array(readFileSync('/tmp/transkun.onnx')));
const heads = new TranskunHeadsModel(new Uint8Array(readFileSync('/tmp/transkun-heads.onnx')));
await model.load();
await heads.load();
const transcriber = new TranskunTranscriber(buffers, model, heads);
const result = await transcriber.transcribe(audio, p => {
  if (p.stage === 'merge') console.log('Transkun segment', p.segmentsDone, '/', p.segmentsTotal);
});
const predicted = result.notes.map(n => ({
  pitch: n.pitch, start: n.onsetSample / buffers.params.fs,
  end: (n.onsetSample + n.durationSample) / buffers.params.fs,
}));
const datasetSplit = process.env.MAESTRO_SPLIT === 'validation' ? 'validation' : 'test';
const report = {
  dataset: `MAESTRO v3.0.0 ${datasetSplit} split`,
  model: 'Quasaric Transkun v2 + ONNX Runtime WebAssembly (CPU)',
  referenceFile: midiPath,
  audioSeconds: +(audio.length / buffers.params.fs).toFixed(2),
  predictedPedalChanges: result.pedal.length,
  referencePedalChanges: referencePedal.length,
  referenceNotes: reference.length,
  metrics: score(predicted, reference),
  pedalMetrics: scorePedal(result.pedal.map(p => ({ time: p.sample / buffers.params.fs, on: p.on })), referencePedal),
};
console.log('TRANSKUN REAL-PIANO BENCHMARK');
console.log(JSON.stringify(report, null, 2));
if (!predicted.length) throw new Error('Transkun produced no notes');
