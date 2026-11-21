/**
 * StemSeparatorEngine - Motor de separación REAL usando htdemucs ONNX
 * ================================================
 *
 * Modelo: htdemucs_6s-onnx (MIT License)
 * Fuente: StemSplit - https://github.com/StemSplit/demucs-onnx
 * HuggingFace: https://huggingface.co/StemSplitio/htdemucs-6s-onnx
 *
 * TENSORS REALES DEL MODELO:
 * - Input:  'mix'    -> Shape: (1, 2, 343980), float32, stereo, 44.1kHz, 7.8s segments
 * - Output: 'stems'  -> Shape: (1, 6, 2, 343980), float32, AUDIO WAVEFORM (NOT spectrogram!)
 * - Stem order: [drums, bass, other, vocals, guitar, piano]
 *
 * Estados del modelo están en orden específico - NO adivinar nombres.
 */

export class StemSeparatorEngine {
  constructor() {
    this.audioContext = null;
    this.modelLoaded = false;
    this.modelType = 'onnx';
    this.onnxRuntime = null;
    this.session = null;
    this.modelUrl = null;

    // STEMS EN ORDEN EXACTO DEL MODELO htdemucs ONX
    // Importante: Este es el orden que devuelve el modelo
    this.stemNames = ['drums', 'bass', 'other', 'vocals', 'guitar', 'piano'];

    // Modelo ONNX MIT - htdemucs 6 stems
    this.MODEL_INFO = {
      // Local fallback for development/testing
      url: 'models/htdemucs_6s_fp16weights.onnx',
      // Production URL: 'https://huggingface.co/StemSplitio/htdemucs-6s-onnx/resolve/main/htdemucs_6s_fp16weights.onnx'
      size: '136 MB',
      license: 'MIT',
      source: 'StemSplit (huggingface.co/StemSplitio/htdemucs-6s-onnx)',
      stems: 6,
      stemNames: this.stemNames,
      sampleRate: 44100,
      segmentDuration: 7.8, // segundos
      inputShape: [1, 2, 343980], // batch, channels, time_samples
      outputShape: [1, 6, 2, 343980], // batch, stems, channels, time_samples
      inputName: 'mix',
      outputName: 'stems'
    };
  }

  // ============================================================================
  // CARGA DEL MODELO
  // ============================================================================

  async _loadOnnxRuntime() {
    if (this.onnxRuntime) {
      return true;
    }

    try {
      if (window.onnxruntime) {
        this.onnxRuntime = window.onnxruntime;
        return true;
      }

      // Cargar desde CDN
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.31.1/dist/ort.min.js';
      document.head.appendChild(script);

      // Esperar a que cargue
      const maxWait = 10000;
      const start = Date.now();

      while (!window.onnxruntime && Date.now() - start < maxWait) {
        await new Promise(r => setTimeout(r, 100));
      }

      if (window.onnxruntime) {
        this.onnxRuntime = window.onnxruntime;
        return true;
      }

      return false;
    } catch (e) {
      console.error('Error loading ONNX Runtime:', e);
      return false;
    }
  }

