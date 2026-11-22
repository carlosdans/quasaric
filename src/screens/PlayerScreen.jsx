import { useState, useEffect, useCallback, useRef } from 'react';
import { useAudio } from '../audio/useAudio';
import { ChannelSlider } from '../components/ChannelSlider';
import { ProgressBar } from '../components/ProgressBar';
import { TempoControl } from '../components/TempoControl';
import { ChordDisplay } from '../components/ChordDisplay';
import { NoteView } from '../components/NoteView';
import { Waveform } from '../components/Waveform';
import { PianoKeyboard } from '../components/PianoKeyboard';
import { getTranslations } from '../i18n.js';
import { STEM_NAMES } from '../audio/stems.js';
import { CHORD_PROGRESSIONS, PROGRESSIONS, MIDI_NOTE_NAMES } from '../data/pianoPatterns.js';

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100 MB

// Nombres de los instrumentos según orden del modelo HTDemucs ONNX
// El modelo devuelve: [drums, bass, other, vocals, guitar, piano]
// Con el track original (índice 0), quedan: drums(1), bass(2), other(3), vocals(4), guitar(5), piano(6)
const INSTRUMENT_NAMES = ['drums', 'bass', 'other', 'vocals', 'guitar', 'piano'];
const PISTOL_TRACK_INDEX = 6; // Piano es el último stem (índice 6)

// Default chord progressions
const DEFAULT_PROGRESSION = 'C Major';
const AUTOMATIC_ACCOMPANY_PATTERNS = {
  fullChord: 'full_chord',
  arpeggio: 'arpeggio',
  bassAndChord: 'bass_and_chord',
  rhythmic: 'rhythmic',
  simple: 'simple'
};

