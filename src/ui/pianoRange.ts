/** Choose a piano-key range that contains every detected note, not just the song's average pitch. */
export function pianoKeyboardRange(pitches: readonly number[]): { low: number; high: number } {
  const valid = pitches.filter(Number.isFinite).map((p) => Math.max(21, Math.min(108, Math.round(p))));
  if (!valid.length) return { low: 36, high: 72 };

  const min = Math.min(...valid);
  const max = Math.max(...valid);
  let low = Math.max(21, Math.floor((min - 1) / 12) * 12);
  let high = Math.min(109, Math.ceil((max + 2) / 12) * 12);

  // Keep at least three octaves when the passage uses a narrow register.
  if (high - low < 36) {
    const centre = (min + max) / 2;
    low = Math.max(21, Math.min(73, Math.floor((centre - 18) / 12) * 12));
    high = low + 36;
    if (high > 109) {
      high = 109;
      // Start on C5 (a white key); starting at C#5 leaves its preceding C key
      // outside the range and clips the first black key at the left edge.
      low = 72;
    }
  }
  return { low, high };
}
