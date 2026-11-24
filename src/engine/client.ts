import CpuWorker from './workerCpu.ts?worker';
import GpuWorker from './workerGpu.ts?worker';
import { ALL_FILES } from '../models.ts';
import { getModelBytes } from '../modelstore.ts';
import type { Device } from '../settings.ts';
import type { SeparateJob, WorkerOut } from './worker.ts';
import type { Stereo } from './separate.ts';

export type Progress = { done: number; total: number; stage: string };
type Pending = {
  resolve: (s: { name: string; data: Stereo }[]) => void;
  reject: (e: Error) => void;
  onProgress: (p: Progress) => void;
};

export class Engine {
  private worker?: Worker;
  private workerKind?: 'gpu' | 'cpu';
  private jobs = new Map<string, Pending>();
  onBackend: (b: { backend: string; threads: number; note?: string }) => void = () => {};

  /** Load only the runtime build required by this job. In particular, a CPU selection must
   * never import the WebGPU build: its instrumented WASM can exhaust memory on some webviews. */
  private ensureWorker(device: Device) {
    // The entry must be chosen synchronously: ONNX Runtime re-loads this same script for its threads.
    const kind = device !== 'cpu' && !!(navigator as any).gpu ? 'gpu' : 'cpu';
    if (this.worker && this.workerKind === kind) return;

    this.worker?.terminate();
    // Importing workers with Vite's ?worker query makes each entry a real bundled
    // JavaScript worker asset. new URL() inside a conditional is not statically
    // analyzable and can leave a .ts URL with an incorrect MIME type in production.
    const worker = kind === 'gpu' ? new GpuWorker() : new CpuWorker();
    this.worker = worker;
    this.workerKind = kind;

    worker.onmessage = async (e: MessageEvent<WorkerOut>) => {
      if (this.worker !== worker) return;
      const m = e.data;
      if (m.type === 'need-model') {
        const f = ALL_FILES.find((x) => x.key === m.key);
        // If the stored model can't be read, say so (the worker then reports it as missing) rather than leave it waiting for ever.
        const bytes = f ? await getModelBytes(f).catch(() => null) : null;
        if (this.worker === worker) worker.postMessage({ type: 'model-bytes', key: m.key, bytes }, bytes ? [bytes] : []);
      } else if (m.type === 'backend') {
        this.onBackend(m);
      } else if (m.type === 'progress') {
        this.jobs.get(m.id)?.onProgress(m);
      } else if (m.type === 'done') {
        this.jobs.get(m.id)?.resolve(m.stems);
        this.jobs.delete(m.id);
      } else if (m.type === 'error') {
        const err = new Error(m.message);
        if (m.cancelled) err.name = 'Cancelled';
        this.jobs.get(m.id)?.reject(err);
        this.jobs.delete(m.id);
      }
    };
    worker.onerror = (e) => {
      if (this.worker !== worker) return;
      for (const j of this.jobs.values()) j.reject(new Error(e.message || 'Worker crashed (out of memory?)'));
      this.jobs.clear();
      this.worker = undefined;
      this.workerKind = undefined;
    };
  }

  separate(job: Omit<SeparateJob, 'type'>, onProgress: (p: Progress) => void) {
    this.ensureWorker(job.device);
    const worker = this.worker!;
    return new Promise<{ name: string; data: Stereo }[]>((resolve, reject) => {
      this.jobs.set(job.id, { resolve, reject, onProgress });
      worker.postMessage({ type: 'separate', ...job }, [job.mix[0].buffer as ArrayBuffer, job.mix[1].buffer as ArrayBuffer]);
    });
  }

  /**
   * Stop a job immediately. A model run can't be interrupted part-way, so
   * rather than waiting for it, throw the worker away. The next job creates
   * the correct runtime build for its selected device.
   */
  cancel(id: string) {
    const job = this.jobs.get(id);
    if (!job) return;
    this.worker?.terminate();
    this.worker = undefined;
    this.workerKind = undefined;
    this.jobs.delete(id);
    const err = new Error('Cancelled');
    err.name = 'Cancelled';
    job.reject(err);
    for (const j of this.jobs.values()) j.reject(new Error('Interrupted'));
    this.jobs.clear();
  }
}
