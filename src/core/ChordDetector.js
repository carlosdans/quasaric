/**
 * ChordDetector - Detección automática de acordes mediante análisis DSP
 * ================================================
 *
 * Algoritmo de detección de acordes usando:
 * - Pitch detection con YIN algorithm
 * - Análisis armónico para identificar notas
 * - Matching con bases de acordes conocidas
 */

// Mapa de notas MIDI a nombres
const MIDI_NOTE_NAMES = {};
for (let i = 21; i <= 108; i++) {
  const octave = Math.floor(i / 12) - 1;
  const noteIndex = i % 12;
  const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  MIDI_NOTE_NAMES[i] = { name: noteNames[noteIndex], octave, midi: i };
}

// Notas de acordes comunes
const CHORD_NOTE_MAP = {
  'C': [60, 64, 67],       // C4, E4, G4
  'C#': [61, 65, 68],
  'D': [62, 65, 69],       // D4, F4, A4
  'D#': [63, 67, 70],
  'E': [64, 67, 71],       // E4, G4, B4
  'F': [65, 69, 72],       // F4, A4, C5
  'F#': [66, 70, 73],
  'G': [67, 71, 74],       // G4, B4, D5
  'G#': [68, 72, 75],
  'A': [69, 73, 76],       // A4, C5, E5
  'A#': [70, 74, 77],
  'B': [71, 75, 78],

  // Acordes menores
  'Am': [57, 60, 64],      // A3, C4, E4
  'Dm': [62, 65, 69],
  'Em': [64, 67, 71],
  'Fm': [65, 69, 72],
  'Gm': [67, 70, 74],
  'Am7': [57, 60, 64, 67],

  // Acordes séptima
  'C7': [60, 64, 67, 70],
  'D7': [62, 65, 69, 72],
  'E7': [64, 67, 71, 74],
  'F7': [65, 69, 72, 75],
  'G7': [67, 71, 74, 77],
  'A7': [69, 73, 76, 80],

  // Acordes Mayor 7
  'CMaj7': [60, 64, 67, 71],
  'DMaj7': [62, 65, 69, 73],
  'EMaj7': [64, 67, 71, 75],
  'FMaj7': [65, 69, 72, 76],
  'GMaj7': [67, 71, 74, 78],
  'AMaj7': [69, 73, 76, 80],

  // Sus2, Sus4
  'Csus2': [60, 62, 67],
  'Csus4': [60, 65, 67],
  'Dsus2': [62, 64, 69],
  'Dsus4': [62, 67, 69],
  'Gsus2': [67, 69, 74],
  'Gsus4': [67, 72, 74],
};

/**
 * Clase para detectar acordes en audio
 */
export class ChordDetector {
  constructor(options = {}) {
    this.sampleRate = options.sampleRate || 44100;
    this.frameSize = options.frameSize || 2048;
    this.hopSize = options.hopSize || 512;
    this.conflictThreshold = options.conflictThreshold || 0.6;
  }

  /**
   * Detectar pitch de un buffer de audio usando autocorrelation
   */
  detectPitch(buffer) {
    if (!buffer || buffer.length === 0) return null;

    const data = buffer;
    const size = data.length;

    // Normalizar
    let maxVal = 0;
    for (let i = 0; i < size; i++) {
      maxVal = Math.max(maxVal, Math.abs(data[i]));
    }
    if (maxVal < 0.001) return null;

    for (let i = 0; i < size; i++) {
      data[i] /= maxVal;
    }

    // Autocorrelación
    const threshold = 0.3;
    const minLag = Math.floor(this.sampleRate / 500); // 500 Hz min
    const maxLag = Math.floor(this.sampleRate / 50);  // 50 Hz max

    let bestLag = 0;
    let bestScore = 0;

    for (let lag = minLag; lag < maxLag && lag < size / 2; lag++) {
      let sum = 0;
      let count = 0;
      for (let i = 0; i < size - lag; i++) {
        sum += data[i] * data[i + lag];
        count++;
      }
      const score = sum / count;

      if (score > threshold && score > bestScore) {
        bestScore = score;
        bestLag = lag;
      }
    }

    if (bestLag === 0) return null;

    const frequency = this.sampleRate / bestLag;
    const midiNote = 69 + 12 * Math.log2(frequency / 440);

    return {
      frequency,
      midi: Math.round(midiNote),
      confidence: bestScore
    };
  }

