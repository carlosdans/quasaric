import { useState, useEffect, useRef, useCallback } from 'react';
import player from './MultiTrackPlayer';

export function useAudio() {
  const [initialized, setInitialized] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [tracks, setTracks] = useState([]);
  const [audioContextReady, setAudioContextReady] = useState(false);
  const [loopSettings, setLoopSettings] = useState(null);

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
  const addTrack = useCallback(async (url, name) => {
    const track = await player.addTrack(url, tracks.length, name);
    setTracks(prev => [...prev, {
      id: track.id,
      name: track.name,
      volume: 1,
      muted: false,
      soloed: false,
      blobUrl: track.blobUrl
    }]);
    setDuration(track.duration);
    return track;
  }, [tracks.length]);

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
    setInitialized(false);
    setIsPlaying(false);
    setPosition(0);
    setDuration(0);
    setTracks([]);
    setLoopSettings(null);
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
    init,
    addTrack,
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