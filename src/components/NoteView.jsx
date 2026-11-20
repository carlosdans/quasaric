import { useState, useEffect, useRef } from 'react';
import { getTranslations } from '../i18n.js';

// Mapa de notas MIDI a posiciones visuales (simulando estilo Synthesia)
// Cada nota tiene una posición y duración para caer
const MIDI_TO_Y_POSITION = {
 'C': 200, 'C#': 180, 'D': 160, 'D#': 130, 'E': 110,
 'F': 90, 'F#': 60, 'G': 40, 'G#': 10, 'A': -10,
 'A#': -40, 'B': -60
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

export function NoteView({
  notes = [],
  position = 0,
  duration = 0,
  onNoteComplete,
  speed = 1.0
}) {
  const [language, setLanguage] = useState('en');
  const t = getTranslations(language);
  const containerRef = useRef(null);
  const animationRef = useRef(null);

  // Notas que están "cayendo" o cerca de la línea
  const fallingNotes = notes.filter(note => {
    const endTime = note.time + (note.duration || 2) / speed;
    return position < endTime && position + 2 > note.time / speed;
  });

  // Estado de notas completadas
  const [completedNotes, setCompletedNotes] = useState(new Set());

  // Manejar click en tecla
  const handleKeyPress = (note) => {
    if (!note) return;

    const noteTime = note.time || 0;
    const currentTime = position;

    // Verificar si el tiempo está dentro del rango permitido (±0.5 segundos)
    const timeDiff = Math.abs(currentTime - noteTime);

    if (timeDiff <= 0.5) {
      // Marcar como completada
      const noteKey = note.note || `${note.name}${note.octave}`;
      setCompletedNotes(prev => new Set([...prev, noteKey]));

      // Notificar
      onNoteComplete?.(note, timeDiff);
    }
  };

  // Limpiar animación al desmontar
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return (
    <div className="note-view">
      <div className="note-section">
        <h3 className="note-title">{t.notes === 'Notes' ? 'Notes' : 'Notas'}</h3>

        {/* Piano visual */}
        <div className="piano-display" ref={containerRef}>
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
              const noteDuration = note.duration || 2;

              // Calcular posición vertical (cuanto más cerca de la línea, más arriba)
              const timeToLine = Math.max(0, startTime + noteDuration - position);
              const yPos = Math.max(0, Math.min(200, timeToLine * 100 * speed));
              const isHit = completedNotes.has(`${noteName}${octave}`);

              return (
                <div
                  key={index}
                  className={`falling-note ${isHit ? 'hit' : ''} ${timeToLine < 0.5 ? 'target' : ''}`}
                  style={{
                    top: yPos,
                    left: getXPosition(noteName, octave)
                  }}
                  onClick={() => handleKeyPress({ ...note, name: noteName, octave })}
                >
                  <span className="note-name">{noteName}</span>
                </div>
              );
            })}
          </div>

          {/* Teclas del piano */}
          <div className="keyboard-overlay">
            {KEY_X_POSITIONS.map((key, index) => (
              <div
                key={index}
                className={`key-overlay white ${key.note.includes('#') ? 'black' : 'white'}`}
                style={{ left: key.x }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function getXPosition(note, octave) {
  // Calcular posición X basada en la tecla
  const noteIndex = WHITE_KEYS.indexOf(note) !== -1 ? WHITE_KEYS.indexOf(note) : -1;
  if (noteIndex === -1) {
    // Para notas negritas, usar posición intermedia
    const blackIndex = BLACK_KEYS.indexOf(note);
    if (blackIndex !== -1) {
      return (blackIndex * 40) + 20;
    }
    return 0;
  }

  const whiteOffset = octave + 1;
  return (noteIndex + whiteOffset * 7) * 40;
}

export default NoteView;