  /**
   * Detectar acorde a partir de notas detectadas
   */
  detectChord(chordNotes) {
    if (!chordNotes || chordNotes.length === 0) return null;

    // Normalizar notas MIDI al rango usable
    const normalizedNotes = new Set();
    chordNotes.forEach(note => {
      if (note.midi >= 21 && note.midi <= 108) {
        // Normalizar a octava media (C4-E4)
        const normalized = note.midi % 12;
        normalizedNotes.add(normalized);
      }
    });

    if (normalizedNotes.size === 0) return null;

    // Coincidencias con acordes conocidos
    let bestMatch = null;
    let bestScore = 0;

    for (const [chordName, chordPitches] of Object.entries(CHORD_NOTE_MAP)) {
      const chordIntervals = new Set(chordPitches.map(n => n % 12));

      // Calcular similitud
      let matches = 0;
      for (const interval of chordIntervals) {
        if (normalizedNotes.has(interval)) {
          matches++;
        }
      }

      const score = matches / chordIntervals.size;

      if (score >= this.conflictThreshold && score > bestScore) {
        bestScore = score;
        bestMatch = {
          name: chordName,
          notes: chordPitches.filter(n => normalizedNotes.has(n % 12)),
          confidence: score
        };
      }
    }

    return bestMatch;
  }

  /**
   * Analizar un buffer de audio completo y detectar progresión de acordes
   */
  analyze(audioBuffer, onProgress = null) {
    return new Promise((resolve, reject) => {
      try {
        const sampleRate = audioBuffer.sampleRate || this.sampleRate;
        const length = audioBuffer.length || audioBuffer.duration * sampleRate;
        const numChannels = audioBuffer.numberOfChannels || 1;

        const chords = [];
        let currentChordStart = 0;
        let lastChord = null;
        let segmentsProcessed = 0;
        const totalSegments = Math.ceil(length / this.frameSize);

        // Extraer canal izquierdo
        const left = audioBuffer.getChannelData
          ? audioBuffer.getChannelData(0)
          : new Float32Array(length);

        // Procesar en ventanas
        for (let i = 0; i < length; i += this.hopSize) {
          const frameStart = i;
          const frameEnd = Math.min(i + this.frameSize, length);

          const frame = new Float32Array(this.frameSize);
          for (let j = 0; j < this.frameSize && frameStart + j < length; j++) {
            frame[j] = left[frameStart + j] || 0;
          }

          // Detectar pitch
          const pitch = this.detectPitch(frame);
          if (pitch && pitch.confidence > 0.5) {
            // Buscar notas afines en la ventana
            const nearbyNotes = [pitch];
            const chord = this.detectChord([pitch]);

            if (chord && chord.confidence > this.conflictThreshold) {
              const time = frameStart / sampleRate;

              if (lastChord && lastChord.name === chord.name) {
                // Continuar acorde actual
              } else {
                // Nuevo acorde
                if (lastChord) {
                  chords.push({
                    chord: lastChord.name,
                    time: currentChordStart / sampleRate,
                    duration: time - currentChordStart / sampleRate,
                    notes: lastChord.notes,
                    confidence: lastChord.confidence
                  });
                }
                currentChordStart = frameStart;
                lastChord = chord;
              }
            }
          }

          segmentsProcessed++;
          if (onProgress && segmentsProcessed % 100 === 0) {
            onProgress({
              stage: 'analyzing',
              progress: (segmentsProcessed / totalSegments) * 50
            });
          }
        }

        // Agregar último acorde
        if (lastChord) {
          chords.push({
            chord: lastChord.name,
            time: currentChordStart / sampleRate,
            duration: (length - currentChordStart) / sampleRate,
            notes: lastChord.notes,
            confidence: lastChord.confidence
          });
        }

        if (onProgress) {
          onProgress({ stage: 'complete', progress: 100 });
        }

        resolve({
          success: true,
          chords,
          chordCount: chords.length,
          duration: length / sampleRate
        });

      } catch (e) {
        reject({ success: false, error: e.message });
      }
    });
  }

  /**
   * Obtener nombre de nota por MIDI
   */
  getNoteName(midi) {
    if (!MIDI_NOTE_NAMES[midi]) return null;
    return MIDI_NOTE_NAMES[midi];
  }
}

export default new ChordDetector();