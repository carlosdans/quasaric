import { useState, useCallback } from 'react';
import { useAudio } from '../audio/useAudio';
import { ChannelSlider } from '../components/ChannelSlider';
import { ProgressBar } from '../components/ProgressBar';

export function PlayerScreen() {
  const [files, setFiles] = useState([]);
  const [showUpload, setShowUpload] = useState(false);
  const [loopStart, setLoopStart] = useState(null);
  const [loopEnd, setLoopEnd] = useState(null);

  const {
    initialized,
    isPlaying,
    position,
    duration,
    tracks,
    init,
    addTrack,
    togglePlay,
    seekTo,
    setTrackVolume,
    setTrackMuted,
    setTrackSolo,
    setLoop
  } = useAudio();

  // Inicializar al montar
  if (!initialized) {
    init();
  }

  const handleFileUpload = async (event) => {
    const uploadedFiles = Array.from(event.target.files).slice(0, 4);

    for (let i = 0; i < uploadedFiles.length; i++) {
      const file = uploadedFiles[i];
      const url = URL.createObjectURL(file);
      await addTrack(url, i, file.name.replace(/\.[^/.]+$/, ''));
    }

    setFiles(prev => [...prev, ...uploadedFiles.map(f => f.name)]);
  };

  const handleLoopToggle = () => {
    if (loopStart !== null && loopEnd !== null) {
      setLoop(loopStart, loopEnd);
    }
  };

  if (!initialized) {
    return (
      <div className="player-screen">
        <h2>Inicializando Audio...</h2>
      </div>
    );
  }

  if (tracks.length === 0) {
    return (
      <div className="player-screen">
        <h2 className="screen-title">Reproductor Multipista</h2>

        <div className="upload-area" onClick={() => setShowUpload(true)}>
          <div className="upload-icon">🎵</div>
          <h3>Seleccionar hasta 4 archivos de audio</h3>
          <p>MP3, WAV, AAC, OGG</p>
        </div>

        <input
          type="file"
          accept="audio/*"
          multiple
          onChange={handleFileUpload}
          style={{ display: 'none' }}
          ref={inputRef => {
            window.fileInput = inputRef;
          }}
        />

        <button
          className="upload-btn"
          onClick={() => setShowUpload(true)}
        >
          Subir archivos
        </button>
      </div>
    );
  }

  return (
    <div className="player-screen">
      <h2 className="screen-title">Reproductor Multipista</h2>

      {/* Track Info */}
      <div className="track-info">
        <h3 className="track-name">{tracks[0]?.name ?? 'Pista'}</h3>
        <p className="track-artist">Instrumentos: {tracks.map(t => t.name).join(', ')}</p>
      </div>

      {/* Progress Bar */}
      <ProgressBar
        position={position}
        duration={duration}
        onSeek={seekTo}
      />

      {/* Transport Controls */}
      <div className="transport-controls">
        <button className="transport-btn" onClick={() => seekTo(Math.max(0, position - 5))}>
          ◀◀
        </button>
        <button className="play-btn" onClick={togglePlay}>
          {isPlaying ? '⏸' : '▶'}
        </button>
        <button className="transport-btn" onClick={() => seekTo(Math.min(duration, position + 5))}>
          ▶▶
        </button>
      </div>

      {/* Loop Controls */}
      <div className="loop-controls">
        <button
          className={`loop-btn ${loopStart !== null && loopEnd !== null ? 'active' : ''}`}
          onClick={handleLoopToggle}
        >
          Loop A-B
        </button>
      </div>

      {/* Channel Controls */}
      <div className="channels-section">
        <h3>Canales</h3>
        {tracks.map((track, index) => (
          <ChannelSlider
            key={index}
            trackIndex={index}
            track={track}
            onVolumeChange={setTrackVolume}
            onMuteToggle={setTrackMuted}
            onSoloToggle={setTrackSolo}
          />
        ))}
      </div>

      {/* Upload More Files */}
      <button
        className="add-track-btn"
        onClick={() => setShowUpload(true)}
      >
        Añadir más pistas
      </button>
    </div>
  );
}

export default PlayerScreen;