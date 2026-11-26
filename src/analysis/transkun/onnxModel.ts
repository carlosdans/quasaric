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
    const session = this.session;
    if (!session) throw new Error('Transkun model is not loaded');
    const input = new ort.Tensor('float32', features, [1, nFrame, nMels, nWindows]);
    let results: Awaited<ReturnType<typeof session.run>> | undefined;
    try {
      results = await session.run({ featuresBatch: input });
      const score = results['S'];
      const context = results['ctx'];
      // ORT output data is backed by WASM-managed memory. Copy it before disposing
      // the tensors; otherwise retaining the views would read freed/reused WASM memory.
      return {
        s: new Float32Array(score.data as Float32Array),
        ctx: new Float32Array(context.data as Float32Array),
        t: score.dims[0],
      };
    } finally {
      input.dispose();
      results?.['S']?.dispose();
      results?.['ctx']?.dispose();
    }
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
    const session = this.session;
    if (!session) throw new Error('Transkun heads model is not loaded');
    if (n === 0) return { velLogits: new Float32Array(0), ofRaw: new Float32Array(0) };
    const input = new ort.Tensor('float32', attr, [n, 768]);
    let results: Awaited<ReturnType<typeof session.run>> | undefined;
    try {
      results = await session.run({ attr: input });
      const velocity = results['velLogits'];
      const offsets = results['ofRaw'];
      return {
        velLogits: new Float32Array(velocity.data as Float32Array),
        ofRaw: new Float32Array(offsets.data as Float32Array),
      };
    } finally {
      input.dispose();
      results?.['velLogits']?.dispose();
      results?.['ofRaw']?.dispose();
    }
  }
  async release() { await this.session?.release(); this.session = null; }
}
