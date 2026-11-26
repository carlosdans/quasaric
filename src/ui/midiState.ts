/** Persisted MIDI compatibility markers. */
export const MIDI_TIMING_VERSION = 3;
export const PIANO_MIDI_ENGINE_VERSION = 1;

/**
 * Restore saved MIDI without accidentally reusing piano notes made by the old
 * Basic Pitch path after piano sources switched to Transkun. Other source MIDI
 * remains valid, and subsequent saves record the engine version.
 */
export function restoreMidiState<T>(
  midi: Record<string, T[]> | undefined,
  timingVersion: number | undefined,
  pianoEngineVersion: number | undefined,
): Record<string, T[]> | undefined {
  if (!midi || timingVersion !== MIDI_TIMING_VERSION) return undefined;
  if (pianoEngineVersion === PIANO_MIDI_ENGINE_VERSION) return midi;
  const retained = Object.fromEntries(
    Object.entries(midi).filter(([source]) => !/piano|keys|keyboard/i.test(source)),
  ) as Record<string, T[]>;
  return Object.keys(retained).length ? retained : undefined;
}
