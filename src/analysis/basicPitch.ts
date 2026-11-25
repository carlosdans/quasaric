// Audio-to-MIDI with Spotify's Basic Pitch (Apache-2.0, model ~230 KB).
// This file is the maths around the model, ported from basic_pitch 0.4.0
// (inference.py, note_creation.py) with the default settings; the model itself
// runs in transcribeWorker.ts.

export const BP_SR = 22050;
const FFT_HOP = 256;
const AUDIO_N_SAMPLES = BP_SR * 2 - FFT_HOP; // 43844 samples per model window
const ANNOT_N_FRAMES = 172; // output frames per window
const N_OVERLAP_FRAMES = 30;
const OVERLAP_LEN = N_OVERLAP_FRAMES * FFT_HOP;
export const BP_WINDOW_HOP = AUDIO_N_SAMPLES - OVERLAP_LEN;
const HOP_SIZE = BP_WINDOW_HOP;
export const BP_FRAMES_PER_WINDOW = ANNOT_N_FRAMES - N_OVERLAP_FRAMES;
export const BP_WINDOW = AUDIO_N_SAMPLES;
export const BP_PITCHES = 88;
const MIDI_OFFSET = 21;

export interface NoteEvent {
  start: number; // seconds
  end: number;
  pitch: number; // MIDI note
  amp: number; // 0–1
}

/** Model input windows: the audio (22.05 kHz mono) with half an overlap of silence in front. */
export function bpWindows(audio: Float32Array): Float32Array[] {
  const padded = new Float32Array(audio.length + OVERLAP_LEN / 2);
  padded.set(audio, OVERLAP_LEN / 2);
  const out: Float32Array[] = [];
  for (let i = 0; i < padded.length; i += HOP_SIZE) {
    const w = new Float32Array(AUDIO_N_SAMPLES);
    w.set(padded.subarray(i, i + AUDIO_N_SAMPLES));
    out.push(w);
  }
  return out;
}

/** Join per-window outputs (each ANNOT_N_FRAMES × bins), dropping the overlaps. */
export function bpUnwrap(parts: Float32Array[], bins: number, audioLength: number): { data: Float32Array; frames: number } {
  const olap = N_OVERLAP_FRAMES / 2;
  const keep = ANNOT_N_FRAMES - 2 * olap;
  // Match Basic Pitch's reference implementation: the output length is based on
  // the number of audio-window hops, not the nominal frame rate. The two differ
  // slightly because 142 kept model frames do not equal the 36,164-sample hop.
  const frames = Math.min(parts.length * keep, Math.floor((audioLength / HOP_SIZE) * keep));
  const data = new Float32Array(frames * bins);
  for (let w = 0; w < parts.length; w++) {
    for (let t = 0; t < keep; t++) {
      const dst = w * keep + t;
      if (dst >= frames) break;
      data.set(parts[w].subarray((t + olap) * bins, (t + olap + 1) * bins), dst * bins);
    }
  }
  return { data, frames };
}

/** Frame index → seconds, including basic_pitch's small per-window correction. */
export function bpFrameTime(i: number) {
  const offset = (FFT_HOP / BP_SR) * (ANNOT_N_FRAMES - AUDIO_N_SAMPLES / FFT_HOP) + 0.0018;
  const framesPerWindow = ANNOT_N_FRAMES - N_OVERLAP_FRAMES; // bpUnwrap keeps 142 frames from each 172-frame window.
  return (i * FFT_HOP) / BP_SR - offset * Math.floor(i / framesPerWindow);
}

/** Piano notes are often shorter than the generic Basic Pitch default.
 * Keep confidence thresholds conservative; lower only the minimum duration. */
export const PIANO_NOTE_OPTIONS: NoteOptions = { minNoteMs: 65, suppressHarmonics: true };

/** Use the piano-specific duration profile only for an explicitly named piano/keys stem. */
export function noteOptionsForSource(source: string): NoteOptions | undefined {
  return /piano|keys|keyboard/i.test(source) ? PIANO_NOTE_OPTIONS : undefined;
}

export interface NoteOptions {
  onsetThresh?: number; // 0.5
  frameThresh?: number; // 0.3
  minNoteMs?: number; // 127.7
  /** Lowest and highest MIDI notes to keep. */
  minPitch?: number;
  maxPitch?: number;
  /** Suppress weak, short high partials that Basic Pitch mistakes for piano keys. */
  suppressHarmonics?: boolean;
}

/**
 * Note events from the model's "note" (frames) and "onset" activations
 * (frames × 88, frame-major). Same algorithm as basic_pitch's
 * output_to_notes_polyphonic with infer_onsets and the melodia trick on.
 */
