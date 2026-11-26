/// <reference lib="webworker" />
// Audio-to-MIDI worker. Piano stems use Transkun v2 (CPU/WASM); other sources
// retain the lightweight Basic Pitch path. Audio never leaves this worker/device.

import * as ort from 'onnxruntime-web/wasm';
import { BP_PITCHES, BP_WINDOW, bpNotes, bpUnwrap, bpWindows, type NoteEvent, type NoteOptions } from './basicPitch.ts';
import { decimate2 } from './resample.ts';
import { loadTranskunBuffers } from './transkun/buffers.ts';
import { TranskunModel, TranskunHeadsModel } from './transkun/onnxModel.ts';
import { TranskunTranscriber } from './transkun/transcriber.ts';

export type TranscriptionEngine = 'basic-pitch' | 'transkun';
export type TranscribeIn = { type: 'transcribe'; id: number; mono: Float32Array; opts?: NoteOptions; engine?: TranscriptionEngine };
export type TranscribeOut =
  | { type: 'progress'; id: number; done: number; total: number }
  | { type: 'done'; id: number; notes: NoteEvent[] }
  | { type: 'error'; id: number; message: string };

const post = (m: TranscribeOut) => (self as DedicatedWorkerGlobalScope).postMessage(m);
ort.env.wasm.numThreads = 1;
ort.env.logLevel = 'error';

let basicSession: Promise<ort.InferenceSession> | null = null;
const getBasicSession = () =>
  (basicSession ??= (async () => {
    const res = await fetch(new URL('./models/basic-pitch.onnx', import.meta.url));
    if (!res.ok) throw new Error(`Couldn't load the transcription model (${res.status})`);
    return ort.InferenceSession.create(new Uint8Array(await res.arrayBuffer()), { executionProviders: ['wasm'] });
  })());

const TRANSKUN_BASE = 'https://huggingface.co/TuesdayCrowd/transkun-onnx/resolve/main/';
let transkunEngine: Promise<TranskunTranscriber> | null = null;
let transkunInstance: TranskunTranscriber | null = null;
const fetchModel = async (name: string) => {
  const response = await fetch(TRANSKUN_BASE + name);
  if (!response.ok) throw new Error(`Couldn't download Transkun model ${name} (${response.status})`);
  return new Uint8Array(await response.arrayBuffer());
};
const getTranskun = () =>
  (transkunEngine ??= (async () => {
    const [buffers, modelBytes, headsBytes] = await Promise.all([
      loadTranskunBuffers(TRANSKUN_BASE),
      fetchModel('transkun.onnx'),
      fetchModel('transkun-heads.onnx'),
    ]);
    const model = new TranskunModel(modelBytes);
    const heads = new TranskunHeadsModel(headsBytes);
    await model.load();
    try {
      await heads.load();
    } catch (error) {
      await model.release();
      throw error;
    }
    transkunInstance = new TranskunTranscriber(buffers, model, heads);
    return transkunInstance;
  })());

async function transcribeBasic(m: TranscribeIn) {
  const s = await getBasicSession();
  const audio = decimate2(m.mono, 63);
  const windows = bpWindows(audio);
  const notes: Float32Array[] = [];
  const onsets: Float32Array[] = [];
  for (let i = 0; i < windows.length; i++) {
    const r = await s.run({ 'serving_default_input_2:0': new ort.Tensor('float32', windows[i], [1, BP_WINDOW, 1]) });
    notes.push(r['StatefulPartitionedCall:1'].data as Float32Array);
    onsets.push(r['StatefulPartitionedCall:2'].data as Float32Array);
    post({ type: 'progress', id: m.id, done: i + 1, total: windows.length });
  }
  const n = bpUnwrap(notes, BP_PITCHES, audio.length);
  const o = bpUnwrap(onsets, BP_PITCHES, audio.length);
  return bpNotes(n.data, o.data, n.frames, m.opts);
}

async function transcribePiano(m: TranscribeIn) {
  const engine = await getTranskun();
  const result = await engine.transcribe(m.mono, (p) => {
    if (p.stage === 'merge') post({ type: 'progress', id: m.id, done: p.segmentsDone, total: p.segmentsTotal });
  });
  return result.notes.map((n) => ({
    start: +(n.onsetSample / 44100).toFixed(4),
    end: +((n.onsetSample + n.durationSample) / 44100).toFixed(4),
    pitch: n.pitch,
    amp: +(n.velocity / 127).toFixed(3),
  }));
}

async function transcribe(m: TranscribeIn) {
  return m.engine === 'transkun' ? transcribePiano(m) : transcribeBasic(m);
}

// ONNX Runtime starts its WASM threads from this same script: leave those alone.
if (!(self.name ?? '').startsWith('em-pthread'))
  self.onmessage = async (e: MessageEvent<TranscribeIn>) => {
    const m = e.data;
    try {
      post({ type: 'done', id: m.id, notes: await transcribe(m) });
    } catch (err) {
      if (m.engine === 'transkun') {
        await transkunInstance?.dispose().catch(() => {});
        transkunInstance = null;
        transkunEngine = null;
      }
      post({ type: 'error', id: m.id, message: String((err as Error)?.message ?? err) });
    }
  };
