import { useState, useEffect, useRef, useCallback } from 'react';
import { getTranslations } from '../i18n.js';
import { CHORD_PROGRESSIONS, PROGRESSIONS, MIDI_NOTE_NAMES } from '../data/pianoPatterns.js';
import { ChordDetector } from '../core/ChordDetector.js';

// Mapa de notas musicales en diferentes octavas
const NOTE_MAP = {
  C: { name: 'C', sharps: 0 },
  'C#': { name: 'C#', sharps: 1 },
  D: { name: 'D', sharps: 0 },
  'D#': { name: 'D#', sharps: 1 },
  E: { name: 'E', sharps: 0 },
  F: { name: 'F', sharps: 0 },
  'F#': { name: 'F#', sharps: 1 },
  G: { name: 'G', sharps: 0 },
  'G#': { name: 'G#', sharps: 1 },
  A: { name: 'A', sharps: 0 },
  'A#': { name: 'A#', sharps: 1 },
  B: { name: 'B', sharps: 0 }
};

// Teclas blancas del piano (de izquierda a derecha)
const WHITE_KEYS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const BLACK_KEYS = ['C#', 'D#', 'F#', 'G#', 'A#'];

// Mapeo de teclas a posiciones
const KEY_X_POSITIONS = [];
let xPos = 0;

for (let octave = -1; octave <= 8; octave++) {
  for (let i = 0; i < 7; i++) {
    KEY_X_POSITIONS.push({
      note: WHITE_KEYS[i],
      octave: octave,
      x: xPos
    });
    xPos += 40;
  }
}

// Singleton detector
let chordDetectorInstance = null;
let isInitializing = false;

async function getChordDetector() {
  if (chordDetectorInstance) return chordDetectorInstance;
  if (isInitializing) {
    // Wait for initialization
    await new Promise(resolve => setTimeout(resolve, 100));
    return chordDetectorInstance;
  }
  isInitializing = true;
  chordDetectorInstance = new ChordDetector();
  isInitializing = false;
  return chordDetectorInstance;
}

