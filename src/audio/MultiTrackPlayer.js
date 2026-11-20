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
        duration: audioBuffer.duration
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

    // Crear nuevas fuentes para cada pista
    this.tracks.forEach(track => {
      if (!track.muted) {
        const source = this.audioContext.createBufferSource();
        source.buffer = track.buffer;
        source.loop = false;
        source.connect(track.gainNode);
        source.start(this.startTime);

        track.source = source;
      }
    });

    this.startTime = this.audioContext.currentTime;
    this.isPlaying = true;
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
    if (!this.isPlaying) {
      await this.play();
    }
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

  // Seek global a posición (en segundos)
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

    // Crear nuevas fuentes desde la posición
    this.tracks.forEach(track => {
      if (!track.muted) {
        const source = this.audioContext.createBufferSource();
        source.buffer = track.buffer;
        source.connect(track.gainNode);
        source.start(0, position);
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

  // Obtener posición actual
  getPosition() {
    if (!this.audioContext || !this.isPlaying) return 0;
    const elapsed = this.audioContext.currentTime - this.startTime;
    return Math.min(elapsed, this.duration);
  }

  // Setup loop A-B (en segundos)
  setLoop(startSec, endSec) {
    if (!this.audioContext) return;

    const loopGain = this.audioContext.createGain();
    loopGain.connect(this.masterGain);

    this.tracks.forEach(track => {
      if (!track.muted && track.source) {
        track.source.loop = false;
        track.source.addEventListener('ended', () => {
          this.seek(startSec);
        });
      }
    });

    return { start: startSec, end: endSec };
  }

  // Libertar recursos
  destroy() {
    this.stop();
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.tracks = [];
  }

  // Evento de actualización de tiempo
  _startTimeUpdate() {
    const update = () => {
      if (this.onTimeUpdate && this.isPlaying) {
        const position = this.getPosition();
        this.onTimeUpdate(position, this.duration);

        if (position >= this.duration) {
          this.isPlaying = false;
          if (this.onEnd) this.onEnd();
        }
      }
      this._updateTimer = requestAnimationFrame(update);
    };

    if (this.audioContext) {
      this._updateTimer = requestAnimationFrame(update);
    }
  }

  _startTimeUpdate() {
    const update = () => {
      if (this.onTimeUpdate && this.isPlaying) {
        const position = this.getPosition();
        this.onTimeUpdate(position, this.duration);

        if (position >= this.duration && this.duration > 0) {
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