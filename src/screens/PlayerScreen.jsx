import { useState, useCallback, useRef } from 'react';
import { useAudio } from '../audio/useAudio';
import { ChannelSlider } from '../components/ChannelSlider';
import { ProgressBar } from '../components/ProgressBar';
import { TempoControl } from '../components/TempoControl';
import { ChordDisplay } from '../components/ChordDisplay';
import { NoteView } from '../components/NoteView';
import { getTranslations } from '../i18n.js';

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100 MB

// Nombres de los instrumentos según orden del modelo HTDemucs ONNX
// El modelo devuelve: [drums, bass, other, vocals, guitar, piano]
// Con el track original (índice 0), quedan: drums(1), bass(2), other(3), vocals(4), guitar(5), piano(6)
const INSTRUMENT_NAMES = ['drums', 'bass', 'other', 'vocals', 'guitar', 'piano'];
const PISTOL_TRACK_INDEX = 6; // Piano es el último stem (índice 6)

export function PlayerScreen() {
  const [language, setLanguage] = useState('en');
  const [error, setError] = useState(null);
  const [importing, setImporting] = useState(false);
  const [showSeparation, setShowSeparation] = useState(false);
  const [separationResultState, setSeparationResultState] = useState(null);
  const [showPracticeMode, setShowPracticeMode] = useState(false);
  const [practiceMode, setPracticeMode] = useState('chords'); // 'chords' or 'notes'
  const fileInputRef = useRef(null);

  const t = getTranslations(language);

  const {
    initialized,
    isPlaying,
    position,
    duration,
    tracks,
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

    setError(null);
    setImporting(true);
    setSeparationResultState(null);

    try {
      // Añadir pista original primero
      const url = URL.createObjectURL(file);
      await addTrack(url, file.name.replace(/\.[^/.]+$/, ''));
    } catch (e) {
      console.error('Error importing file:', e);
      setError(t.errorLoading);
    } finally {
      setImporting(false);
      event.target.value = '';
    }
  };

  const handleSeparation = async () => {
    if (!tracks[0]) return;

    // Usar el archivo ya importado
    const track = tracks[0];
    if (!track.blobUrl) return;

    setError(null);
    setImporting(true);

    try {
      // Crear un File-like object desde el Blob URL
      const response = await fetch(track.blobUrl);
      const arrayBuffer = await response.arrayBuffer();

      // Crear un objeto File temporal
      const tempFile = new File(
        [arrayBuffer],
        track.name + '.mp3',
        { type: 'audio/mpeg' }
      );

      const result = await separateTracks(tempFile, 6);
      setSeparationResultState(result);
      if (!result.success) {
        setError(result.error || t.errorLoading);
      }
    } catch (e) {
      console.error('Error in separation:', e);
      setError(t.errorLoading);
    } finally {
      setImporting(false);
    }
  };

  const handleOpenFile = () => {
    fileInputRef.current?.click();
  };

  const handleUnloadAll = () => {
    unloadAll();
    setShowSeparation(false);
    setSeparationResultState(null);
    setPracticeMode('chords');
    setShowPracticeMode(false);
    setError(null);
  };

  const trackIsSeparated = tracks && tracks.length > 1;
  const pianoTrackIndex = trackIsSeparated ? PISTOL_TRACK_INDEX : -1; // Piano es el último stem (índice 6)

  const handleSilencePiano = () => {
    if (pianoTrackIndex >= 0) {
      setTrackMuted(pianoTrackIndex, !tracks[pianoTrackIndex]?.muted);
    }
  };

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

          {/* Practice Mode Toggle */}
          {trackIsSeparated && (
            <div className="practice-mode-toggle">
              <button
                className={`solo-btn ${showPracticeMode && practiceMode === 'chords' ? 'active' : ''}`}
                onClick={() => {
                  setShowPracticeMode(true);
                  setPracticeMode('chords');
                }}
                title={t.chords}
              >
                {t.chords || 'Chords'}
              </button>
              <button
                className={`solo-btn ${showPracticeMode && practiceMode === 'notes' ? 'active' : ''}`}
                onClick={() => {
                  setShowPracticeMode(true);
                  setPracticeMode('notes');
                }}
                title={t.notes}
              >
                {t.notes || 'Notes'}
              </button>
              {showPracticeMode && (
                <button
                  className="solo-btn"
                  onClick={() => setShowPracticeMode(false)}
                  title="Back to player"
                >
                  ←
                </button>
              )}
            </div>
          )}

          {/* Practice View (Chords) */}
          {showPracticeMode && practiceMode === 'chords' && trackIsSeparated && (
            <ChordDisplay
              position={position}
              duration={duration}
              chords={[]} // Se puede cargar desde archivo JSON o crear datos estáticos
            />
          )}

          {/* Practice View (Notes) */}
          {showPracticeMode && practiceMode === 'notes' && trackIsSeparated && (
            <NoteView
              position={position}
              duration={duration}
              notes={[]} // Se puede cargar desde archivo JSON o crear datos estáticos
            />
          )}

          {/* Progress Bar */}
          {!showPracticeMode && (
            <ProgressBar
              position={position}
              duration={duration}
              onSeek={seekTo}
            />
          )}

          {/* Transport Controls */}
          {!showPracticeMode && (
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
          )}

          {/* Time Display */}
          {!showPracticeMode && (
            <div className="time-display">
              <span>{Math.floor(position/60)}:{String(Math.floor(position%60)).padStart(2,'0')}</span>
              <span> / </span>
              <span>{duration > 0 ? `${Math.floor(duration/60)}:${String(Math.floor(duration%60)).padStart(2,'0')}` : '0:00'}</span>
            </div>
          )}

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

          {/* Silence Piano Button (when separated) */}
          {trackIsSeparated && pianoTrackIndex >= 0 && (
            <div className="piano-controls">
              <button
                className={`solo-btn ${tracks[pianoTrackIndex]?.muted ? 'active' : ''}`}
                onClick={handleSilencePiano}
                title="Silence Piano"
              >
                {tracks[pianoTrackIndex]?.muted ? '🔊 Piano' : '🔇 Piano'}
              </button>
            </div>
          )}

          {/* Tempo Control */}
          {!showPracticeMode && (
            <TempoControl
              tempo={120} // TODO: Vincular con AudioContext playbackRate
              showLoopControls={true}
            />
          )}

          {/* Controls */}
          <div className="player-actions">
            {!showSeparation && (
              <button className="transport-btn" onClick={handleOpenFile}>
                🔄
              </button>
            )}
            <button className="transport-btn" onClick={handleUnloadAll}>
              ✕
            </button>
          </div>

          {/* Separation Section */}
          {showSeparation && !trackIsSeparated && !importing && (
            <div className="separation-section">
              <h3>{t.separate || 'Separate'}</h3>
              <p className="separation-hint">
                {t.separationMode || 'Separate the song into instrument stems'}
              </p>
              <button
                className="upload-btn"
                onClick={handleSeparation}
                style={{ marginTop: '12px' }}
              >
                {t.separate || 'Separate Tracks'}
              </button>
            </div>
          )}

          {/* Loading Indicator */}
          {isSeparating && (
            <div className="loading-indicator">
              {t.loading || 'Loading...'}
            </div>
          )}

          {/* Separation Result */}
          {separationResult && separationResult.success && (
            <div className="separation-result">
              <h3>{t.separationReady || 'Separation Complete'}</h3>
              <p className="success-message">{separationResult.message}</p>
              <button
                className="upload-btn"
                onClick={() => setShowSeparation(false)}
                style={{ marginTop: '8px' }}
              >
                {t.play || 'Play'}
              </button>
            </div>
          )}
        </>
      )}

      {/* Import in Progress */}
      {importing && (
        <div className="loading-indicator">
          {t.loading || 'Loading...'}
        </div>
      )}
    </div>
  );
}

export default PlayerScreen;