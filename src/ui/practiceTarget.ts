/** Choose a safe default for piano lessons without silently substituting another instrument. */
export function defaultPianoPracticeTarget(candidates: string[], savedTarget?: string): string {
  const isPiano = (name: string) => /piano|keys|keyboard/i.test(name);
  if (savedTarget && candidates.includes(savedTarget) && isPiano(savedTarget)) return savedTarget;
  return candidates.find(isPiano) ?? '';
}

/** Queue a different practice source if the current MIDI job belongs to another source. */
export function queuePracticeTarget(target: string, busySource: string, hasMidi: boolean): string {
  return target && !hasMidi && busySource && busySource !== target ? target : '';
}
