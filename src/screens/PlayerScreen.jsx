import { useState, useCallback, useRef } from 'react';
import { useAudio } from '../audio/useAudio';
import { ChannelSlider } from '../components/ChannelSlider';
import { ProgressBar } from '../components/ProgressBar';
import { getTranslations } from '../i18n.js';

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100 MB

export function PlayerScreen() {
  const [language, setLanguage] = useState('en');
  const [error, setError] = useState(null);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef(null);

  const t = getTranslations(language);

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
    setLoop,
    unloadAll
  } = useAudio();

  // Inicializar al montar
  if (!initialized) {
    init();
  }

  const handleFileUpload = async (event) => {
    event.preventDefault();
    const file = event.target.files?.[0];

    if (!file) return;

    // Validaciones
    if (file.size > MAX_FILE_SIZE) {
      setError(t.fileTooLarge);
      return;
    }

    const fileType = file.type;
    if (!['audio/mpeg', 'audio/wav', 'audio/x-wav'].includes(fileType)) {
      setError(t.errorLoading);
      return;
    }

    setImporting(true);
    setError(null);

    try {
      const url = URL.createObjectURL(file);
      await addTrack(url, 0, file.name.replace(/\.[^/.]+$/, ''));
    } catch (e) {
      console.error('Error importing file:', e);
      setError(t.errorLoading);
    } finally {
      setImporting(false);
      event.target.value = '';
    }
  };

  const handleOpenFile = () => {
    fileInputRef.current?.click();
  };

  const handleUnloadAll = () => {
    unloadAll();
  };

  if (!initialized) {
    return (
      <div className="player-screen">
        <h2>{t.loading || 'Loading...'}</h2>
      </div>
    );
  }

  const activeTrack = tracks[0];

  return (
    <div className="player-screen">
      <h2 className="screen-title">{t.play || 'Player'}</h2>

      {/* Error Message */}
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {/* Import Section - Quando no hay pistas */}
      {!activeTrack && (
        <>
          <div className="import-section">
            <input
              type="file"
              accept="audio/mp3,audio/wav,application/octetstream"
              ref={fileInputRef}
              onChange={handleFileUpload}
              style={{ display: 'none' }}
            />

            <div className="upload-area" onClick={handleOpenFile}>
              <div className="upload-icon">🎵</div>
              <h3>{t.openSong || 'Abrir canción'}</h3>
              <p className="file-hint">{t.importSong || 'Importar archivo'}: MP3, WAV</p>
            </div>

            <button className="upload-btn" onClick={handleOpenFile}>
              {t.openSong || 'Abrir canción'}
            </button>
          </div>
        </>
      )}

      {/* Player Controls - Cuando hay pistas */}
      {activeTrack && (
        <>
          {/* Track Info */}
          <div className="track-info">
            <h3 className="track-name">{activeTrack.name}</h3>
            {duration > 0 && (
              <p className="track-duration">
                {Math.floor(duration/60)}:{String(Math.floor(duration%60)).padStart(2,'0')}
              </p>
            )}
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

          {/* Time Display */}
          <div className="time-display">
            <span>{Math.floor(position/60)}:{String(Math.floor(position%60)).padStart(2,'0')}</span>
            <span> / </span>
            <span>{duration > 0 ? `${Math.floor(duration/60)}:${String(Math.floor(duration%60)).padStart(2,'0')}` : '0:00'}</span>
          </div>

          {/* Channel Controls */}
          <div className="channels-section">
            <h3>{t.practice || 'Practice'}</h3>
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

          {/* Controls */}
          <div className="player-actions">
            <button className="transport-btn" onClick={handleOpenFile}>
              🔄
            </button>
            <button className="transport-btn" onClick={handleUnloadAll}>
              ✕
            </button>
          </div>

          {importing && (
            <div className="loading-indicator">
              {t.loading || 'Loading...'}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default PlayerScreen;