export function bpNotes(framesIn: Float32Array, onsetsIn: Float32Array, n: number, o: NoteOptions = {}): NoteEvent[] {
  const P = BP_PITCHES;
  const onsetThresh = o.onsetThresh ?? 0.5;
  const frameThresh = o.frameThresh ?? 0.3;
  const minLen = Math.round(((o.minNoteMs ?? 127.7) / 1000) * (BP_SR / FFT_HOP));
  const energyTol = 11;
  const frames = Float32Array.from(framesIn.subarray(0, n * P));
  const onsets = Float32Array.from(onsetsIn.subarray(0, n * P));
  // Pitch limits.
  const lo = o.minPitch != null ? Math.max(0, o.minPitch - MIDI_OFFSET) : 0;
  const hi = o.maxPitch != null ? Math.min(P, o.maxPitch - MIDI_OFFSET + 1) : P;
  if (lo > 0 || hi < P) for (let t = 0; t < n; t++) for (let p = 0; p < P; p++) if (p < lo || p >= hi) frames[t * P + p] = onsets[t * P + p] = 0;

  // Infer extra onsets from sharp rises in the frame activations.
  const diff = new Float32Array(n * P);
  let maxDiff = 0;
  let maxOnset = 0;
  for (let t = 0; t < n; t++)
    for (let p = 0; p < P; p++) {
      const v = frames[t * P + p];
      const d1 = v - (t >= 1 ? frames[(t - 1) * P + p] : 0);
      const d2 = v - (t >= 2 ? frames[(t - 2) * P + p] : 0);
      const d = t < 2 ? 0 : Math.max(0, Math.min(d1, d2));
      diff[t * P + p] = d;
      if (d > maxDiff) maxDiff = d;
      if (onsets[t * P + p] > maxOnset) maxOnset = onsets[t * P + p];
    }
  if (maxDiff > 0) for (let i = 0; i < diff.length; i++) onsets[i] = Math.max(onsets[i], (maxOnset * diff[i]) / maxDiff);

  // Onset peaks (strict local maxima in time) above threshold, latest first.
  const peaks: [number, number][] = [];
  for (let t = 1; t < n - 1; t++)
    for (let p = 0; p < P; p++) {
      const v = onsets[t * P + p];
      if (v >= onsetThresh && v > onsets[(t - 1) * P + p] && v > onsets[(t + 1) * P + p]) peaks.push([t, p]);
    }
  peaks.sort((a, b) => b[0] - a[0] || b[1] - a[1]);

  const rem = Float32Array.from(frames);
  const notes: [number, number, number, number][] = [];
  const clearAround = (t: number, p: number) => {
    rem[t * P + p] = 0;
    if (p < P - 1) rem[t * P + p + 1] = 0;
    if (p > 0) rem[t * P + p - 1] = 0;
  };
  const meanAmp = (s: number, e: number, p: number) => {
    let a = 0;
    for (let t = s; t < e; t++) a += frames[t * P + p];
    return e > s ? a / (e - s) : 0;
  };

  for (const [start, p] of peaks) {
    if (start >= n - 1) continue;
    let i = start + 1;
    let k = 0;
    while (i < n - 1 && k < energyTol) {
      k = rem[i * P + p] < frameThresh ? k + 1 : 0;
      i++;
    }
    i -= k;
    if (i - start <= minLen) continue;
    for (let t = start; t < i; t++) clearAround(t, p);
    notes.push([start, i, p + MIDI_OFFSET, meanAmp(start, i, p)]);
  }

  // Melodia trick: follow what's left from the strongest points outward.
  // Values only ever drop to zero, so visiting cells strongest-first finds
  // each remaining maximum without rescanning the whole grid.
  const order: number[] = [];
  for (let i = 0; i < rem.length; i++) if (rem[i] > frameThresh) order.push(i);
  order.sort((a, b) => rem[b] - rem[a] || a - b);
  const orig = Float32Array.from(rem);
  for (const idx of order) {
    if (rem[idx] !== orig[idx] || rem[idx] <= frameThresh) continue;
    const mid = Math.floor(idx / P);
    const p = idx % P;
    rem[idx] = 0;
    let i = mid + 1;
    let k = 0;
    while (i < n - 1 && k < energyTol) {
      k = rem[i * P + p] < frameThresh ? k + 1 : 0;
      clearAround(i, p);
      i++;
    }
    const end = i - 1 - k;
    i = mid - 1;
    k = 0;
    while (i > 0 && k < energyTol) {
      k = rem[i * P + p] < frameThresh ? k + 1 : 0;
      clearAround(i, p);
      i--;
    }
    const start = i + 1 + k;
    if (end - start <= minLen) continue;
    notes.push([start, end, p + MIDI_OFFSET, meanAmp(start, end, p)]);
  }

  const events = notes
    .map(([s, e, pitch, amp]) => ({ start: +bpFrameTime(s).toFixed(4), end: +bpFrameTime(e).toFixed(4), pitch, amp: +amp.toFixed(3) }))
    .sort((a, b) => a.start - b.start || a.pitch - b.pitch);
  if (!o.suppressHarmonics) return events;

  // A piano's upper partials can be mistaken for separate keys. Only suppress
  // unusually weak, short notes at a harmonic interval whose onset coincides
  // with a substantially stronger lower note. Octaves and two-octave doublings
  // are deliberately retained because they are common real piano voicings.
  const harmonicIntervals = new Set([19, 28, 31, 34, 36, 38, 40]);
  return events.filter((high) => {
    const highDuration = high.end - high.start;
    return !events.some((low) => {
      if (low.pitch >= high.pitch || !harmonicIntervals.has(high.pitch - low.pitch)) return false;
      const lowDuration = low.end - low.start;
      const overlap = Math.max(0, Math.min(high.end, low.end) - Math.max(high.start, low.start));
      return Math.abs(high.start - low.start) <= 0.06 &&
        highDuration <= lowDuration * 0.65 &&
        overlap >= highDuration * 0.8 &&
        high.amp <= low.amp * 0.7;
    });
  });
}

/**
 * For parts that play one note at a time (lead vocal, bass): keep the
 * strongest note wherever notes overlap. Removes the harmonics the model
 * sometimes reports as extra notes an octave or a twelfth above.
 */
export function singleLine(notes: NoteEvent[]): NoteEvent[] {
  const kept: NoteEvent[] = [];
  for (const n of [...notes].sort((a, b) => b.amp - a.amp)) {
    const clash = kept.some((k) => Math.min(n.end, k.end) - Math.max(n.start, k.start) >= 0.3 * Math.min(n.end - n.start, k.end - k.start));
    if (!clash) kept.push(n);
  }
  return kept.sort((a, b) => a.start - b.start);
}
