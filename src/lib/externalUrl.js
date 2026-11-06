/**
 * Accept only absolute HTTPS links from external vulnerability feeds.
 * Feed-provided links are untrusted data and must never enable script schemes
 * or navigate users to local/private network services.
 */
function isNonPublicIpv4(hostname) {
  if (!/^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname)) return false;
  const octets = hostname.split('.').map(Number);
  if (octets.some(value => value > 255)) return true;
  const [a, b, c] = octets;
  return a === 0 || a === 10 || a === 127 || a >= 224
    || (a === 100 && b >= 64 && b <= 127)
    || (a === 169 && b === 254)
    || (a === 172 && b >= 16 && b <= 31)
    || (a === 192 && b === 168)
    || (a === 192 && b === 0 && (c === 0 || c === 2))
    || (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100)))
    || (a === 203 && b === 0 && c === 113);
}

function isLocalHostname(hostname) {
  return !hostname.includes('.')
    || /\.(?:localhost|local|internal|test|invalid|example)$/i.test(hostname);
}

export function safeExternalUrl(value) {
  if (typeof value !== 'string' || !value.trim()) return null;
  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase().replace(/\.$/, '');
    if (url.protocol !== 'https:' || !hostname || url.username || url.password) return null;
    // IPv6 literals are rejected rather than risking loopback, link-local or ULA targets.
    if (hostname.startsWith('[') || isNonPublicIpv4(hostname) || isLocalHostname(hostname)) return null;
    return url.href;
  } catch {
    return null;
  }
}
