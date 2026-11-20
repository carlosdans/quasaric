/**
 * MultiTrackPlayer - Reproductor de audio multipista sincronizado
 * Usa Web Audio API nativa - 0 dependencias externas
 */

export class MultiTrackPlayer {
  constructor() {
    this.audioContext = null;
    this.tracks = [];
    this.masterGain = null;
    this.isPlaying = false;
    this.startTime = 0;
    this.pauseTime = 0;
    this.duration = 0;
    this.onTimeUpdate = null;
    this.onEnd = null;
    this.loopSettings = null;
    this._updateTimer = null;
  }

  // Inicializar AudioContext (requiere interacción del usuario)
  async init() {
    if (!window.AudioContext && !window.webkitAudioContext) {
      throw new Error('Web Audio API no está disponible en este navegador');
    }

    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    this.masterGain = this.audioContext.createGain();
    this.masterGain.connect(this.audioContext.destination);

    // Iniciar actualización de tiempo
    this._startTimeUpdate();
  }

  // Detener monitoreo de tiempo
  _stopTimeUpdate() {
    if (this._updateTimer) {
      cancelAnimationFrame(this._updateTimer);
      this._updateTimer = null;
    }
  }

  // Añadir pista
  async addTrack(audioUrl, index, name = `Track ${index}`) {
    try {
      const response = await fetch(audioUrl);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);

      const source = this.audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.loop = false;

      const gainNode = this.audioContext.createGain();
      gainNode.gain.value = 1;
      gainNode.connect(this.masterGain);

      source.connect(gainNode);

      const track = {
        id: index,
        name: name,
        source: source,
        gainNode: gainNode,
        buffer: audioBuffer,
        volume: 1,
        muted: false,
        soloed: false,
        duration: audioBuffer.duration,
        blobUrl: typeof audioUrl === 'string' && audioUrl.startsWith('blob:') ? audioUrl : null
      };

      this.tracks.push(track);
      this.duration = Math.max(this.duration, audioBuffer.duration);

      return track;
    } catch (error) {
      console.error(`Error al cargar pista ${index}:`, error);
      throw error;
    }
  }

  // Reproducir todas las pistas sincronizadas
  async play() {
    if (!this.audioContext || this.isPlaying) return;

    // Crear nuevas fuentes para cada pista usando el reloj común
    this.tracks.forEach(track => {
      if (!track.muted) {
        const source = this.audioContext.createBufferSource();
        source.buffer = track.buffer;
        source.loop = false;
        source.connect(track.gainNode);
        // Sincronizar usando el reloj maestro
        source.start(this.audioContext.currentTime, this._calculateStartOffset());

        track.source = source;
      }
    });

    this.startTime = this.audioContext.currentTime;
    this.isPlaying = true;
  }

  // Calcular offset para sincronización precisa
  _calculateStartOffset() {
    if (!this.loopSettings || !this.loopSettings.active) return 0;

    const elapsed = this.audioContext.currentTime - this.startTime;
    const { start, end } = this.loopSettings;

    // Si ya pasamos el final, empezar desde start
    if (elapsed >= end) {
      return Math.max(0, start);
    }
    // Si estamos en el rango del loop
    if (elapsed >= start) {
      return 0;
    }
    return 0;
  }

  // Pausar todas las pistas
  pause() {
    if (!this.audioContext || !this.isPlaying) return;

    this.pauseTime = this.audioContext.currentTime - this.startTime;
    this.isPlaying = false;

    // Pausar todas las fuentes
    this.tracks.forEach(track => {
      if (track.source) {
        track.source.stop();
      }
    });
  }

  // Reanudar desde pausa
  async resume() {
    if (this.isPlaying) return;

    // Recalcular startTime para reanudar desde pauseTime
    this.startTime = this.audioContext.currentTime - this.pauseTime;
    await this.play();
  }

  // Detener y resetear
  stop() {
    if (this.audioContext) {
      this.tracks.forEach(track => {
        if (track.source) {
          track.source.stop();
        }
      });
    }
    this.startTime = this.audioContext.currentTime;
    this.pauseTime = 0;
    this.isPlaying = false;
  }

  // Seek global a posición (en segundos) - SINCRONIZADO CON RELOJ COMún
  async seek(position) {
    if (!this.audioContext) return;

    const wasPlaying = this.isPlaying;
    if (wasPlaying) {
      this.pause();
    }

    // Detener fuentes actuales
    this.tracks.forEach(track => {
      if (track.source) {
        track.source.stop();
      }
    });

    // Crear nuevas fuentes desde la posición usando reloj común
    const seekTime = this.audioContext.currentTime;

    this.tracks.forEach(track => {
      if (!track.muted) {
        const source = this.audioContext.createBufferSource();
        source.buffer = track.buffer;
        source.loop = false;
        source.connect(track.gainNode);
        // Usar timing de AudioContext para sincronización precisa
        const startOffset = Math.max(0, position - (seekTime - this.audioContext.currentTime));
        source.start(this.audioContext.currentTime, Math.max(0, position - 0.01));
        track.source = source;
      }
    });

    if (wasPlaying) {
      this.startTime = this.audioContext.currentTime - position;
      this.isPlaying = true;
    }
  }

  // Control de volumen por pista
  setVolume(trackIndex, volume) {
    const track = this.tracks[trackIndex];
    if (track && this.audioContext) {
      track.volume = Math.max(0, Math.min(1, volume));
      track.gainNode.gain.setValueAtTime(track.volume, this.audioContext.currentTime);
    }
  }

  // Mute por pista
  setMuted(trackIndex, muted) {
    const track = this.tracks[trackIndex];
    if (track) {
      track.muted = muted;
      if (muted) {
        track.gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
      } else {
        track.gainNode.gain.setValueAtTime(track.volume, this.audioContext.currentTime);
      }
    }
  }

  // Solo por pista (mutear todos los demás)
  setSolo(trackIndex, solo) {
    const track = this.tracks[trackIndex];
    if (track) {
      track.soloed = solo;

      this.tracks.forEach((otherTrack, i) => {
        if (i !== trackIndex) {
          otherTrack.muted = solo;
          otherTrack.gainNode.gain.setValueAtTime(solo ? 0 : otherTrack.volume, this.audioContext.currentTime);
        }
      });
    }
  }

  // Establecer duración
  setDuration(duration) {
    this.duration = duration;
  }

  // Loop A-B - SINCRONIZADO CON EL RELOJ DE AUDIO
  setLoop(startSec, endSec) {
    if (!this.audioContext || !this.isPlaying) return null;

    const loopState = { start: startSec, end: endSec, active: true };
    this.loopSettings = loopState;

    // Detener listeners anteriores
    this.tracks.forEach(track => {
      if (track.source) {
        track.source.loop = false;
      }
    });

    return loopState;
  }

  // Verificar loop en cada frame (método más preciso que eventos)
  _checkLoop() {
    if (!this.isPlaying || !this.loopSettings || !this.loopSettings.active) return;

    const position = this.getPosition();
    const { start, end } = this.loopSettings;

    if (position >= end) {
      // Reiniciar desde start usando el reloj común
      this.seek(start);
    }
  }

  // Obtener posición actual
  getPosition() {
    if (!this.audioContext || !this.isPlaying) return 0;
    const elapsed = this.audioContext.currentTime - this.startTime;
    return Math.min(elapsed, this.duration);
  }

  // Limpiar Blob URL de una pista
  _revokeBlobUrl(track) {
    if (track.blobUrl) {
      try {
        URL.revokeObjectURL(track.blobUrl);
      } catch (e) {
        console.warn('Error al revocar Blob URL:', e);
      }
      track.blobUrl = null;
    }
  }

  // Limpiar recursos de una pista
  _unloadTrack(trackIndex) {
    const track = this.tracks[trackIndex];
    if (!track) return;

    if (track.source) {
      try {
        track.source.stop();
      } catch (e) {}
    }

    this._revokeBlobUrl(track);
    this.tracks[trackIndex] = null;
  }

  // Unload track by index
  unloadTrack(trackIndex) {
    this._unloadTrack(trackIndex);
  }

  // Unload all tracks and resources
  unloadAll() {
    this.stop();
    // Revocar Blob URLs
    this.tracks.forEach(track => {
      this._revokeBlobUrl(track);
    });
    // Limpiar referencias
    this.tracks.forEach((track, i) => {
      this.tracks[i] = {
        id: track?.id,
        name: track?.name,
        volume: track?.volume ?? 1,
        muted: false,
        soloed: false
        // No incluimos source, gainNode, buffer, blobUrl
      };
    });
  }

  // Libertar recursos completos
  destroy() {
    this._stopTimeUpdate();
    this.stop();

    // Revocar todas las URLs
    this.tracks.forEach(track => {
      this._revokeBlobUrl(track);
    });

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.tracks = [];
    this.loopSettings = null;
    this.startTime = 0;
    this.pauseTime = 0;
    this.duration = 0;
    this.isPlaying = false;
  }

  // Evento de actualización de tiempo
  _startTimeUpdate() {
    const update = () => {
      if (this.onTimeUpdate && this.isPlaying) {
        const position = this.getPosition();
        this.onTimeUpdate(position, this.duration);

        // Verificar loop sincronizado con reloj
        this._checkLoop();

        if (position >= this.duration && this.duration > 0 && !this.loopSettings?.active) {
          this.isPlaying = false;
          if (this.onEnd) this.onEnd();
        }
      }
      this._updateTimer = requestAnimationFrame(update);
    };

    this._updateTimer = requestAnimationFrame(update);
  }
}

export default new MultiTrackPlayer();