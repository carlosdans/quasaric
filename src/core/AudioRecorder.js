/**
 * AudioRecorder - Grabación de audio usando Web MediaRecorder API
 * ================================================
 *
 * Soporta:
 * - Grabación del micrófono
 * - Grabación del piano virtual
 * - Grabación multipista (hasta 4 pistas)
 * - Formato WAV
 */

export class AudioRecorder {
  constructor(options = {}) {
    this.audioContext = null;
    this.stream = null;
    this.mediaRecorder = null;
    this.isRecording = false;
    this.recordedChunks = [];
    this.muted = false;
    this.maxTracks = 4;
    this.tracks = [];
    this.onDataAvailable = null;
    this.onStop = null;
    this.onError = null;
  }

  /**
   * Inicializar AudioContext
   */
  async init() {
    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  /**
   * Verificar soporte para grabación
   */
  isSupported() {
    return typeof MediaRecorder !== 'undefined' && typeof window.navigator.mediaDevices !== 'undefined';
  }

  /**
   * Solicitar permiso de micrófono
   */
  async requestPermission() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      return { success: false, error: 'getUserMedia no soportado' };
    }

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      return { success: true, stream: this.stream };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  /**
   * Iniciar grabación
   */
  async start(trackIndex = 0, options = {}) {
    if (!this.isSupported()) {
      return { success: false, error: 'Grabación no soportada' };
    }

    if (this.isRecording) {
      return { success: false, error: 'Ya grabando' };
    }

    try {
      // Crear MediaRecorder
      const options = { mimeType: 'audio/webm;codecs=opus' };
      this.mediaRecorder = new MediaRecorder(this.stream, options);
      this.recordedChunks = [];

      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          this.recordedChunks.push(e.data);
        }
        if (this.onDataAvailable) {
          this.onDataAvailable(e.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        this.isRecording = false;
        if (this.onStop) {
          this.onStop(this.getBlob());
        }
      };

      this.mediaRecorder.onerror = (e) => {
        if (this.onError) {
          this.onError(e.error);
        }
      };

      this.mediaRecorder.start(100); // Collect every 100ms
      this.isRecording = true;

      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  /**
   * Detener grabación
   */
  stop() {
    if (!this.isRecording || !this.mediaRecorder) {
      return { success: false, error: 'No grabando' };
    }

    this.mediaRecorder.stop();
    return { success: true };
  }

  /**
   * Pausar grabación
   */
  pause() {
    if (!this.isRecording) return { success: false, error: 'No grabando' };

    this.mediaRecorder.pause();
    return { success: true };
  }

  /**
   * Reanudar grabación
   */
  resume() {
    if (!this.isRecording) return { success: false, error: 'No grabando' };

    this.mediaRecorder.resume();
    return { success: true };
  }

  /**
   * Obtener blob de audio grabado
   */
  getBlob() {
    if (this.recordedChunks.length === 0) return null;

    const blob = new Blob(this.recordedChunks, { type: 'audio/webm' });
    return blob;
  }

  /**
   * Exportar como WAV
   */
  async exportWAV(blob) {
    if (!blob) return null;

    try {
      const arrayBuffer = await blob.arrayBuffer();
      const audioContext = this.audioContext || new (window.AudioContext || window.webkitAudioContext)();

      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      const wavBlob = this.encodeWAV(audioBuffer);

      return wavBlob;
    } catch (e) {
      console.error('Error exportando WAV:', e);
      return null;
    }
  }

  /**
   * Codificar buffer como WAV
   */
  encodeWAV(audioBuffer) {
    const numChannels = audioBuffer.numberOfChannels || 2;
    const sampleRate = audioBuffer.sampleRate;
    const length = audioBuffer.length || 44100;
    const byteRate = sampleRate * 2 * numChannels;

    const wavSize = 44 + length * 2 * numChannels;
    const wavArray = new Uint8Array(wavSize);
    const view = new DataView(wavArray.buffer);

    // RIFF header
    view.setUint8(0, 0x52); // 'R'
    view.setUint8(1, 0x49); // 'I'
    view.setUint8(2, 0x46); // 'F'
    view.setUint8(3, 0x46); // 'F'
    view.setUint32(4, wavSize - 8, true);
    view.setUint8(8, 0x57); // 'W'
    view.setUint8(9, 0x41); // 'A'
    view.setUint8(10, 0x56); // 'V'
    view.setUint8(11, 0x45); // 'E'

    // fmt subchunk
    view.setUint8(12, 0x66); // 'f'
    view.setUint8(13, 0x6D); // 'm'
    view.setUint8(14, 0x74); // 't'
    view.setUint8(15, 0x20); // ' '
    view.setUint16(16, 16, true); // PCM
    view.setUint16(20, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, 2 * numChannels, true); // block align
    view.setUint16(34, 16, true); // bits per sample

    // data subchunk
    view.setUint8(36, 0x64); // 'd'
    view.setUint8(37, 0x61); // 'a'
    view.setUint8(38, 0x74); // 't'
    view.setUint8(39, 0x61); // 'a'
    view.setUint32(40, length * 2 * numChannels, true);

    // Audio data
    let offset = 44;
    for (let i = 0; i < length; i++) {
      for (let ch = 0; ch < numChannels; ch++) {
        const sample = audioBuffer.getChannelData
          ? audioBuffer.getChannelData(ch)[i]
          : 0;
        view.setInt16(offset, sample * 0x7FFF, true);
        offset += 2;
      }
    }

    return new Blob([wavArray], { type: 'audio/wav' });
  }

  /**
   * Grabar output del AudioContext (piano virtual)
   */
  async recordFromAudioContext(sourceNode, duration = 10) {
    if (!this.audioContext) {
      await this.init();
    }

    // Crear nodo de destino
    const destination = this.audioContext.createMediaStreamDestination();

    // Conectar fuente al destino
    sourceNode.connect(destination);

    // Crear MediaRecorder con el stream del AudioContext
    this.mediaRecorder = new MediaRecorder(destination.stream);
    this.recordedChunks = [];

    return new Promise((resolve, reject) => {
      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          this.recordedChunks.push(e.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        this.isRecording = false;
        const blob = this.getBlob();
        resolve({ success: true, blob, url: URL.createObjectURL(blob) });
      };

      this.mediaRecorder.onerror = (e) => {
        reject({ success: false, error: e.error });
      };

      this.mediaRecorder.start(100);
      this.isRecording = true;

      // Detener después de la duración
      setTimeout(() => {
        this.mediaRecorder.stop();
        sourceNode.disconnect();
      }, duration * 1000);
    });
  }

  /**
   * Limpiar recursos
   */
  destroy() {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }

    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.stop();
    }

    this.recordedChunks = [];
    this.isRecording = false;
  }

  /**
   * Obtener duración grabada
   */
  async getDuration(blob) {
    if (!blob) return 0;

    return new Promise((resolve) => {
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.addEventListener('loadedmetadata', () => {
        resolve(audio.duration);
        URL.revokeObjectURL(url);
      });
    });
  }
}

export default new AudioRecorder();