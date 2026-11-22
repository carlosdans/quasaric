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
 *
 * NOTA CRÍTICA sobre orden:
 * MonoBand usa: BASS, DRUMS, GUITAR, OTHER, PIANO, VOCALS
 * Pero el OUTPUT del modelo es en orden: [drums, bass, other, vocals, guitar, piano]
 * Necesitamos mapear correctamente los outputs
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

    // STEMS EN ORDEN DEL MODELO ONNX (según MonoBand DemucsConstants)
    // Este es el orden que DEVUELVE el modelo: [drums, bass, other, vocals, guitar, piano]
    this.modelOutputOrder = ['drums', 'bass', 'other', 'vocals', 'guitar', 'piano'];
    this.stemNames = ['drums', 'bass', 'other', 'vocals', 'guitar', 'piano'];

    // Orden de UI para MonoBand-style display (BASS, DRUMS, GUITAR, OTHER, PIANO, VOCALS)
    this.uiStemOrder = ['bass', 'drums', 'guitar', 'other', 'piano', 'vocals'];

    // Modelo ONNX MIT - htdemucs 6 stems
    // Usar CDN HuggingFace para producción web
    this.MODEL_INFO = {
      url: 'https://huggingface.co/stemsplitio/htdemucs-6s-onnx/resolve/main/htdemucs_6s_int8.onnx',
      size: '69.62 MB (INT8)',
      license: 'MIT',
      source: 'StemSplit MIT licensed',
      stems: 6,
      stemNames: this.stemNames,
      sampleRate: 44100,
      segmentDuration: 7.8, // segundos
      inputShape: [1, 2, 343980], // batch, channels, time_samples
      outputShape: [1, 6, 2, 343980], // batch, stems, channels, time_samples
      inputName: 'mix',  // El modelo real usa 'mix' como input name
      outputName: 'stems'
    };
  }

  // ============================================================================
  // CARGA DEL MODELO
  // ============================================================================

  // ONNX Runtime Web is imported directly via ES module
  get _onnxRuntime() {
    return ort;
  }

  async loadModel(onProgress = null) {
    if (this.session) {
      return { success: true, model: this.modelUrl };
    }

    // Check available memory
    if (navigator.deviceMemory && navigator.deviceMemory < 2) {
      return {
        success: false,
        error: 'Memoria insuficiente. Necesitas al menos 2GB de RAM.',
        needsMemory: true
      };
    }

    // Validate ONNX Runtime is available
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
            memoryLimit: 1024 * 1024 * 1024, // 1GB limit
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

  // ============================================================================
  // PRE-PROCESAMIENTO
  // ============================================================================

  /**
   * Resampling de audio a 44.1 kHz usando Web Audio API
   */
  async _resampleAudio(audioBuffer, targetSampleRate) {
    if (audioBuffer.sampleRate === targetSampleRate) {
      return audioBuffer;
    }

    // Create offline audio context for resampling
    const resampler = new (window.AudioContext || window.webkitAudioContext)({
      sampleRate: targetSampleRate
    });

    // Create source and destination buffers
    const source = resampler.createBufferSource();
    const dest = resampler.createBufferSource ? null : null;

    // Copy audio data to new buffer with target sample rate
    const length = Math.round(audioBuffer.length * targetSampleRate / audioBuffer.sampleRate);
    const resampled = resampler.createBuffer(
      audioBuffer.numberOfChannels,
      length,
      targetSampleRate
    );

    // Simple linear interpolation resampling
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

    resampler.close();
    return resampled;
  }

  /**
   * Preparar audio para el modelo ONNX
   * El modelo espera: [1, 2, 343980] (batch, channels(stereo), time_samples)
   */
  async _preprocessAudio(audioBuffer) {
    const SR = this.MODEL_INFO.sampleRate;
    const SEGMENT_SAMPLES = this.MODEL_INFO.inputShape[2]; // 343980 samples = 7.8s

    // Resampling real a 44.1 kHz
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

    // Extraer canales (usar los primeros 2 para stereo)
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

  // ============================================================================
  // POST-PROCESAMIENTO - Convertir tensor OUTPUT a AudioBuffers
  // ============================================================================

  /**
   * Convertir tensor de output a AudioBuffer
   * El modelo devuelve: [1, 6, 2, 343980] -> batch, stems, channels, samples
   *
   * Orden de salida del modelo: [drums, bass, other, vocals, guitar, piano]
   */
  async _postProcessOutput(outputTensor, audioContext, sampleRate, outputIndexMap = null) {
    const stems = {};

    const data = outputTensor.data;
    const dims = outputTensor.dims;

    // Verificar forma correcta
    if (dims.length !== 4 || dims[0] !== 1 || dims[1] !== 6 || dims[2] !== 2) {
      throw new Error(`Output tensor shape mismatch: ${dims}`);
    }

    const numSamples = dims[3];
    const numStems = dims[1];
    const numChannels = dims[2];

    // Extraer cada stem como AudioBuffer
    for (let stemIdx = 0; stemIdx < this.stemNames.length; stemIdx++) {
      const stemName = this.stemNames[stemIdx];

      // Extraer canales - formato del tensor: [batch=0, stem, channel, sample]
      const leftSamples = new Float32Array(numSamples);
      const rightSamples = new Float32Array(numSamples);

      for (let i = 0; i < numSamples; i++) {
        // Índice correcto para tensor [1, 6, 2, samples]
        // [batch=0, stemIdx, channel(0=left), sample=i] -> stemIdx * 2 + 0 * samples + i
        const idxLeft = stemIdx * 2 * numSamples + i;
        const idxRight = stemIdx * 2 * numSamples + numSamples + i;
        leftSamples[i] = data[idxLeft];
        rightSamples[i] = data[idxRight];
      }

      // Normalizar
      let maxVal = 0;
      for (let i = 0; i < numSamples; i++) {
        maxVal = Math.max(maxVal, Math.abs(leftSamples[i]), Math.abs(rightSamples[i]));
      }
      const norm = maxVal > 1 ? 1 / maxVal : 1;

      // Crear AudioBuffer
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

  // ============================================================================
  // INFERENCIA ONNX REAL
  // ============================================================================

  /**
   * Segmentos de 7.8s con 1s de overlap para procesar audio largo
   */
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

    // Pre-procesar audio (incluye resampling)
    const preprocessed = await this._preprocessAudio(audioBuffer);

    // Crear AudioContext si no existe
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }

    // Parámetros del modelo
    const SEGMENT_SAMPLES = this.MODEL_INFO.inputShape[2]; // 343980
    const SAMPLE_RATE = this.MODEL_INFO.sampleRate; // 44100
    const totalSamples = preprocessed.length;

    // OVERLAP: 1 segundo = 44100 samples
    const OVERLAP_SAMPLES = 44100;
    const STEP_SIZE = SEGMENT_SAMPLES - OVERLAP_SAMPLES; // 343980 - 44100 = 299880

    // Preparar buffers de salida acumulados
    const stemOutputs = {};
    this.stemNames.forEach(name => {
      stemOutputs[name] = new Float32Array(totalSamples * 2);  // stereo
    });

    let segmentsProcessed = 0;
    const totalSegments = Math.ceil(totalSamples / STEP_SIZE);

    // Notificar progreso inicial
    notifyProgress({ stage: 'preprocessing', progress: 10 });

    // Función helper para yield cooperativo
    const yieldIfTooLong = async (iterations) => {
      if (iterations % 100 === 0) {
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    };

    // Procesar cada segmento
    let sampleIdx = 0;
    while (sampleIdx < totalSamples) {
      // Extraer segmento
      const leftSegment = new Float32Array(SEGMENT_SAMPLES);
      const rightSegment = new Float32Array(SEGMENT_SAMPLES);

      for (let i = 0; i < SEGMENT_SAMPLES; i++) {
        const srcIdx = sampleIdx + i;
        leftSegment[i] = srcIdx < preprocessed.left.length ? preprocessed.left[srcIdx] : 0;
        rightSegment[i] = srcIdx < preprocessed.right.length ? preprocessed.right[srcIdx] : 0;
      }

      // Preparar audio para el modelo
      // Formato correcto: [1, 2, N] - batch=1, channels=2(stereo), samples=N
      // Los datos se almacenan como [ch0_sample0, ch0_sample1, ..., ch1_sample0, ch1_sample1, ...]
      const inputData = new Float32Array(SEGMENT_SAMPLES * 2);
      for (let i = 0; i < SEGMENT_SAMPLES; i++) {
        inputData[i] = leftSegment[i];           // Canal 0 (izquierdo)
        inputData[SEGMENT_SAMPLES + i] = rightSegment[i];  // Canal 1 (derecho)
      }

      // Crear tensor de entrada
      const inputTensor = new this._onnxRuntime.Tensor(
        'float32',
        inputData,
        [1, 2, SEGMENT_SAMPLES]
      );

      // Ejecutar inferencia
      const results = await this.session.run({
        [this.MODEL_INFO.inputName]: inputTensor
      });

      const outputTensor = results[this.MODEL_INFO.outputName];
      if (!outputTensor || !outputTensor.data) {
        throw new Error('Output tensor not found');
      }

      // Acumular salidas con overlap-add
      const outputData = outputTensor.data;
      const numSamples = outputTensor.dims[3];

      // Extraer cada stem directamente del tensor de salida [batch=0, stem, channel, samples]
      for (let stemIdx = 0; stemIdx < this.stemNames.length; stemIdx++) {
        const stemName = this.stemNames[stemIdx];

        // Extraer audio de este segmento con overlap-add
        for (let i = 0; i < numSamples; i++) {
          const srcPos = sampleIdx + i;
          if (srcPos < totalSamples) {
            // Aplicar ventana de Hanning para overlap-add
            const windowPos = i - OVERLAP_SAMPLES;
            const windowFactor = sampleIdx === 0 || sampleIdx + i >= totalSamples
              ? 1.0
              : (windowPos < 0)
                ? 0.5 * (1 - Math.cos(Math.PI * (OVERLAP_SAMPLES + windowPos) / OVERLAP_SAMPLES))
                : (windowPos < OVERLAP_SAMPLES)
                  ? 0.5 * (1 - Math.cos(Math.PI * windowPos / OVERLAP_SAMPLES))
                  : 1.0;

            const targetPos = srcPos * 2;

            // Extraer ambos canales del tensor de salida
            // Forma: [stem][channel][sample] = [1][stemIdx][channel][sample]
            // Flattened: (stemIdx * 2 + channel) * numSamples + sample
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

      // Notificar progreso
      if (options.onProgress) {
        options.onProgress({
          stage: 'processing',
          segment: segmentsProcessed,
          total: totalSegments,
          progress: 20 + (segmentsProcessed / totalSegments) * 60
        });
      }
    }

    // Normalizar outputs finales y crear AudioBuffers
    const stemBuffers = {};
    for (const name of this.stemNames) {
      const data = stemOutputs[name];
      if (data) {
        // Encontrar máximo absoluto para normalizar
        let maxVal = 0;
        for (let i = 0; i < data.length; i++) {
          maxVal = Math.max(maxVal, Math.abs(data[i]));
        }

        // Crear AudioBuffer
        const numSamples = totalSamples;
        const buffer = this.audioContext.createBuffer(2, numSamples, SAMPLE_RATE);

        const left = buffer.getChannelData(0);
        const right = buffer.getChannelData(1);

        for (let i = 0; i < numSamples; i++) {
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
      stemBuffers: stemBuffers,  // CAMBIADO: result.stemBuffers (no result.stems)
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

  // ============================================================================
  // MÉTODO PRINCIPAL
  // ============================================================================

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
      // NO usar DSP fallback engañoso - devolver error explícito
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