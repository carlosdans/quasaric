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
    if (high > 109) high = 109;
    // The three-octave fit can land at MIDI 73 (C#5) while high is exactly
    // 109. Include the preceding C5 white key so the first black key is not
    // clipped by xOf(), which positions black keys relative to that white key.
    if (low > 21 && low % 12 !== 0) low = Math.floor(low / 12) * 12;
    // Keep the highest detected note inside the half-open [low, high) range.
    high = Math.max(high, max + 1);
  }
  return { low, high };
}
