/**
 * Validate canonical CVE identifiers using the CVE Program's sequence rules.
 * IDs assigned before 2014 use 1–4 sequence digits; IDs from 2014 onward
 * require at least four. This validates syntax, not whether a CVE is published.
 */
export function isValidCveId(value) {
  if (typeof value !== 'string') return false;
  const match = /^CVE-(\\d{4})-(\\d+)$/.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const sequence = match[2];
  if (year < 1999 || /^0+$/.test(sequence)) return false;
  return year < 2014 ? sequence.length <= 4 : sequence.length >= 4;
}
