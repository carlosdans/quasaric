/// <reference lib="webworker" />
// Separation worker: owns ONNX Runtime sessions and runs the model off the UI thread.

// The ONNX Runtime build is injected by workerGpu.ts / workerCpu.ts (see initWorker).
import type * as OrtT from 'onnxruntime-web/webgpu';
import { MODELS, neededFiles, type ModelFile, type ModelId, type Precision } from '../models.ts';
import { fixFloat64 } from './fixfloat64.ts';
import { gpuSupportsPrecision } from './backend.ts';
import { withTimeout } from './timeout.ts';
import { CancelledError, SEGMENT, pickStems, separate, type Member, type Stereo } from './separate.ts';
import type { Device } from '../settings.ts';

export interface SeparateJob {
  type: 'separate';
  id: string;
  mix: Stereo;
  model: ModelId;
  precision: Precision;
  device: Device;
  shifts: number;
  overlap: number;
  twoStems: string;
  skip: string[];
}

export type WorkerIn = SeparateJob | { type: 'cancel'; id: string } | { type: 'model-bytes'; key: string; bytes: ArrayBuffer | null };

export type WorkerOut =
  | { type: 'need-model'; key: string }
  | { type: 'backend'; backend: 'webgpu' | 'wasm'; threads: number; note?: string }
  | { type: 'progress'; id: string; done: number; total: number; stage: string }
  | { type: 'done'; id: string; stems: { name: string; data: Stereo }[] }
  | { type: 'error'; id: string; message: string; cancelled?: boolean };

const post = (m: WorkerOut, transfer: Transferable[] = []) => (self as DedicatedWorkerGlobalScope).postMessage(m, transfer);

let ort: typeof OrtT;
const isolated = (self as any).crossOriginIsolated === true;

/**
 * Called by the entry file once it has imported an ONNX Runtime build. Two builds exist because the
 * WebGPU one ships an asyncify-instrumented WASM binary that makes WebKitGTK (the Linux desktop
 * webview, which has no WebGPU) allocate without bound while creating a session, and get OOM-killed.
 */
export function initWorker(o: typeof OrtT) {
  ort = o;
  ort.env.wasm.numThreads = isolated ? Math.min(8, Math.max(1, navigator.hardwareConcurrency || 4)) : 1;
  ort.env.logLevel = 'error';
}

// ---- model bytes come from the main thread (which owns the cache/download UI)
const pending = new Map<string, (b: ArrayBuffer | null) => void>();
function requestModel(key: string): Promise<ArrayBuffer | null> {
  return new Promise((resolve) => {
    pending.set(key, resolve);
    post({ type: 'need-model', key });
  });
}

// ---- backend choice
let gpuAdapter: any | null | undefined;
async function getWebGPUAdapter() {
  if (gpuAdapter !== undefined) return gpuAdapter;
  try {
    gpuAdapter = await (navigator as any).gpu?.requestAdapter() ?? null;
  } catch {
    gpuAdapter = null;
  }
  return gpuAdapter;
}

async function chooseBackend(
  pref: Device,
  precision: Precision,
): Promise<{ backend: 'webgpu' | 'wasm'; note?: string }> {
  if (pref === 'cpu') return { backend: 'wasm' };
  const adapter = await getWebGPUAdapter();
  if (!adapter) return { backend: 'wasm' };
  if (!gpuSupportsPrecision(adapter.features, precision)) {
    return {
      backend: 'wasm',
      note: 'This GPU does not support shader-f16, which the compact model requires. Quasaric is using the CPU instead.',
    };
  }
  // Pin the adapter that passed the capability check. ONNX Runtime otherwise requests a
  // second adapter, which can be a different GPU on hybrid Windows systems.
  (ort.env as any).webgpu.adapter = adapter;
  return { backend: 'webgpu' };
}

/** How long a GPU session may take to appear before the CPU is used instead. Creating one takes seconds; on some Windows GPU /
 * driver combinations it never returns, and with no error there is nothing to catch, so the wait itself has to be bounded. */
const GPU_SESSION_TIMEOUT_MS = 60_000;

// Graph optimisation must stay off: ONNX Runtime's constant folding expands
// these Demucs exports from ~1.2 GB to ~4.3 GB peak, past the 4 GB WASM limit
// ("std::bad_alloc"). Measured cost of leaving it off: ~30% slower.
const SESSION_OPTS: OrtT.InferenceSession.SessionOptions = { graphOptimizationLevel: 'disabled' };

// ---- session cache (keep several on big machines, one on small ones)
const sessions = new Map<string, OrtT.InferenceSession>();
const maxSessions = ((navigator as any).deviceMemory ?? 4) >= 8 ? 4 : 1;
// WASM sessions have a much tighter address-space budget than GPU sessions. Keep only one
// CPU session and release it after each member/job, even on machines reporting 8 GB+ RAM.
const maxWasmSessions = 1;
let lastBackend = '';

