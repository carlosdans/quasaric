import { useState, useEffect } from 'react';
import { getTranslations } from '../i18n.js';
import { CHORD_PROGRESSIONS, PROGRESSIONS, MIDI_NOTE_NAMES } from '../data/pianoPatterns.js';

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

export function ChordDisplay({
  activeChord = null,
  chords = [],
  position = 0,
  duration = 0,
  onChordChange,
  showPianoNotes = false,
  pianoNotes = [],
  progressionType = 'C Major'
}) {
  const [language, setLanguage] = useState('en');
  const t = getTranslations(language);
  const [currentChords, setCurrentChords] = useState([]);

  // Obtener progresión de acordes por tipo
  const getProgression = () => {
    return PROGRESSIONS[progressionType] || PROGRESSIONS['C Major'];
  };

  // Obtener acordes activos basados en posición
  useEffect(() => {
    if (!chords || chords.length === 0) {
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

    const active = chords.filter(chord => {
      if (!chord.time) return false;
      return position >= chord.time && position < (chord.time + (chord.duration || 4));
    });
    setCurrentChords(active);

    if (activeChord !== active[0]?.chord) {
      onChordChange?.(active[0]?.chord);
    }
  }, [position, chords, activeChord, onChordChange, progressionType]);

  // Notas del piano activas en esta posición
  const activeNotes = pianoNotes.filter(note => {
    if (!note.time) return false;
    return position >= note.time && position < (note.time + (note.duration || 2));
  });

  // Obtener notas MIDI para el acorde actual
  const getCurrentChordNotes = () => {
    if (currentChords.length === 0) return [];
    const chordName = currentChords[0]?.chord;
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

  return (
    <div className="chord-display">
      <div className="chord-section">
        <h3 className="chord-title">{t.chords || 'Chords'}</h3>
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

          {/* Notas que caen */}
          <div className="falling-notes">
            {fallingNotes.map((note, index) => {
              return null;
            })}
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