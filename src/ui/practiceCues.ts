import type { NoteEvent } from '../analysis/basicPitch.ts';
import type { Chord } from '../analysis/chords.ts';

export type PracticeCueKind = 'note' | 'chord';
export interface PracticeCue {
  pitch: number;
  start: number;
  end: number;
  kind: PracticeCueKind;
}

const CHORD_INTERVALS: Record<string, number[]> = {
  '': [4, 7], m: [3, 7], '7': [4, 7, 10], m7: [3, 7, 10],
  maj7: [4, 7, 11], sus2: [2, 7], sus4: [5, 7], dim: [3, 6],
  aug: [4, 8], '5': [7], '6': [4, 7, 9], m6: [3, 7, 9],
  '9': [2, 4, 7, 10], add9: [2, 4, 7],
};

export interface PracticeCueOptions {
  now: number;
  horizon: number;
  shift?: number;
  useNotes?: boolean;
  useChords?: boolean;
}

/**
 * The single source of truth for Synthesia falling bars and lit piano keys.
 * Times stay in song seconds; only pitches are transposed for the displayed key.
 * The interval is half-open [start, end), so a cue lights on its onset and turns
 * off exactly at its end.
 */
export function practiceCues(
  notes: NoteEvent[],
  chords: Chord[],
  options: PracticeCueOptions,
): PracticeCue[] {
  const { now, horizon, shift = 0, useNotes = true, useChords = true } = options;
  const out: PracticeCue[] = [];
  const visible = (start: number, end: number) =>
    Number.isFinite(start) && Number.isFinite(end) && end > start && end > now && start <= now + horizon;

  if (useNotes) for (const note of notes) {
    if (visible(note.start, note.end))
      out.push({ pitch: note.pitch + shift, start: note.start, end: note.end, kind: 'note' });
  }
  if (useChords) for (const chord of chords) {
    if (chord.root < 0 || !visible(chord.start, chord.end)) continue;
    const intervals = CHORD_INTERVALS[chord.q] ?? [4, 7];
    for (const interval of [0, ...intervals])
      out.push({ pitch: 60 + chord.root + interval + shift, start: chord.start, end: chord.end, kind: 'chord' });
  }
  return out;
}
