/** Choose a safe default for piano lessons without silently substituting another instrument. */
export function defaultPianoPracticeTarget(candidates: string[], savedTarget?: string): string {
  const isPiano = (name: string) => /piano|keys|keyboard/i.test(name);
  if (savedTarget && candidates.includes(savedTarget) && isPiano(savedTarget)) return savedTarget;
  return candidates.find(isPiano) ?? '';
}
