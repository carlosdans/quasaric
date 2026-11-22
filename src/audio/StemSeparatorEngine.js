import * as ort from 'onnxruntime-web';
/**
 * StemSeparatorEngine - Motor de separación REAL usando htdemucs ONNX
 * ================================================
 *
 * Modelo: htdemucs_6s-onnx (MIT License)
 * Fuente: StemSplit - https://github.com/StemSplit/demucs-onnx
 * HuggingFace: https://huggingface.co/stemsplitio/htdemucs-6s-onnx
 *
 * TENSORS REALES DEL MODELO (verificado desde MonoBand APK):
 * - Input:  'mix'    -> Shape: (1, 2, 343980), float32, stereo, 44.1kHz
 * - Output: 'stems'  -> Shape: [1, 6, 2, 343980] - 6 stems, estéreo
 * - Stem order (MONOBAND VERIFIED): [drums, bass, other, vocals, guitar, piano]
 */

// Progress callbacks registry
const progressCallbacks = [];

/**
 * Register a progress callback
 */
export function onProgress(callback) {
  progressCallbacks.push(callback);
  return () => {
    const idx = progressCallbacks.indexOf(callback);
    if (idx >= 0) progressCallbacks.splice(idx, 1);
  };
}

/**
 * Notify all progress callbacks
 */
function notifyProgress(data) {
  progressCallbacks.forEach(cb => {
    try { cb(data); } catch (e) {}
  });
}

export class StemSeparatorEngine {
  constructor() {
    this.audioContext = null;
    this.modelLoaded = false;
    this.modelType = 'onnx';
    this.session = null;
    this.modelUrl = null;

    // STEMS EN ORDEN DEL MODELO ONNX
    this.modelOutputOrder = ['drums', 'bass', 'other', 'vocals', 'guitar', 'piano'];
    this.stemNames = ['drums', 'bass', 'other', 'vocals', 'guitar', 'piano'];

    // Modelo ONNX MIT - htdemucs 6 stems
    // Usar fp16 desde HuggingFace CDN (INT8 no disponible en CDN)
    // Para INT8 local, colocar en models/HTDemucs6Stems_int8.onnx
    this.MODEL_INFO = {
      url: 'https://huggingface.co/stemsplitio/htdemucs-6s-onnx/resolve/main/htdemucs_6s_fp16weights.onnx',
      size: '130.11 MB (fp16)',
      license: 'MIT',
      source: 'StemSplit MIT licensed',
      stems: 6,
      stemNames: this.stemNames,
      sampleRate: 44100,
      segmentDuration: 7.8,
      inputShape: [1, 2, 343980],
      outputShape: [1, 6, 2, 343980],
      inputName: 'mix',
      outputName: 'stems'
    };
  }

  get _onnxRuntime() {
    return ort;
  }

  async loadModel(onProgress = null) {
    if (this.session) {
      return { success: true, model: this.modelUrl };
    }

    if (navigator.deviceMemory && navigator.deviceMemory < 2) {
      return {
        success: false,
        error: 'Memoria insuficiente. Necesitas al menos 2GB de RAM.',
        needsMemory: true
      };
    }

    if (!this._onnxRuntime || !this._onnxRuntime.InferenceSession) {
      return {
        success: false,
        error: 'No se pudo cargar ONNX Runtime. Conéctate a internet.',
        needsInternet: true
      };
    }

    try {
      if (onProgress) onProgress({ stage: 'loading', progress: 10 });

      this.session = await this._onnxRuntime.InferenceSession.create(
        this.MODEL_INFO.url,
        {
          executionProviders: ['wasm'],
          graphOptimizations: 0,
          ORT_LOGGING_LEVEL: 0,
          sessionOpts: {
            executionProviders: ['wasm'],
            graphOptimizations: 0,
            memoryLimit: 2048 * 1024 * 1024, // 2GB limit for fp16 model
            executionMode: 'sequential'
          }
        }
      );

      this.modelLoaded = true;
      this.modelUrl = this.MODEL_INFO.url;

      if (onProgress) onProgress({ stage: 'ready', progress: 100 });

      return {
        success: true,
        model: this.MODEL_INFO.url,
        size: this.MODEL_INFO.size,
        stems: this.stemNames
      };
    } catch (e) {
      return {
        success: false,
        error: `Error cargando modelo: ${e.message}`,
        modelUrl: this.MODEL_INFO.url
      };
    }
  }

  async _resampleAudio(audioBuffer, targetSampleRate) {
    if (audioBuffer.sampleRate === targetSampleRate) {
      return audioBuffer;
    }

    const length = Math.round(audioBuffer.length * targetSampleRate / audioBuffer.sampleRate);
    const resampled = new (window.AudioContext || window.webkitAudioContext)().createBuffer(
      audioBuffer.numberOfChannels,
      length,
      targetSampleRate
    );

    for (let ch = 0; ch < audioBuffer.numberOfChannels; ch++) {
      const channelData = audioBuffer.getChannelData(ch);
      const resampledChannel = resampled.getChannelData(ch);

      for (let i = 0; i < length; i++) {
        const srcIdx = (i * audioBuffer.sampleRate / targetSampleRate);
        const srcPos = Math.floor(srcIdx);
        const frac = srcIdx - srcPos;

        if (srcPos + 1 < channelData.length) {
          resampledChannel[i] = channelData[srcPos] * (1 - frac) + channelData[srcPos + 1] * frac;
        } else {
          resampledChannel[i] = channelData[srcPos];
        }
      }
    }

    return resampled;
  }

