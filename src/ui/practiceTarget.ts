/** Choose a safe default for piano lessons without silently substituting another instrument. */
export function defaultPianoPracticeTarget(candidates: string[], savedTarget?: string): string {
  if (savedTarget && candidates.includes(savedTarget)) return savedTarget;
  return candidates.find((name) => /piano|keys|keyboard/i.test(name)) ?? '';
}
