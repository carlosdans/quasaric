import { useState, useEffect, useRef, useCallback } from 'react';
import player from './MultiTrackPlayer';
import stemSeparator from './StemSeparatorEngine';

export function useAudio() {
  const [initialized, setInitialized] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [tracks, setTracks] = useState([]);
  const [audioContextReady, setAudioContextReady] = useState(false);
  const [loopSettings, setLoopSettings] = useState(null);
  const [isSeparating, setIsSeparating] = useState(false);
  const [separationResult, setSeparationResult] = useState(null);

  // Inicializar AudioContext
  const init = useCallback(async () => {
    try {
      await player.init();
      setInitialized(true);
      setAudioContextReady(true);
      player.onTimeUpdate = (pos, dur) => {
        setPosition(pos);
        setDuration(dur);
      };
      return true;
    } catch (error) {
      console.error('Error al inicializar Audio:', error);
      return false;
    }
  }, []);

  // Añadir pista
  const addTrack = useCallback(async (url, name, trackIndex = tracks.length) => {
    const track = await player.addTrack(url, trackIndex, name);
    setTracks(prev => [...prev, {
      id: track.id,
      name: track.name,
      volume: 1,
      muted: false,
      soloed: false,
      blobUrl: track.blobUrl,
      duration: track.duration
    }]);
    setDuration(track.duration);
    return track;
  }, [tracks.length]);

  // Separar audio en instrumentos
  const separateTracks = useCallback(async (file, stemsCount = 6) => {
    if (!initialized) {
      await init();
    }

    setIsSeparating(true);
    setSeparationResult(null);

    try {
      // Crear Blob URL temporal
      const tempUrl = URL.createObjectURL(file);

      // Cargar el archivo como array buffer
      const response = await fetch(tempUrl);
      const arrayBuffer = await response.arrayBuffer();

      // Crear audio buffer
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const decoded = await audioContext.decodeAudioData(arrayBuffer);

      // Intentar primero con ONNX (separación real)
      let result = await stemSeparator.separate(decoded, {
        useOnnx: true,
        preferOnnx: true
      });

      // Si ONNX falla, usar fallback DSP
      if (!result.success) {
        console.warn('ONNX falló, usando DSP fallback:', result.error);
        result = await stemSeparator.separate(decoded, {
          useOnnx: false,
          preferOnnx: false
        });
      }

      if (result.success) {
        const separatedTracks = [];
        const stems = result.stemNames || stemSeparator.stemNames;

        // Cargar el track original primero
        const mainTrack = await player.addTrack(tempUrl, 0, 'Original');

        // Guardar URL temporal para limpieza posterior
        let blobUrls = [tempUrl];

        // Para cada stem, crear una versión con el buffer procesado
        for (let i = 0; i < stems.length && i < stemsCount; i++) {
          const stemName = stems[i];
          const stemBuffer = result.stems?.[stemName];

          if (stemBuffer && result.method === 'onnx') {
            // ONNX separation - usar buffer real del stem
            try {
              // Crear WAV del stem
              const wavBuffer = await new Promise((resolve, reject) => {
                const length = stemBuffer.length;
                const sampleRate = stemBuffer.sampleRate;
                const numChannels = stemBuffer.numberOfChannels;

                // Crear buffer WAV
                const wavHeader = Buffer.alloc(44);
                wavHeader.write('RIFF', 0);
                wavHeader.writeUInt32LE(36 + length * 2 * numChannels - 8, 4);
                wavHeader.write('WAVE', 8);
                wavHeader.write('fmt ', 12);
                wavHeader.writeUInt16LE(1, 16); // PCM
                wavHeader.writeUInt16LE(numChannels, 20);
                wavHeader.writeUInt32LE(sampleRate, 24);
                wavHeader.writeUInt32LE(sampleRate * 2 * numChannels, 28);
                wavHeader.writeUInt16LE(2 * numChannels, 32);
                wavHeader.writeUInt16LE(16, 34);
                wavHeader.write('data', 36);

                // Crear audio buffer
                const audioBuffer = new ArrayBuffer(44 + length * 2 * numChannels);
                const view = new DataView(audioBuffer);
                for (let j = 0; j < 44; j++) {
                  view.setUint8(j, wavHeader[j]);
                }

                let offset = 44;
                for (let j = 0; j < length; j++) {
                  for (let ch = 0; ch < numChannels; ch++) {
                    const sample = Math.max(-1, Math.min(1, stemBuffer.getChannelData(ch)[j]));
                    view.setInt16(offset, sample * 0x7FFF, true);
                    offset += 2;
                  }
                }

                resolve(Buffer.from(audioBuffer));
              });

              const stemUrl = URL.createObjectURL(new Blob([wavBuffer], { type: 'audio/wav' }));
              blobUrls.push(stemUrl);

              const track = {
                id: i + 1,
                name: stemName.charAt(0).toUpperCase() + stemName.slice(1),
                volume: stemName === 'vocals' ? 1 : 0.4,
                muted: false,
                soloed: false,
                blobUrl: stemUrl,
                duration: stemBuffer.duration,
                isStem: true
              };

              separatedTracks.push(track);
            } catch (e) {
              console.warn('Error creating stem blob:', e);
              // Fallback: use placeholder
              const track = {
                id: i + 1,
                name: stemName.charAt(0).toUpperCase() + stemName.slice(1),
                volume: stemName === 'vocals' ? 1 : 0.4,
                muted: false,
                soloed: false,
                blobUrl: tempUrl,
                duration: decoded.duration,
                isStem: false
              };
              separatedTracks.push(track);
            }
          } else {
            // Fallback: usar placeholder
            const track = {
              id: i + 1,
              name: stemName.charAt(0).toUpperCase() + stemName.slice(1),
              volume: stemName === 'vocals' ? 1 : 0.4,
              muted: false,
              soloed: false,
              blobUrl: tempUrl,
              duration: decoded.duration,
              isStem: false
            };
            separatedTracks.push(track);
          }
        }

        // Limpiar URL temporal principal
        URL.revokeObjectURL(tempUrl);

        // Combinar track original + tracks separados
        setTracks(prev => [
          ...prev, // Track original
          ...separatedTracks
        ]);

        setDuration(decoded.duration);

        return {
          success: true,
          method: result.method,
          tracks: stems.slice(0, stemsCount),
          message: result.message,
          stemBuffers: result.stems
        };
      } else {
        throw new Error(result.error || 'Error en separación');
      }
    } catch (e) {
      console.error('Error separando tracks:', e);
      return {
        success: false,
        error: e.message
      };
    } finally {
      setIsSeparating(false);
    }
  }, [initialized, init]);

  // Play/Pause
  const togglePlay = useCallback(() => {
    if (!initialized) return;

    if (isPlaying) {
      player.pause();
      setIsPlaying(false);
    } else {
      player.play();
      setIsPlaying(true);
    }
  }, [initialized, isPlaying]);

  // Seek
  const seekTo = useCallback((seconds) => {
    player.seek(seconds);
    setPosition(seconds);
  }, []);

  // Volumen pista
  const setTrackVolume = useCallback((trackIndex, volume) => {
    player.setVolume(trackIndex, volume);
    setTracks(prev => prev.map((t, i) =>
      i === trackIndex ? { ...t, volume } : t
    ));
  }, []);

  // Mutear pista
  const setTrackMuted = useCallback((trackIndex, muted) => {
    player.setMuted(trackIndex, muted);
    setTracks(prev => prev.map((t, i) => ({
      ...t,
      muted: i === trackIndex ? muted : t.muted
    })));
  }, []);

  // Solo pista
  const setTrackSolo = useCallback((trackIndex, solo) => {
    player.setSolo(trackIndex, solo);
    setTracks(prev => prev.map((t, i) => ({
      ...t,
      soloed: i === trackIndex ? solo : t.soloed,
      muted: solo || t.muted
    })));
  }, []);

  // Loop A-B
  const setLoop = useCallback((start, end) => {
    if (!isPlaying) return null;
    const settings = player.setLoop(start, end);
    setLoopSettings(settings);
    return settings;
  }, [isPlaying]);

  // Unload track
  const unloadTrack = useCallback((trackIndex) => {
    player.unloadTrack(trackIndex);
    setTracks(prev => prev.filter((_, i) => i !== trackIndex));
  }, []);

  // Unload all tracks
  const unloadAll = useCallback(() => {
    player.unloadAll();
    setTracks([]);
  }, []);

  // Destroy player completely
  const destroy = useCallback(() => {
    player.destroy();
    stemSeparator.destroy();
    setInitialized(false);
    setIsPlaying(false);
    setPosition(0);
    setDuration(0);
    setTracks([]);
    setLoopSettings(null);
    setIsSeparating(false);
    setSeparationResult(null);
  }, []);

  // Limpiar al desmontar
  useEffect(() => {
    return () => {
      destroy();
    };
  }, [destroy]);

  return {
    initialized,
    isPlaying,
    position,
    duration,
    tracks,
    loopSettings,
    isSeparating,
    separationResult,
    init,
    addTrack,
    separateTracks,
    togglePlay,
    seekTo,
    setTrackVolume,
    setTrackMuted,
    setTrackSolo,
    setLoop,
    unloadTrack,
    unloadAll,
    destroy
  };
}

export default useAudio;