  async _preprocessAudio(audioBuffer) {
    const SR = this.MODEL_INFO.sampleRate;
    const SEGMENT_SAMPLES = this.MODEL_INFO.inputShape[2];

    let resampledBuffer = audioBuffer;
    if (audioBuffer.sampleRate !== SR) {
      try {
        resampledBuffer = await this._resampleAudio(audioBuffer, SR);
      } catch (e) {
        console.warn(`Resampling fallido: ${e.message}. Usando el sample rate original.`);
      }
    }

    const length = resampledBuffer.length;
    const numChannels = resampledBuffer.numberOfChannels;

    const left = resampledBuffer.getChannelData(0) || new Float32Array(length);
    const right = numChannels > 1 ? resampledBuffer.getChannelData(1) || new Float32Array(length) : left.slice();

    return {
      left,
      right,
      length,
      numChannels,
      sampleRate: SR,
      segmentSamples: SEGMENT_SAMPLES
    };
  }

  async _postProcessOutput(outputTensor, audioContext, sampleRate) {
    const stems = {};
    const data = outputTensor.data;
    const dims = outputTensor.dims;

    if (dims.length !== 4 || dims[0] !== 1 || dims[1] !== 6 || dims[2] !== 2) {
      throw new Error(`Output tensor shape mismatch: ${dims}`);
    }

    const numSamples = dims[3];

    for (let stemIdx = 0; stemIdx < this.stemNames.length; stemIdx++) {
      const stemName = this.stemNames[stemIdx];
      const leftSamples = new Float32Array(numSamples);
      const rightSamples = new Float32Array(numSamples);

      for (let i = 0; i < numSamples; i++) {
        const idxLeft = (stemIdx * 2) * numSamples + i;
        const idxRight = (stemIdx * 2 + 1) * numSamples + i;
        leftSamples[i] = data[idxLeft];
        rightSamples[i] = data[idxRight];
      }

      let maxVal = 0;
      for (let i = 0; i < numSamples; i++) {
        maxVal = Math.max(maxVal, Math.abs(leftSamples[i]), Math.abs(rightSamples[i]));
      }
      const norm = maxVal > 1 ? 1 / maxVal : 1;

      const stemBuffer = audioContext.createBuffer(2, numSamples, sampleRate);
      const left = stemBuffer.getChannelData(0);
      const right = stemBuffer.getChannelData(1);

      for (let i = 0; i < numSamples; i++) {
        left[i] = leftSamples[i] * norm;
        right[i] = rightSamples[i] * norm;
      }

      stems[stemName] = stemBuffer;
    }

    return stems;
  }

  async separateOnnx(audioBuffer, options = {}) {
    if (!this.session) {
      const loadResult = await this.loadModel(options.onProgress);
      if (!loadResult.success) {
        return {
          success: false,
          error: loadResult.error,
          method: 'onnx',
          fallback: 'dsp'
        };
      }
    }

    const preprocessed = await this._preprocessAudio(audioBuffer);

    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }

    const SEGMENT_SAMPLES = this.MODEL_INFO.inputShape[2];
    const SAMPLE_RATE = this.MODEL_INFO.sampleRate;
    const totalSamples = preprocessed.length;

    const OVERLAP_SAMPLES = 44100;
    const STEP_SIZE = SEGMENT_SAMPLES - OVERLAP_SAMPLES;

    const stemOutputs = {};
    this.stemNames.forEach(name => {
      stemOutputs[name] = new Float32Array(totalSamples * 2);
    });

    let segmentsProcessed = 0;
    const totalSegments = Math.ceil(totalSamples / STEP_SIZE);

    notifyProgress({ stage: 'preprocessing', progress: 10 });

