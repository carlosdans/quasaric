/**
 * Accept only absolute HTTPS URLs from external vulnerability feeds.
 * Feed-provided links are untrusted data and must never enable script schemes.
 */
export function safeExternalUrl(value) {
  if (typeof value !== 'string' || !value.trim()) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || !url.hostname || url.username || url.password) return null;
    return url.href;
  } catch {
    return null;
  }
}