export function ChordDisplay({
  activeChord = null,
  chords = [],
  position = 0,
  duration = 0,
  onChordChange,
  showPianoNotes = false,
  pianoNotes = [],
  detectedChords = [],  // Nuevas props para detección automática
  onPlayNote = null,    // Callback para reproducir notas
  progressionType = 'C Major',
  enableAutoDetection = false, // Habilitar detección automática real
  audioBuffer = null  // Buffer de audio para detección
}) {
  const [language, setLanguage] = useState('en');
  const t = getTranslations(language);
  const [currentChords, setCurrentChords] = useState([]);
  const [autoDetectedChords, setAutoDetectedChords] = useState([]);
  const [isDetecting, setIsDetecting] = useState(false);

  // Detección automática de acordes desde audio
  useEffect(() => {
    if (!enableAutoDetection || !audioBuffer) return;

    const controller = new AbortController();

    const detect = async () => {
      setIsDetecting(true);
      try {
        const detector = await getChordDetector();
        const result = await detector.analyze(audioBuffer, (progress) => {
          // Progress update if needed
        });

        if (result.success) {
          setAutoDetectedChords(result.chords);
        }
      } catch (e) {
        console.error('Error detectando acordes:', e);
      } finally {
        setIsDetecting(false);
      }
    };

    detect();

    return () => {
      controller.abort();
    };
  }, [enableAutoDetection, audioBuffer, position]);

  // Obtener progresión de acordes por tipo
  const getProgression = () => {
    return PROGRESSIONS[progressionType] || PROGRESSIONS['C Major'];
  };

  // Obtener acordes activos basados en posición
  useEffect(() => {
    // Priorizar acordes detectados automáticamente si están disponibles
    const chordsToUse = (autoDetectedChords.length > 0) ? autoDetectedChords : chords;

    if (!chordsToUse || chordsToUse.length === 0) {
      // Usar progresión por defecto
      const progression = getProgression();
      const active = progression.filter(chord => {
        const end = chord.time + (chord.duration || 4);
        return position >= chord.time && position < end;
      });
      setCurrentChords(active);

      if (activeChord !== active[0]?.chord) {
        onChordChange?.(active[0]?.chord);
      }
      return;
    }

    const active = chordsToUse.filter(chord => {
      if (!chord.time) return false;
      return position >= chord.time && position < (chord.time + (chord.duration || 4));
    });
    setCurrentChords(active);

    if (activeChord !== active[0]?.chord) {
      onChordChange?.(active[0]?.chord, active[0]?.notes);
    }
  }, [position, chords, activeChord, onChordChange, progressionType, autoDetectedChords]);

  // Notas del piano activas en esta posición
  const activeNotes = pianoNotes.filter(note => {
    if (!note.time) return false;
    return position >= note.time && position < (note.time + (note.duration || 2));
  });

  // Obtener notas MIDI para el acorde actual
  const getCurrentChordNotes = () => {
    if (currentChords.length === 0) return [];
    const chordInfo = currentChords[0];

    // Si el acorde tiene notas predefinidas (detección automática)
    if (chordInfo.notes) {
      return chordInfo.notes.map(midi => {
        const noteInfo = MIDI_NOTE_NAMES[midi];
        return noteInfo ? { ...noteInfo, midi } : null;
      }).filter(Boolean);
    }

    // Usar progresión predefined
    const chordName = chordInfo.chord;
    if (!chordName) return [];

    const chordData = CHORD_PROGRESSIONS[chordName];
    if (!chordData) return [];

    // Traducir notas MIDI a nombres
    return chordData.notes.map(midi => {
      const noteInfo = MIDI_NOTE_NAMES[midi];
      return noteInfo ? { ...noteInfo, midi } : null;
    }).filter(Boolean);
  };

  const currentNoteNames = getCurrentChordNotes();

  // Handel click en teclas para reproducir
  const handleKeyPress = (note) => {
    if (onPlayNote) {
      onPlayNote(note.name, note.octave, position);
    }
  };

  return (
    <div className="chord-display">
      <div className="chord-section">
        <h3 className="chord-title">{t.chords || 'Chords'}</h3>
        {isDetecting && (
          <span className="detecting-indicator">Analyzing...</span>
        )}
        <div className="current-chords">
          {currentChords.length > 0 ? (
            <div className="chord-container">
              {currentChords.map((chord, index) => (
                <span key={index} className="chord-name">{chord.chord}</span>
              ))}
            </div>
          ) : (
            <span className="chord-placeholder">—</span>
          )}
        </div>

        {/* Notas del acorde actual */}
        {currentNoteNames.length > 0 && (
          <div className="chord-notes">
            <span className="notes-label">{t.notes === 'Notes' ? 'Notes' : 'Notas'}:</span>
            {currentNoteNames.map((note, idx) => (
              <span key={idx} className="note-badge">{note.name}</span>
            ))}
          </div>
        )}
      </div>

      {/* Piano keyboard visual */}
      {showPianoNotes && (
        <div className="piano-keys">
          {/* Línea de referencia */}
          <div className="fall-line">
            <div className="line-indicator">{t.play === 'Play' ? 'Play' : 'Toca'} ⬇</div>
          </div>

          {/* Teclas del piano */}
          <div className="keyboard-overlay">
            {KEY_X_POSITIONS.map((key, index) => {
              const isHighlighted = activeNotes.some(note => note.name === key.note);

              return (
                <div
                  key={index}
                  className={`key-overlay white ${isHighlighted ? 'highlighted' : ''}`}
                  style={{ left: key.x }}
                  onClick={() => handleKeyPress(key)}
                >
                  {!key.note.includes('#') && (
                    <span className="key-label">{key.note}</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default ChordDisplay;