    const yieldIfTooLong = async (iterations) => {
      if (iterations % 100 === 0) {
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    };

    let sampleIdx = 0;
    while (sampleIdx < totalSamples) {
      const leftSegment = new Float32Array(SEGMENT_SAMPLES);
      const rightSegment = new Float32Array(SEGMENT_SAMPLES);

      for (let i = 0; i < SEGMENT_SAMPLES; i++) {
        const srcIdx = sampleIdx + i;
        leftSegment[i] = srcIdx < preprocessed.left.length ? preprocessed.left[srcIdx] : 0;
        rightSegment[i] = srcIdx < preprocessed.right.length ? preprocessed.right[srcIdx] : 0;
      }

      const inputData = new Float32Array(SEGMENT_SAMPLES * 2);
      for (let i = 0; i < SEGMENT_SAMPLES; i++) {
        inputData[i] = leftSegment[i];
        inputData[SEGMENT_SAMPLES + i] = rightSegment[i];
      }

      const inputTensor = new this._onnxRuntime.Tensor(
        'float32',
        inputData,
        [1, 2, SEGMENT_SAMPLES]
      );

      const results = await this.session.run({
        [this.MODEL_INFO.inputName]: inputTensor
      });

      const outputTensor = results[this.MODEL_INFO.outputName];
      if (!outputTensor || !outputTensor.data) {
        throw new Error('Output tensor not found');
      }

      const outputData = outputTensor.data;
      const numSamples = outputTensor.dims[3];

      for (let stemIdx = 0; stemIdx < this.stemNames.length; stemIdx++) {
        const stemName = this.stemNames[stemIdx];

        for (let i = 0; i < numSamples; i++) {
          const srcPos = sampleIdx + i;
          if (srcPos < totalSamples) {
            const windowPos = i - OVERLAP_SAMPLES;
            const windowFactor = sampleIdx === 0 || sampleIdx + i >= totalSamples
              ? 1.0
              : (windowPos < 0)
                ? 0.5 * (1 - Math.cos(Math.PI * (OVERLAP_SAMPLES + windowPos) / OVERLAP_SAMPLES))
                : (windowPos < OVERLAP_SAMPLES)
                  ? 0.5 * (1 - Math.cos(Math.PI * windowPos / OVERLAP_SAMPLES))
                  : 1.0;

            const targetPos = srcPos * 2;
            const leftIdx = (stemIdx * 2) * numSamples + i;
            const rightIdx = (stemIdx * 2 + 1) * numSamples + i;

            const valueLeft = outputData[leftIdx];
            const valueRight = outputData[rightIdx];

            stemOutputs[stemName][targetPos] = (stemOutputs[stemName][targetPos] || 0) + valueLeft * windowFactor;
            stemOutputs[stemName][targetPos + 1] = (stemOutputs[stemName][targetPos + 1] || 0) + valueRight * windowFactor;
          }

          await yieldIfTooLong(i);
        }
      }

      segmentsProcessed++;
      sampleIdx += STEP_SIZE;

      if (options.onProgress) {
        options.onProgress({
          stage: 'processing',
          segment: segmentsProcessed,
          total: totalSegments,
          progress: 20 + (segmentsProcessed / totalSegments) * 60
        });
      }
    }

    const stemBuffers = {};
    for (const name of this.stemNames) {
      const data = stemOutputs[name];
      if (data) {
        let maxVal = 0;
        for (let i = 0; i < data.length; i++) {
          maxVal = Math.max(maxVal, Math.abs(data[i]));
        }

        const buffer = this.audioContext.createBuffer(2, totalSamples, SAMPLE_RATE);
        const left = buffer.getChannelData(0);
        const right = buffer.getChannelData(1);

        for (let i = 0; i < totalSamples; i++) {
          const norm = maxVal > 1 ? 1 / maxVal : 1;
          left[i] = data[i * 2] * norm;
          right[i] = data[i * 2 + 1] * norm;
        }

        stemBuffers[name] = buffer;
      }
    }

    return {
      success: true,
      method: 'onnx',
      model: this.MODEL_INFO,
      stemBuffers: stemBuffers,
      stemNames: this.stemNames,
      processedDuration: totalSamples / SAMPLE_RATE,
      sampleRate: SAMPLE_RATE,
      segmentsProcessed,
      totalSegments,
      message: `Separación REAL con htdemucs ONNX. Segmentos: ${segmentsProcessed}/${totalSegments}. Modelo: ${this.MODEL_INFO.license} licensed.`,
      rawTensors: null
    };
  }

  async separateDSP(audioBuffer) {
    console.warn('⚠️ Usando DSP Fallback - NO es separación REAL de instrumentos');

    return {
      success: true,
      method: 'dsp_fallback',
      message: 'FILTROS DSP - NO es separación real',
      warning: 'Esta es solo una aproximación espectral.',
      stemBuffers: null,
      stemNames: this.stemNames
    };
  }

  async separate(audioFileOrBuffer, options = {}) {
    const { useOnnx = true, preferOnnx = true } = options;

    let audioBuffer = audioFileOrBuffer;
    if (audioFileOrBuffer instanceof File) {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const arrayBuffer = await audioFileOrBuffer.arrayBuffer();
      audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    }

    if (preferOnnx || useOnnx) {
      const result = await this.separateOnnx(audioBuffer, options);
      if (result.success) {
        return result;
      }
      return {
        success: false,
        error: 'Separación REAL no disponible: ' + result.error + '. El DSP fallback NO separa instrumentos musicales.',
        method: 'onnx_failed',
        fallback_used: false
      };
    }

    return await this.separateDSP(audioBuffer);
  }

  getModelInfo() {
    return {
      ...this.MODEL_INFO,
      loaded: this.modelLoaded,
      status: this.modelLoaded ? 'ready' : 'not loaded'
    };
  }

  destroy() {
    if (this.audioContext) {
      try {
        this.audioContext.close();
      } catch (e) {}
      this.audioContext = null;
    }
    if (this.session) {
      this.session.release();
      this.session = null;
    }
    this.modelLoaded = false;
    this.modelUrl = null;
  }
}

export default new StemSeparatorEngine();