import * as ort from 'onnxruntime-web/wasm';

ort.env.wasm.numThreads = 1;
ort.env.logLevel = 'error';

/** CPU/WASM-only Transkun model runner. Model bytes are fetched lazily by the worker. */
export class TranskunModel {
  private session: ort.InferenceSession | null = null;
  constructor(private readonly modelBytes: Uint8Array) {}
  async load(): Promise<void> {
    this.session = await ort.InferenceSession.create(this.modelBytes, {
      executionProviders: ['wasm'],
      graphOptimizationLevel: 'disabled',
    });
  }
  async run(features: Float32Array, nFrame: number, nMels: number, nWindows: number): Promise<{ s: Float32Array; ctx: Float32Array; t: number }> {
    if (!this.session) throw new Error('Transkun model is not loaded');
    const input = new ort.Tensor('float32', features, [1, nFrame, nMels, nWindows]);
    const results = await this.session.run({ featuresBatch: input });
    const s = results['S'], ctx = results['ctx'];
    return { s: s.data as Float32Array, ctx: ctx.data as Float32Array, t: s.dims[0] };
  }
  async release() { await this.session?.release(); this.session = null; }
}

export class TranskunHeadsModel {
  private session: ort.InferenceSession | null = null;
  constructor(private readonly modelBytes: Uint8Array) {}
  async load(): Promise<void> {
    this.session = await ort.InferenceSession.create(this.modelBytes, {
      executionProviders: ['wasm'],
      graphOptimizationLevel: 'disabled',
    });
  }
  async run(attr: Float32Array, n: number): Promise<{ velLogits: Float32Array; ofRaw: Float32Array }> {
    if (!this.session) throw new Error('Transkun heads model is not loaded');
    if (n === 0) return { velLogits: new Float32Array(0), ofRaw: new Float32Array(0) };
    const input = new ort.Tensor('float32', attr, [n, 768]);
    const results = await this.session.run({ attr: input });
    return { velLogits: results['velLogits'].data as Float32Array, ofRaw: results['ofRaw'].data as Float32Array };
  }
  async release() { await this.session?.release(); this.session = null; }
}
