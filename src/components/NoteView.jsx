import { useState, useEffect } from 'react';
import { getTranslations } from '../i18n.js';
import { PIANO_NOTES, MIDI_NOTE_NAMES, KEY_POSITIONS } from '../data/pianoPatterns.js';

// Teclas blancas del piano (de izquierda a derecha)
const WHITE_KEYS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const BLACK_KEYS = ['C#', 'D#', 'F#', 'G#', 'A#'];

export function NoteView({
  notes = [],
  position = 0,
  duration = 0,
  onNoteComplete,
  speed = 1.0,
  progressionType = 'CMajor',
  arpeggioSpeed = 1.0
}) {
  const [language, setLanguage] = useState('en');
  const t = getTranslations(language);
  const [fallingNotes, setFallingNotes] = useState([]);
  const [completedNotes, setCompletedNotes] = useState(new Set());

  // Obtener notas de arpegio según la progresión
  useEffect(() => {
    const arpeggios = PIANO_NOTES.arpeggios;
    const arpNotes = arpeggios[progressionType] || arpeggios['CMajor'];

    // Escalar tiempo según speed
    const scaledNotes = arpNotes.map(note => ({
      ...note,
      time: note.time / speed
    }));

    setFallingNotes(scaledNotes);
  }, [progressionType, speed]);

  // Notas que están "cayendo" o cerca de la línea
  const activeFallingNotes = fallingNotes.filter(note => {
    const endTime = note.time + (note.duration || 2) / Math.max(arpeggioSpeed, 0.1);
    return position < endTime && position + 2 > note.time / Math.max(arpeggioSpeed, 0.1);
  });

  // Estado de notas completadas
  const [currentCompletedNotes, setCurrentCompletedNotes] = useState(new Set());

  // Manejar click en nota
  const handleNoteClick = (note) => {
    const noteKey = note.note || `${note.name}${note.octave || 4}`;
    const timeDiff = Math.abs((position * Math.max(arpeggioSpeed, 0.1)) - note.time);

    // Verificar si el tiempo está dentro del rango permitido (±0.5 segundos)
    if (timeDiff <= 0.5) {
      // Marcar como completada
      setCurrentCompletedNotes(prev => new Set([...prev, noteKey]));
      onNoteComplete?.(note, timeDiff);
    }
  };

  // Calcular posición X de una nota
  const getNotePosition = (noteName) => {
    const key = KEY_POSITIONS.find(k => k.note === noteName);
    return key ? key.x : 100;
  };

  return (
    <div className="note-view">
      <div className="note-section">
        <h3 className="note-title">{t.notes === 'Notes' ? 'Notes' : 'Notas'}</h3>

        {/* Piano visual */}
        <div className="piano-display" style={{ height: '180px' }}>
          {/* Línea de referencia donde deben caer las notas */}
          <div className="fall-line">
            <div className="line-indicator">{t.play === 'Play' ? 'Play' : 'Toca'} ⬇</div>
          </div>

          {/* Notas que caen */}
          <div className="falling-notes">
            {fallingNotes.map((note, index) => {
              const noteName = note.note || note.name || 'C';
              const octave = note.octave || 4;
              const startTime = note.time || 0;
              const noteDuration = note.duration || 0.5;
              const vel = note.velocity || 0.8;

              // Calcular posición vertical (cuanto más cerca de la línea, más arriba)
              const timeToLine = Math.max(0, startTime + noteDuration - position / Math.max(arpeggioSpeed, 0.1));
              const yPos = Math.max(0, Math.min(200, timeToLine * 100 * Math.max(arpeggioSpeed, 0.1)));

              const isHit = completedNotes.has(`${noteName}${octave}`);
              const isTarget = timeToLine < 0.5;

              // Obtener color basado en velocidad (más alta = más brillante)
              const brightness = Math.round(50 + vel * 50);

              return (
                <div
                  key={index}
                  className={`falling-note ${isHit ? 'hit' : ''} ${isTarget ? 'target' : ''}`}
                  style={{
                    top: yPos,
                    left: getNotePosition(noteName),
                    background: `hsl(140, 70%, ${brightness}%)`,
                    width: '30px'
                  }}
                  onClick={() => handleNoteClick(note)}
                >
                  <span className="note-name">{noteName}</span>
                </div>
              );
            })}
          </div>

          {/* Teclas del piano */}
          <div className="keyboard-overlay">
            {KEY_POSITIONS.map((key, index) => (
              <div
                key={index}
                className={`key-overlay white`}
                style={{ left: key.x }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default NoteView;