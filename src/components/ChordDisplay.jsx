import { useState, useEffect, useRef } from 'react';
import { getTranslations } from '../i18n.js';

// Mapa de notas musicales en diferentes octavas
const NOTE_MAP = {
 'C': { name: 'C', sharps: 0 },
'C#': { name: 'C#', sharps: 1 },
'D': { name: 'D', sharps: 0 },
'D#': { name: 'D#', sharps: 1 },
'E': { name: 'E', sharps: 0 },
'F': { name: 'F', sharps: 0 },
'F#': { name: 'F#', sharps: 1 },
'G': { name: 'G', sharps: 0 },
'G#': { name: 'G#', sharps: 1 },
'A': { name: 'A', sharps: 0 },
'A#': { name: 'A#', sharps: 1 },
'B': { name: 'B', sharps: 0 }
};

// Tabla de notas MIDI a nombres (cifrado simplificado)
const MIDI_TO_NOTE = {};
for (let i = 0; i < 128; i++) {
  const octave = Math.floor(i / 12) - 1;
  const noteIndex = i % 12;
  const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  MIDI_TO_NOTE[i] = {
    name: noteNames[noteIndex],
    octave: octave,
    midi: i
  };
}

// Posiciones de las teclas en el teclado (de graves a agudos)
const KEY_POSITIONS = [];
for (let octave = -1; octave <= 8; octave++) {
  for (let i = 0; i < 12; i++) {
    const noteName = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'][i];
    KEY_POSITIONS.push({ note: noteName, octave: octave });
  }
}

export function ChordDisplay({
  activeChord = null,
  chords = [],
  position = 0,
  duration = 0,
  onChordChange,
  showPianoNotes = false,
  pianoNotes = []
}) {
  const [language, setLanguage] = useState('en');
  const t = getTranslations(language);
  const [currentChords, setCurrentChords] = useState([]);

  // Obtener acordes activos basados en posición
  useEffect(() => {
    if (!chords || chords.length === 0) {
      setCurrentChords([]);
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
  }, [position, chords, activeChord, onChordChange]);

  // Notas del piano activas en esta posición
  const activeNotes = pianoNotes.filter(note => {
    if (!note.time) return false;
    return position >= note.time && position < (note.time + (note.duration || 2));
  });

  return (
    <div className="chord-display">
      <div className="chord-section">
        <h3 className="chord-title">{t.chords || 'Chords'}</h3>
        <div className="current-chords">
          {currentChords.length > 0 ? (
            currentChords.map((chord, index) => (
              <span key={index} className="chord-name">{chord.chord}</span>
            ))
          ) : (
            <span className="chord-placeholder">—</span>
          )}
        </div>
      </div>

      {/* Piano keyboard visual */}
      {showPianoNotes && (
        <div className="piano-keys">
          {KEY_POSITIONS.map((key, index) => {
            const isWhite = !key.note.includes('#');
            const isHighlighted = activeNotes.some(note => note.name === key.note);

            return (
              <div
                key={index}
                className={`piano-key ${isWhite ? 'white' : 'black'} ${isHighlighted ? 'highlighted' : ''}`}
              >
                {!isWhite && <span className="key-label">{key.note}</span>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default ChordDisplay;