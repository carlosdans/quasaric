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
  const addTrack = useCallback(async (url, name, trackIndex = tracks.length, fileData = null) => {
    const track = await player.addTrack(url, trackIndex, name, fileData);
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
              // Crear WAV del stem usando APIs web estándar
              const wavBuffer = await new Promise((resolve, reject) => {
                const length = stemBuffer.length;
                const sampleRate = stemBuffer.sampleRate;
                const numChannels = stemBuffer.numberOfChannels;
                const byteRate = sampleRate * 2 * numChannels;

                // Crear buffer WAV usando Uint8Array (compatible con navegador)
                const wavSize = 44 + length * 2 * numChannels;
                const wavArray = new Uint8Array(wavSize);
                const view = new DataView(wavArray.buffer);

                // WAV Header
                // RIFF chunk
                view.setUint8(0, 0x52); // 'R'
                view.setUint8(1, 0x49); // 'I'
                view.setUint8(2, 0x46); // 'F'
                view.setUint8(3, 0x46); // 'F'
                view.setUint32(4, 36 + length * 2 * numChannels - 8, true); // chunk size
                view.setUint8(8, 0x57); // 'W'
                view.setUint8(9, 0x41); // 'A'
                view.setUint8(10, 0x56); // 'V'
                view.setUint8(11, 0x45); // 'E'
                // fmt subchunk
                view.setUint8(12, 0x66); // 'f'
                view.setUint8(13, 0x6D); // 'm'
                view.setUint8(14, 0x74); // 't'
                view.setUint8(15, 0x20); // ' '
                view.setUint16(16, 16, true); // audio format (PCM)
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
                view.setUint32(40, length * 2 * numChannels, true); // data size

                // Audio data
                let offset = 44;
                for (let j = 0; j < length; j++) {
                  for (let ch = 0; ch < numChannels; ch++) {
                    const sample = Math.max(-1, Math.min(1, stemBuffer.getChannelData(ch)[j]));
                    view.setInt16(offset, sample * 0x7FFF, true);
                    offset += 2;
                  }
                }

                resolve(wavArray);
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