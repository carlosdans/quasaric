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

export const chordIntervals = (quality: string) => CHORD_INTERVALS[quality] ?? [4, 7];

export interface PracticeCueOptions {
  now: number;
  horizon: number;
  shift?: number;
  useNotes?: boolean;
  useChords?: boolean;
}

export interface PracticePitchOptions {
  shift?: number;
  useNotes?: boolean;
  useChords?: boolean;
}

const validInterval = (start: number, end: number) =>
  Number.isFinite(start) && Number.isFinite(end) && end > start;

/** All pitches used by a lesson, independent of the current playhead. */
export function practicePitches(
  notes: NoteEvent[],
  chords: Chord[],
  options: PracticePitchOptions = {},
): number[] {
  const { shift = 0, useNotes = true, useChords = true } = options;
  const pitches: number[] = [];
  if (useNotes) for (const note of notes) {
    if (validInterval(note.start, note.end) && Number.isFinite(note.pitch))
      pitches.push(note.pitch + shift);
  }
  if (useChords) for (const chord of chords) {
    if (!Number.isFinite(chord.root) || chord.root < 0 || !validInterval(chord.start, chord.end)) continue;
    for (const interval of [0, ...chordIntervals(chord.q)])
      pitches.push(60 + ((chord.root + interval) % 12) + shift);
  }
  return pitches;
}

/** Exact pitches sounding now; chord tones do not light every octave of a pitch class. */
export function practiceActivePitches(cues: PracticeCue[], now: number): { notes: Set<number>; chords: Set<number> } {
  const notes = new Set<number>();
  const chords = new Set<number>();
  for (const cue of cues) {
    if (cue.start > now || cue.end <= now) continue;
    (cue.kind === 'note' ? notes : chords).add(cue.pitch);
  }
  return { notes, chords };
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
    validInterval(start, end) && end > now && start <= now + horizon;

  if (useNotes) for (const note of notes) {
    if (visible(note.start, note.end) && Number.isFinite(note.pitch) && Number.isFinite(shift))
      out.push({ pitch: note.pitch + shift, start: note.start, end: note.end, kind: 'note' });
  }
  if (useChords) for (const chord of chords) {
    if (!Number.isFinite(chord.root) || chord.root < 0 || !visible(chord.start, chord.end) || !Number.isFinite(shift)) continue;
    const intervals = chordIntervals(chord.q);
    for (const interval of [0, ...intervals])
      out.push({ pitch: 60 + ((chord.root + interval) % 12) + shift, start: chord.start, end: chord.end, kind: 'chord' });
  }
  return out;
}