async function getSession(
  f: ModelFile,
  backend: 'webgpu' | 'wasm',
  fallbackNote?: string,
): Promise<{ s: OrtT.InferenceSession; backend: 'webgpu' | 'wasm' }> {
  const id = `${f.key}|${backend}`;
  const hit = sessions.get(id);
  if (hit) {
    sessions.delete(id);
    sessions.set(id, hit); // LRU bump
    return { s: hit, backend };
  }
  const backendSessions = [...sessions.keys()].filter((k) => k.endsWith(`|${backend}`));
  const sessionLimit = backend === 'wasm' ? maxWasmSessions : maxSessions;
  while (backendSessions.length >= sessionLimit) {
    const [k, old] = sessions.entries().next().value!;
    sessions.delete(k);
    await old.release();
    const index = backendSessions.indexOf(k);
    if (index >= 0) backendSessions.splice(index, 1);
  }
  const raw = await requestModel(f.key);
  if (!raw) throw new Error(`Model ${f.key} is not downloaded`);
  // Some exports use float64 maths the browser engine lacks; convert to float32.
  const bytes = fixFloat64(new Uint8Array(raw)).bytes;
  let s: OrtT.InferenceSession;
  let used = backend;
  let note: string | undefined = fallbackNote;
  const attempt = ort.InferenceSession.create(bytes, { executionProviders: [backend], ...SESSION_OPTS });
  try {
    s = backend === 'webgpu' ? await withTimeout(attempt, GPU_SESSION_TIMEOUT_MS, 'Loading the model on the GPU') : await attempt;
  } catch (e) {
    if (backend !== 'webgpu') throw e;
    // If the GPU attempt does turn up later, don't hold on to it.
    attempt.then((late) => late.release().catch(() => {}), () => {});
    gpuAdapter = null; // the rest of this run goes straight to the CPU
    note = `GPU failed (${(e as Error).message}); using CPU`;
    used = 'wasm';
    s = await ort.InferenceSession.create(bytes, { executionProviders: ['wasm'], ...SESSION_OPTS });
  }
  const key = `${used}`;
  if (key !== lastBackend || note) {
    lastBackend = key;
    post({ type: 'backend', backend: used, threads: ort.env.wasm.numThreads as number, note });
  }
  sessions.set(`${f.key}|${used}`, s);
  return { s, backend: used };
}

function runner(s: OrtT.InferenceSession) {
  const inName = s.inputNames[0];
  const outName = s.outputNames[0];
  return async (input: Float32Array) => {
    const tensor = new ort.Tensor('float32', input, [1, 2, SEGMENT]);
    let out: Record<string, OrtT.Tensor> | undefined;
    try {
      out = await s.run({ [inName]: tensor });
      const y = out[outName];
      return (await y.getData()) as Float32Array;
    } finally {
      // Explicitly release both input and output tensors instead of waiting for GC. This matters
      // on WASM, where the model's linear memory otherwise grows across chunks.
      tensor.dispose();
      if (out) for (const value of Object.values(out)) value.dispose();
    }
  };
}

// ---- jobs
const cancelled = new Set<string>();

function share(a: Float32Array): Float32Array {
  if (!isolated || a.buffer instanceof SharedArrayBuffer) return a; // already shared (see alloc below): no second copy
  const s = new Float32Array(new SharedArrayBuffer(a.byteLength));
  s.set(a);
  return s;
}

async function run(job: SeparateJob) {
  const info = MODELS[job.model];
  const chosen = neededFiles(job.model, job.precision, job.twoStems, job.skip);
  const choice = await chooseBackend(job.device, job.precision);
  const backend = choice.backend;
  let backendNote = choice.note;
  let stage = 'Separating';

  const members: Member[] = chosen.map((f, i) => ({
    rows: f.rows,
    load: async () => {
      stage = chosen.length > 1 ? `Model ${i + 1}/${chosen.length}` : 'Separating';
      post({ type: 'progress', id: job.id, done: -1, total: 0, stage: 'Loading model' });
      const { s } = await getSession(f, backend, backendNote);
      backendNote = undefined;
      return {
        run: runner(s),
        release: async () => {
          // Specialists are big: drop them straight away on small machines.
          if (s && (maxSessions === 1 || backend === 'wasm')) {
            for (const [k, v] of sessions) if (v === s) sessions.delete(k);
            await s.release();
          }
        },
      };
    },
  }));

  const raw = await separate(job.mix, {
    members,
    numSources: info.stems.length,
    shifts: job.shifts,
    overlap: job.overlap,
    isCancelled: () => cancelled.has(job.id),
    // When isolated the finished stems are handed back as shared memory. Allocating the result that way from
    // the start avoids a second full copy of every stem at the moment memory is already at its peak.
    alloc: isolated ? (n) => new Float32Array(new SharedArrayBuffer(n * 4)) : undefined,
    onProgress: (done, total) => post({ type: 'progress', id: job.id, done, total, stage }),
  });
  const computed = chosen.flatMap((f) => f.rows);
  const stems = pickStems(raw, info.stems, job.mix, job.twoStems, computed, job.skip).map((s) => ({
    name: s.name,
    data: [share(s.data[0]), share(s.data[1])] as Stereo,
  }));
  const transfer = isolated ? [] : stems.flatMap((s) => [s.data[0].buffer as ArrayBuffer, s.data[1].buffer as ArrayBuffer]);
  post({ type: 'done', id: job.id, stems }, transfer);
}

// ONNX Runtime starts its WASM threads from this same script (named "em-pthread*").
// Those must keep ORT's own message handler, so only install ours in the main worker.
const isThreadHelper = (self.name ?? '').startsWith('em-pthread');

if (!isThreadHelper) self.onmessage = async (e: MessageEvent<WorkerIn>) => {
  const m = e.data;
  if (m.type === 'model-bytes') {
    pending.get(m.key)?.(m.bytes);
    pending.delete(m.key);
  } else if (m.type === 'cancel') {
    cancelled.add(m.id);
  } else if (m.type === 'separate') {
    try {
      await run(m);
    } catch (err) {
      const c = err instanceof CancelledError;
      post({ type: 'error', id: m.id, message: c ? 'Cancelled' : String((err as Error)?.message ?? err), cancelled: c });
    } finally {
      cancelled.delete(m.id);
    }
  }
};
