const VERSION_PATTERN = /^(?:([0-9]+):)?([A-Za-z0-9.+~:-]+)$/;

function orderCharacter(char) {
  if (char === '~') return -1;
  if (char === '') return 0;
  const code = char.charCodeAt(0);
  return /[A-Za-z]/.test(char) ? code : code + 256;
}

function comparePart(left, right) {
  let a = 0;
  let b = 0;
  while (a < left.length || b < right.length) {
    while (
      (a < left.length && !/[0-9]/.test(left[a])) ||
      (b < right.length && !/[0-9]/.test(right[b]))
    ) {
      const x = a < left.length && !/[0-9]/.test(left[a]) ? left[a] : '';
      const y = b < right.length && !/[0-9]/.test(right[b]) ? right[b] : '';
      const difference = orderCharacter(x) - orderCharacter(y);
      if (difference) return difference < 0 ? -1 : 1;
      if (x) a++;
      if (y) b++;
    }

    while (a < left.length && left[a] === '0') a++;
    while (b < right.length && right[b] === '0') b++;
    let aEnd = a;
    let bEnd = b;
    while (aEnd < left.length && /[0-9]/.test(left[aEnd])) aEnd++;
    while (bEnd < right.length && /[0-9]/.test(right[bEnd])) bEnd++;
    const aLength = aEnd - a;
    const bLength = bEnd - b;
    if (aLength !== bLength) return aLength < bLength ? -1 : 1;
    const aDigits = left.slice(a, aEnd);
    const bDigits = right.slice(b, bEnd);
    if (aDigits !== bDigits) return aDigits < bDigits ? -1 : 1;
    a = aEnd;
    b = bEnd;
  }
  return 0;
}

/**
 * Compare Debian/Ubuntu package versions using dpkg's epoch, upstream and
 * Debian revision ordering. Returns null for invalid or unsupported input.
 */
export function compareDebianVersions(leftVersion, rightVersion) {
  const leftText = String(leftVersion ?? '').trim();
  const rightText = String(rightVersion ?? '').trim();
  const leftMatch = VERSION_PATTERN.exec(leftText);
  const rightMatch = VERSION_PATTERN.exec(rightText);
  if (!leftMatch || !rightMatch) return null;

  const parse = match => {
    const epoch = match[1] || '0';
    const remainder = match[2];
    const separator = remainder.lastIndexOf('-');
    const upstream = separator === -1 ? remainder : remainder.slice(0, separator);
    const revision = separator === -1 ? '0' : remainder.slice(separator + 1);
    if (!upstream || !/^[0-9]/.test(upstream) || !/^[A-Za-z0-9.+~]+$/.test(upstream) ||
        !/^[A-Za-z0-9.+~]+$/.test(revision)) return null;
    return { epoch, upstream, revision };
  };

  const left = parse(leftMatch);
  const right = parse(rightMatch);
  if (!left || !right) return null;
  const epochOrder = comparePart(left.epoch, right.epoch);
  if (epochOrder) return epochOrder;
  const upstreamOrder = comparePart(left.upstream, right.upstream);
  if (upstreamOrder) return upstreamOrder;
  return comparePart(left.revision, right.revision);
}