export function PlayerScreen({ onBackToHome }) {
  const [language, setLanguage] = useState('en');
  const [error, setError] = useState(null);
  const [importing, setImporting] = useState(false);
  const [showSeparation, setShowSeparation] = useState(false);
  const [separationResultState, setSeparationResultState] = useState(null);
  const [showPracticeMode, setShowPracticeMode] = useState(false);
  const [practiceMode, setPracticeMode] = useState('chords'); // 'chords' or 'notes'
  const [originalAudioBuffer, setOriginalAudioBuffer] = useState(null);
  const [waveformPlayedTime, setWaveformPlayedTime] = useState(0);
  const [showPianoKeyboard, setShowPianoKeyboard] = useState(false);
  const [showAutoAccompany, setShowAutoAccompany] = useState(false);
  const [autoAccompanyPattern, setAutoAccompanyPattern] = useState('fullChord');
  const [detectedChords, setDetectedChords] = useState([]);
  const [manualChordNotes, setManualChordNotes] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedTracks, setRecordedTracks] = useState([]);
  const fileInputRef = useRef(null);
  const [recordedAudioContext, setRecordedAudioContext] = useState(null);
  const [masterChannel, setMasterChannel] = useState(null);
  const recordedStemsRef = useRef([]);

  const t = getTranslations(language);

  // Navigate back to home
  const handleBackToHome = () => {
    window.location.hash = '#home';
    if (onBackToHome) {
      onBackToHome();
    }
  };

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

  // Sincronizar tiempo del waveform con el reproductor
  useEffect(() => {
    setWaveformPlayedTime(position);
  }, [position]);

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
      await addTrack(url, file.name.replace(/\\.[^/.]+$/, ''));

      // Cargar AudioBuffer para waveform
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      setOriginalAudioBuffer(audioBuffer);
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

  // Get separated stems data
  const separatedStems = trackIsSeparated ? Object.fromEntries(
    STEM_NAMES.map((name, idx) => {
      const trackIndex = idx + 1; // Index 1-6 for stems
      return [name, tracks[trackIndex]];
    })
  ) : null;

  // Get current chord notes based on position
  const getCurrentChordNotes = () => {
    if (detectedChords.length > 0) {
      const activeChord = detectedChords.find(c => position >= c.time && position < c.time + c.duration);
      if (activeChord) return activeChord.notes;
    }
    if (manualChordNotes.length > 0) {
      const activeNote = manualChordNotes.find(n => position >= n.time && position < n.time + n.duration);
      if (activeNote) return [activeNote];
    }
    // Default C major chord
    return ['C4', 'E4', 'G4'];
  };

  // Play chord on piano virtual
  const playChordOnPiano = (notes) => {
    const noteMap = {
      'C4': 60, 'D4': 62, 'E4': 64, 'F4': 65, 'G4': 67, 'A4': 69, 'B4': 71,
      'C5': 72, 'D5': 74, 'E5': 76, 'F5': 77, 'G5': 79, 'A5': 81, 'B5': 83
    };
    notes.forEach(note => {
      const midi = noteMap[note];
      if (midi) {
        // Trigger note on
        const event = new CustomEvent('piano-note-on', { detail: { midi, velocity: 0.8 } });
        document.dispatchEvent(event);
      }
    });
  };

  // Get automatic accompaniment notes
  const getAutoAccompanyNotes = () => {
    if (!trackIsSeparated || !duration) return [];

    const progression = PROGRESSIONS[DEFAULT_PROGRESSION];
    if (!progression) return [];

    // Find current chord
    const elapsed = position;
    const chordInfo = progression.find(c => elapsed >= c.time && elapsed < c.time + c.duration);
    if (!chordInfo) return [];

    // Get MIDI notes for the chord
    const chordData = CHORD_PROGRESSIONS[chordInfo.chord];
    if (!chordData) return [];

    return chordData.notes.map(midi => ({
      name: MIDI_NOTE_NAMES[midi]?.name || 'C',
      octave: MIDI_NOTE_NAMES[midi]?.octave || 4,
      midi: midi,
      time: position,
      velocity: 0.8
    }));
  };

  // Handle piano note for accompaniment
  const handlePianoNote = (midi) => {
    const event = new CustomEvent('piano-note-on', { detail: { midi, velocity: 0.8 } });
    document.dispatchEvent(event);
  };

  return (
    <div className="player-screen">
      {/* Back to Home Button */}
      <button className="back-btn" onClick={handleBackToHome} aria-label={t.backHome}>
        ← {t.backHome}
      </button>

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

          {/* Waveform Visualization */}
          {!showPracticeMode && originalAudioBuffer && (
            <div className="waveform-section">
              <Waveform
                audioBuffer={originalAudioBuffer}
                position={position}
                duration={duration}
                onSeek={seekTo}
                height={80}
              />
            </div>
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

          {/* Six-Track Mixer - Visual Stem Controls */}
          {trackIsSeparated && (
            <div className="stem-mixer-section">
              <h3 className="stem-mixer-title">🔊 Stems</h3>
              <div className="stem-grid">
                {STEM_NAMES.map((stemName, idx) => {
                  const stemTrack = tracks[idx + 1];
                  if (!stemTrack) return null;

                  const displayNames = {
                    drums: t.drums || 'Drums',
                    bass: t.bass || 'Bass',
                    other: t.other || 'Other',
                    vocals: t.vocals || 'Vocals',
                    guitar: t.guitar || 'Guitar',
                    piano: t.piano || 'Piano'
                  };

                  return (
                    <div
                      key={stemName}
                      className={`stem-track stem-${stemName} ${stemTrack.muted ? 'stem-muted' : ''} ${stemTrack.soloed ? 'stem-soloed' : ''}`}
                    >
                      <div className="stem-name">
                        {displayNames[stemName]}
                      </div>
                      <div className="stem-controls">
                        <button
                          className="stem-play-btn"
                          onClick={() => setTrackMuted(idx + 1, !stemTrack.muted)}
                          title={stemTrack.muted ? `Unmute ${displayNames[stemName]}` : `Mute ${displayNames[stemName]}`}
                        >
                          {stemTrack.muted ? '🔇' : '🔊'}
                        </button>
                      </div>
                      <div className="stem-volume-container">
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.01"
                          value={stemTrack.volume ?? 1}
                          onChange={(e) => setTrackVolume(idx + 1, parseFloat(e.target.value))}
                          className="stem-volume-slider"
                          aria-label={`${displayNames[stemName]} volume`}
                        />
                        <span className="stem-volume-value">
                          {Math.round((stemTrack.volume ?? 1) * 100)}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

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
              <button
                className={`solo-btn`}
                onClick={() => setShowPianoKeyboard(!showPianoKeyboard)}
                title="Show Piano Keyboard"
              >
                🎹
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

          {/* Piano Keyboard (when separated) */}
          {showPianoKeyboard && trackIsSeparated && (
            <div className="piano-keyboard-section">
              <h3 className="piano-title">{t.piano || 'Piano'}</h3>
              <PianoKeyboard
                width={760}
                height={140}
                onNoteOn={(midi) => {
                  const noteInfo = MIDI_NOTE_NAMES[midi];
                  if (noteInfo) {
                    const noteEvent = {
                      name: noteInfo.name,
                      octave: noteInfo.octave,
                      midi: midi,
                      time: position,
                      velocity: 0.8
                    };

                    // Send to piano track output if available
                    handlePianoNote(midi);
                  }
                }}
              />
              <div className="piano-help">
                <span>🖱️ Click keys | ⌨️ Use keyboard | 🎹 MIDI supported</span>
              </div>
            </div>
          )}

          {/* Auto Accompany Mode */}
          {trackIsSeparated && !showPracticeMode && (
            <div className="auto-accompany-section">
              <h3 className="accompany-title">{t.autoAccompany || 'Auto Accompaniment'}</h3>
              <div className="accompany-controls">
                <button
                  className={`solo-btn ${showAutoAccompany ? 'active' : ''}`}
                  onClick={() => setShowAutoAccompany(!showAutoAccompany)}
                  title="Toggle Auto Accompaniment"
                >
                  {showAutoAccompany ? '🔊' : '🔇'} {t.autoAccompany || 'Auto accomp'}
                </button>
                {showAutoAccompany && (
                  <select
                    value={autoAccompanyPattern}
                    onChange={(e) => setAutoAccompanyPattern(e.target.value)}
                    className="pattern-select"
                  >
                    <option value="fullChord">Full Chord</option>
                    <option value="arpeggio">Arpeggio</option>
                    <option value="bassAndChord">Bass + Chord</option>
                    <option value="simple">Simple</option>
                  </select>
                )}
              </div>
            </div>
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