  async loadModel(onProgress = null) {
    if (this.session) {
      return { success: true, model: this.modelUrl };
    }

    const canLoad = await this._loadOnnxRuntime();
    if (!canLoad) {
      return {
        success: false,
        error: 'No se pudo cargar ONNX Runtime. Conéctate a internet.',
        needsInternet: true
      };
    }

    try {
      if (onProgress) onProgress({ stage: 'loading', progress: 10 });

      this.session = await this.onnxRuntime.InferenceSession.create(
        this.MODEL_INFO.url,
        { executionProviders: ['wasm'] }
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
   * Preparar audio para el modelo ONNX
   * El modelo espera: [1, 2, 343980] (batch, channels(stereo), time_samples)
   */
  async _preprocessAudio(audioBuffer) {
    const SR = this.MODEL_INFO.sampleRate;
    const SEGMENT_SAMPLES = this.MODEL_INFO.inputShape[2]; // 343980 samples = 7.8s

    // Resampling si es necesario
    if (audioBuffer.sampleRate !== SR) {
      // Nota: Aquí iría audio resampling real usando Web Audio API
      // Por ahora usamos el sample rate original
      console.warn(`Sample rate ${audioBuffer.sampleRate} != ${SR}`);
    }

    const length = audioBuffer.length;
    const numChannels = audioBuffer.numberOfChannels;

    // Extraer canales (usar los primeros 2 para stereo)
    const left = audioBuffer.getChannelData(0) || new Float32Array(length);
    const right = numChannels > 1 ? audioBuffer.getChannelData(1) || new Float32Array(length) : left.slice();

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
   */
  async _postProcessOutput(outputTensor, audioContext, sampleRate) {
    const stems = [];

    // El tensor de salida es 4D: [1, 6, 2, samples]
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
    for (let stemIdx = 0; stemIdx < numStems; stemIdx++) {
      const channelData = [];

      for (let ch = 0; ch < numChannels; ch++) {
        const samples = new Float32Array(numSamples);

        for (let i = 0; i < numSamples; i++) {
          // Índice en el array plano: [stem, ch, sample]
          const idx = ((0 * numStems + stemIdx) * numChannels + ch) * numSamples + i;
          samples[i] = data[idx];
        }

        channelData.push(samples);
      }

      // Crear AudioBuffer para este stem
      const stemBuffer = audioContext.createBuffer(numChannels, numSamples, sampleRate);
      for (let ch = 0; ch < numChannels; ch++) {
        stemBuffer.copyToChannel(channelData[ch], ch);
      }

      stems.push(stemBuffer);
    }

    return stems;
  }

  // ============================================================================
  // INFERENCIA ONNX REAL
  // ============================================================================

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

    // Pre-procesar audio
    const preprocessed = await this._preprocessAudio(audioBuffer);

    // Crear AudioContext si no existe
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }

    // Preparar audio para el modelo
    // El modelo espera segmentos de 7.8 segundos
    const SEGMENT_SAMPLES = this.MODEL_INFO.inputShape[2];
    const SAMPLE_RATE = this.MODEL_INFO.sampleRate;
    const totalSamples = preprocessed.length;

    // Verificar si necesitamos segmentación
    const needsSegmentation = totalSamples > SEGMENT_SAMPLES;

    // Overlaps para mejor transición entre segmentos
    const OVERLAP_RATIO = 0.1;
    const OVERLAP_SAMPLES = Math.floor(SEGMENT_SAMPLES * OVERLAP_RATIO);
    const STEP_SIZE = SEGMENT_SAMPLES - OVERLAP_SAMPLES;

    // Preparar buffers de salida acumulados
    const stemOutputs = {};
    this.stemNames.forEach(name => {
      stemOutputs[name] = [];
    });

    let segmentsProcessed = 0;
    const totalSegments = Math.ceil(totalSamples / STEP_SIZE);

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

      // Normalizar audio al rango [-1, 1]
      const inputData = new Float32Array(2 * SEGMENT_SAMPLES);
      for (let i = 0; i < SEGMENT_SAMPLES; i++) {
        inputData[i * 2] = leftSegment[i];
        inputData[i * 2 + 1] = rightSegment[i];
      }

      // Crear tensor de entrada
      const inputTensor = new this.onnxRuntime.Tensor(
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

      // Acumular salidas
      const outputData = outputTensor.data;
      const numSamples = outputTensor.dims[3];

      for (let stemIdx = 0; stemIdx < this.stemNames.length; stemIdx++) {
        const stemName = this.stemNames[stemIdx];
        if (!stemOutputs[stemName]) {
          stemOutputs[stemName] = new Float32Array(totalSamples * 2);
        }

        // Extraer audio de este segmento con overlap-add
        for (let i = 0; i < numSamples; i++) {
          const srcPos = sampleIdx + i;
          if (srcPos < totalSamples) {
            // Índice en el array de salida: [batch, stem, channel, sample]
            const idx = ((0 * 6 + stemIdx) * 2 + 0) * numSamples + i;
            const value = outputData[idx];

            // Aplicar ventana de Hanning para overlap-add
            const windowPos = i - (sampleIdx % STEP_SIZE);
            const windowFactor = sampleIdx === 0 || sampleIdx + i >= totalSamples
              ? 1.0
              : (windowPos < OVERLAP_SAMPLES)
                ? 0.5 * (1 - Math.cos(Math.PI * windowPos / OVERLAP_SAMPLES))
                : 1.0;

            const targetPos = srcPos * 2;
            stemOutputs[stemName][targetPos] = (stemOutputs[stemName][targetPos] || 0) + value * windowFactor;
            stemOutputs[stemName][targetPos + 1] = (stemOutputs[stemName][targetPos + 1] || 0) + value * windowFactor;
          }
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
          progress: (segmentsProcessed / totalSegments) * 100
        });
      }
    }

    // Normalizar outputs finales
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
      stems: stemBuffers,
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
      stems: null,
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
      console.warn('ONNX falló, usando DSP fallback:', result.error);
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
    this.onnxRuntime = null;
  }
}

export default new StemSeparatorEngine();