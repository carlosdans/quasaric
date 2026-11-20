/**
 * Piano Patterns - Datos de acordes y notas MIDI por escalas
 * ================================================
 *
 * Este archivo contiene patrones musicales comunes para:
 * - Visualización de acordes en modo práctica
 * - Transcripción básica de piano
 * - Practicar con notas caídas tipo Synthesia
 */

// Acordes comunes con notas MIDI (C4 = 60, A4 = 69)
export const CHORD_PROGRESSIONS = {
 'C': {
    name: 'C Major',
    notes: [60, 64, 67], // C4, E4, G4
    roman: 'I',
    degree: 1
  },
  'Am': {
    name: 'A Minor',
    notes: [57, 60, 64], // A3, C4, E4
    roman: 'vi',
    degree: 6
  },
  'F': {
    name: 'F Major',
    notes: [65, 69, 72], // F4, A4, C5
    roman: 'IV',
    degree: 4
  },
  'G': {
    name: 'G Major',
    notes: [67, 71, 74], // G4, B4, D5
    roman: 'V',
    degree: 5
  },
  'Dm': {
    name: 'D Minor',
    notes: [62, 65, 69], // D4, F4, A4
    roman: 'ii',
    degree: 2
  },
  'Em': {
    name: 'E Minor',
    notes: [64, 67, 71], // E4, G4, B4
    roman: 'iii',
    degree: 3
  }
};

// Progresiones de acordes comunes
export const PROGRESSIONS = {
  'C Major': [
    { chord: 'C', time: 0, duration: 4 },
    { chord: 'Am', time: 4, duration: 4 },
    { chord: 'F', time: 8, duration: 4 },
    { chord: 'G', time: 12, duration: 4 }
  ],
  'F Major': [
    { chord: 'F', time: 0, duration: 4 },
    { chord: 'Dm', time: 4, duration: 4 },
    { chord: 'Bb', time: 8, duration: 4 },
    { chord: 'C', time: 12, duration: 4 }
  ],
  'G Major': [
    { chord: 'G', time: 0, duration: 4 },
    { chord: 'Em', time: 4, duration: 4 },
    { chord: 'C', time: 8, duration: 4 },
    { chord: 'D', time: 12, duration: 4 }
  ],
  'Classic Pop': [
    { chord: 'I', time: 0, duration: 4 },
    { chord: 'vi', time: 4, duration: 4 },
    { chord: 'IV', time: 8, duration: 4 },
    { chord: 'V', time: 12, duration: 4 }
  ]
};

// Notas MIDI para piano (rango C1 a C8)
export const PIANO_NOTES = {
  // Octava grave (C1-C2)
  bass: [36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72],

  // Notas de C Major scale (Do mayor)
  cMajorScale: {
    'C4': { name: 'C', midi: 60, octave: 4, position: 0 },
    'D4': { name: 'D', midi: 62, octave: 4, position: 1 },
    'E4': { name: 'E', midi: 64, octave: 4, position: 2 },
    'F4': { name: 'F', midi: 65, octave: 4, position: 3 },
    'G4': { name: 'G', midi: 67, octave: 4, position: 4 },
    'A4': { name: 'A', midi: 69, octave: 4, position: 5 },
    'B4': { name: 'B', midi: 71, octave: 4, position: 6 },
    'C5': { name: 'C', midi: 72, octave: 5, position: 7 }
  },

  // Arpegios comunes
  arpeggios: {
    'CMajor': [
      { note: 'C', midi: 60, time: 0, duration: 1, velocity: 0.8 },
      { note: 'E', midi: 64, time: 0.5, duration: 1, velocity: 0.7 },
      { note: 'G', midi: 67, time: 1, duration: 1, velocity: 0.8 },
      { note: 'C5', midi: 72, time: 1.5, duration: 1, velocity: 0.9 }
    ],
    'Fmajor': [
      { note: 'F', midi: 65, time: 0, duration: 1, velocity: 0.8 },
      { note: 'A', midi: 69, time: 0.5, duration: 1, velocity: 0.7 },
      { note: 'C5', midi: 72, time: 1, duration: 1, velocity: 0.8 },
      { note: 'F5', midi: 77, time: 1.5, duration: 1, velocity: 0.9 }
    ],
    'Gmajor': [
      { note: 'G', midi: 67, time: 0, duration: 1, velocity: 0.8 },
      { note: 'B', midi: 71, time: 0.5, duration: 1, velocity: 0.7 },
      { note: 'D5', midi: 74, time: 1, duration: 1, velocity: 0.8 },
      { note: 'G5', midi: 79, time: 1.5, duration: 1, velocity: 0.9 }
    ]
  }
};

// Tabla de notas MIDI a nombres (cifrado simplificado)
export const MIDI_NOTE_NAMES = {};
for (let i = 21; i <= 108; i++) {
  const octave = Math.floor(i / 12) - 1;
  const noteIndex = i % 12;
  const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  MIDI_NOTE_NAMES[i] = {
    name: noteNames[noteIndex],
    octave: octave,
    midi: i
  };
}

// Posición visual de teclas en piano (para el display)
export const KEY_POSITIONS = [];
let xPos = 0;

for (let octave = -1; octave <= 8; octave++) {
  // Teclas blancas
  const whiteKeys = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
  for (let i = 0; i < 7; i++) {
    KEY_POSITIONS.push({
      note: whiteKeys[i],
      octave: octave,
      x: xPos
    });
    xPos += 40;
  }
}

export default {
  CHORD_PROGRESSIONS,
  PROGRESSIONS,
  PIANO_NOTES,
  MIDI_NOTE_NAMES,
  KEY_POSITIONS
};