/**
 * Vendor-aware version ordering for vulnerability applicability.
 *
 * Comparators are intentionally conservative: null means that the input is
 * not understood and must not be treated as affected or fixed.
 */
import { compareDebianVersions } from './debianVersions.js';
import { parsePackageUrl } from './packageUrl.js';

const numericCompare = (a, b) => {
  const left = String(a).split('.').map(part => BigInt(part));
  const right = String(b).split('.').map(part => BigInt(part));
  for (let i = 0; i < Math.max(left.length, right.length); i++) {
    const x = left[i] ?? 0n;
    const y = right[i] ?? 0n;
    if (x !== y) return x < y ? -1 : 1;
  }
  return 0;
};

function compareSemver(left, right) {
  const pattern = /^v?(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/;
  const parse = value => {
    const match = pattern.exec(String(value).trim());
    if (!match) return null;
    const pre = match[4] ? match[4].split('.') : [];
    if (pre.some(id => !id || (/^\d+$/.test(id) && id.length > 1 && id.startsWith('0')))) return null;
    return { core: match.slice(1, 4).map(BigInt), pre };
  };
  const a = parse(left), b = parse(right);
  if (!a || !b) {
    // NVD CPE boundaries may use major.minor shorthand while inventory has a patch segment.
    const shorthand = /^\d+(?:\.\d+){1,3}$/;
    const leftText = String(left).trim(), rightText = String(right).trim();
    const hasShortForm = leftText.split('.').length < 3 || rightText.split('.').length < 3;
    return hasShortForm && shorthand.test(leftText) && shorthand.test(rightText)
      ? numericCompare(leftText, rightText) : null;
  }
  for (let i = 0; i < 3; i++) if (a.core[i] !== b.core[i]) return a.core[i] < b.core[i] ? -1 : 1;
  if (!a.pre.length && !b.pre.length) return 0;
  if (!a.pre.length) return 1;
  if (!b.pre.length) return -1;
  for (let i = 0; i < Math.max(a.pre.length, b.pre.length); i++) {
    if (a.pre[i] === undefined) return -1;
    if (b.pre[i] === undefined) return 1;
    const an = /^\d+$/.test(a.pre[i]), bn = /^\d+$/.test(b.pre[i]);
    if (an && bn) {
      const order = numericCompare(a.pre[i], b.pre[i]);
      if (order) return order;
    } else if (an !== bn) return an ? -1 : 1;
    else if (a.pre[i] !== b.pre[i]) return a.pre[i] < b.pre[i] ? -1 : 1;
  }
  return 0;
}

/** RPM's segment ordering, including epoch, tilde, caret and release. */
function rpmvercmp(left, right) {
  let a = String(left), b = String(right), i = 0, j = 0;
  while (i < a.length || j < b.length) {
    if (a[i] === '~' || b[j] === '~') {
      if (a[i] !== '~') return 1;
      if (b[j] !== '~') return -1;
      i++; j++; continue;
    }
    if (a[i] === '^' || b[j] === '^') {
      if (!a[i]) return -1;
      if (!b[j]) return 1;
      if (a[i] !== '^') return 1;
      if (b[j] !== '^') return -1;
      i++; j++; continue;
    }
    while (i < a.length && !/[A-Za-z0-9]/.test(a[i])) i++;
    while (j < b.length && !/[A-Za-z0-9]/.test(b[j])) j++;
    if (i >= a.length || j >= b.length) break;
    const numericA = /\d/.test(a[i]), numericB = /\d/.test(b[j]);
    if (numericA !== numericB) return numericA ? 1 : -1;
    let endA = i, endB = j;
    const re = numericA ? /\d/ : /[A-Za-z]/;
    while (endA < a.length && re.test(a[endA])) endA++;
    while (endB < b.length && re.test(b[endB])) endB++;
    let partA = a.slice(i, endA), partB = b.slice(j, endB);
    if (numericA) {
      partA = partA.replace(/^0+/, '') || '0';
      partB = partB.replace(/^0+/, '') || '0';
      if (partA.length !== partB.length) return partA.length < partB.length ? -1 : 1;
    }
    if (partA !== partB) return partA < partB ? -1 : 1;
    i = endA; j = endB;
  }
  while (i < a.length && !/[A-Za-z0-9~^]/.test(a[i])) i++;
  while (j < b.length && !/[A-Za-z0-9~^]/.test(b[j])) j++;
  if (i < a.length || j < b.length) {
    if (a[i] === '~' || b[j] === '~') return a[i] === '~' ? -1 : 1;
    if (a[i] === '^' || b[j] === '^') return a[i] === '^' ? 1 : -1;
    return i < a.length ? 1 : -1;
  }
  return 0;
}

function compareRpm(left, right) {
  const parse = value => {
    const text = String(value).trim();
    const epochMatch = /^(\d+):(.*)$/.exec(text);
    const body = epochMatch ? epochMatch[2] : text;
    const split = body.lastIndexOf('-');
    const version = split < 0 ? body : body.slice(0, split);
    const release = split < 0 ? '' : body.slice(split + 1);
    const validRpmSegment = segment => /^[A-Za-z0-9._+~^]+$/.test(segment);
    if (!version || (split >= 0 && !release) ||
        !validRpmSegment(version) || (release && !validRpmSegment(release))) return null;
    return { epoch: epochMatch?.[1] || '0', version, release };
  };
  const a = parse(left), b = parse(right);
  if (!a || !b) return null;
  const epoch = numericCompare(a.epoch, b.epoch);
  if (epoch) return epoch;
  const version = rpmvercmp(a.version, b.version);
  return version || rpmvercmp(a.release, b.release);
}

/**
 * Conservative Alpine APK version ordering. Supports numeric release tuples,
 * the documented APK suffix families and the -rN package revision. Inputs
 * outside this grammar return null rather than falling back to lexical order.
 */
function compareApk(left, right) {
  const suffixOrder = new Map([
    ['alpha', 0], ['beta', 1], ['pre', 2], ['rc', 3],
    ['', 4], ['cvs', 5], ['svn', 6], ['git', 7], ['hg', 8], ['p', 9]
  ]);
  const parse = value => {
    const match = /^(?:(\\d+):)?(\\d+(?:\\.\\d+)*)(?:_(alpha|beta|pre|rc|cvs|svn|git|hg|p)(\\d*))?(?:-r(\\d+))?$/.exec(String(value).trim());
    if (!match) return null;
    return {
      epoch: match[1] || '0',
      release: match[2].split('.').map(BigInt),
      suffix: match[3] || '',
      suffixNumber: BigInt(match[4] || '0'),
      revision: BigInt(match[5] || '0')
    };
  };
  const a = parse(left), b = parse(right);
  if (!a || !b) return null;
  let order = numericCompare(a.epoch, b.epoch);
  if (order) return order;
  for (let i = 0; i < Math.max(a.release.length, b.release.length); i++) {
    const x = a.release[i] ?? 0n, y = b.release[i] ?? 0n;
    if (x !== y) return x < y ? -1 : 1;
  }
  const suffixA = suffixOrder.get(a.suffix), suffixB = suffixOrder.get(b.suffix);
  if (suffixA !== suffixB) return suffixA < suffixB ? -1 : 1;
  if (a.suffixNumber !== b.suffixNumber) return a.suffixNumber < b.suffixNumber ? -1 : 1;
  if (a.revision !== b.revision) return a.revision < b.revision ? -1 : 1;
  return 0;
}

function comparePep440(left, right) {
  // Parse dev separately to keep public and local ordering explicit.
  const parseFull = value => {
    const text = String(value).trim().toLowerCase();
    const m = /^v?(?:(\d+)!)?(\d+(?:\.\d+)*)(?:[-_.]?(a|b|rc|alpha|beta|c|pre|preview)[-_.]?(\d*))?(?:-(?:post[-_.]?)?(\d+)|[-_.]?(post|rev|r)[-_.]?(\d*))?(?:[-_.]?dev[-_.]?(\d*))?(?:\+([a-z0-9]+(?:[-_.][a-z0-9]+)*))?$/.exec(text);
    if (!m) return null;
    const preName = m[3] ? ({ alpha: 'a', beta: 'b', c: 'rc', pre: 'rc', preview: 'rc' }[m[3]] || m[3]) : null;
    const local = m[9] ? m[9].split(/[-_.]/).map(part => /^\d+$/.test(part) ? { n: BigInt(part) } : { s: part }) : [];
    return { epoch: m[1] || '0', release: m[2].split('.').map(BigInt),
      pre: preName ? [({ a: 0, b: 1, rc: 2 })[preName], BigInt(m[4] || '0')] : null,
      post: m[5] !== undefined ? BigInt(m[5]) : m[6] ? BigInt(m[7] || '0') : null,
      devNumber: m[8] !== undefined ? BigInt(m[8] || '0') : null, hasDev: m[8] !== undefined,
      local };
  };
  const a = parseFull(left), b = parseFull(right);
  if (!a || !b) return null;
  let order = numericCompare(a.epoch, b.epoch); if (order) return order;
  const releaseLength = Math.max(a.release.length, b.release.length);
  for (let i = 0; i < releaseLength; i++) {
    const x = a.release[i] ?? 0n, y = b.release[i] ?? 0n;
    if (x !== y) return x < y ? -1 : 1;
  }
  const preOrder = (x, y) => {
    if (!x && !y) return 0;
    if (!x) return 1;
    if (!y) return -1;
    return x[0] !== y[0] ? (x[0] < y[0] ? -1 : 1) : x[1] === y[1] ? 0 : (x[1] < y[1] ? -1 : 1);
  };
  // A dev-only release sorts before prereleases; final release sorts after rc.
  if (a.post === null && b.post === null) {
    if (!a.pre && a.hasDev && (b.pre || !b.hasDev)) return -1;
    if (!b.pre && b.hasDev && (a.pre || !a.hasDev)) return 1;
  }
  order = preOrder(a.pre, b.pre); if (order) return order;
  if (a.post !== null && b.post === null) return 1;
  if (a.post === null && b.post !== null) return -1;
  if (a.post !== null && b.post !== null && a.post !== b.post) return a.post < b.post ? -1 : 1;
  if (a.hasDev && !b.hasDev) return -1;
  if (!a.hasDev && b.hasDev) return 1;
  if (a.hasDev && b.hasDev && a.devNumber !== b.devNumber) return a.devNumber < b.devNumber ? -1 : 1;
  if (!a.local.length && !b.local.length) return 0;
  if (!a.local.length) return -1;
  if (!b.local.length) return 1;
  for (let i = 0; i < Math.max(a.local.length, b.local.length); i++) {
    if (!a.local[i]) return -1; if (!b.local[i]) return 1;
    const x = a.local[i], y = b.local[i];
    if (x.n !== undefined && y.n !== undefined) { if (x.n !== y.n) return x.n < y.n ? -1 : 1; }
    else if (x.n !== undefined || y.n !== undefined) return x.n !== undefined ? 1 : -1;
    else if (x.s !== y.s) return x.s < y.s ? -1 : 1;
  }
  return 0;
}

function compareWindows(left, right) {
  const parse = value => {
    const text = String(value).trim();
    if (!/^\d+(?:\.\d+){1,3}$/.test(text)) return null;
    return text.split('.').map(part => BigInt(part));
  };
  const a = parse(left), b = parse(right);
  if (!a || !b) return null;
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const x = a[i] ?? 0n, y = b[i] ?? 0n;
    if (x !== y) return x < y ? -1 : 1;
  }
  return 0;
}

const PURL_ECOSYSTEMS = Object.freeze({
  deb: 'deb',
  rpm: 'rpm',
  pypi: 'pypi',
  npm: 'npm',
  composer: 'composer',
  maven: 'maven'
});

export function normalizeEcosystem(component = {}) {
  const purl = parsePackageUrl(component.purl);
  // A package URL is an explicit package identity. Never let an unrelated
  // package name (for example npm's "python-shell") override its ecosystem.
  const purlEcosystem = PURL_ECOSYSTEMS[purl?.type];
  if (purlEcosystem) return purlEcosystem;

  // Prefer declared platform/runtime metadata when no authoritative PURL type exists.
  const declared = [component.ecosystem, component.vendor].filter(Boolean).join(' ').toLowerCase();
  if (/\b(ubuntu|debian|dpkg)\b/.test(declared)) return 'deb';
  if (/\b(rhel|red hat|rocky|alma ?linux|suse|sles|fedora|rpm)\b/.test(declared)) return 'rpm';
  if (/\b(windows server|windows 10|windows 11|microsoft windows)\b/.test(declared)) return 'windows';
  if (/\b(pypi|python|pip)\b/.test(declared)) return 'pypi';
  if (/\b(npm|node\.?js|nodejs)\b/.test(declared)) return 'npm';
  if (/\b(composer|php)\b/.test(declared)) return 'composer';
  if (/\b(maven|gradle|java)\b/.test(declared)) return 'maven';

  // Retain only canonical platform/runtime labels for legacy inventory rows.
  // Do not scan arbitrary package names: names like "python-shell" are ambiguous.
  const label = String(component.name || '').trim().toLowerCase();
  if (/^(?:debian|ubuntu)(?: linux)?(?: \d+(?:\.\d+)*)?$/.test(label)) return 'deb';
  if (/^(?:windows(?: server)?(?: \d{2,4})?|microsoft windows)$/.test(label)) return 'windows';
  if (/^(?:python|python 3|pypi|pip)$/.test(label)) return 'pypi';
  if (/^(?:node(?:\.js)?|nodejs|npm)$/.test(label)) return 'npm';
  if (/^(?:php|composer)$/.test(label)) return 'composer';
  if (/^(?:java|maven|gradle)$/.test(label)) return 'maven';
  return purl?.type || '';
}

/**
 * Compare versions using the package/distribution ecosystem declared by the
 * component. Unknown ecosystems only use strict numeric ordering; no guessed
 * lexical comparison is performed.
 */
export function compareVersionForComponent(left, right, component = {}) {
  const ecosystem = normalizeEcosystem(component);
  const componentName = String(component.name || '').trim().toLowerCase();
  const hasUnknownPhpSuffix = value => {
    const suffix = String(value).trim().split('-').slice(1).join('-').toLowerCase();
    return suffix && !['alpha', 'beta', 'rc', 'dev', 'preview', 'pl'].some(prefix => suffix.startsWith(prefix));
  };
  if (componentName === 'php' && (hasUnknownPhpSuffix(left) || hasUnknownPhpSuffix(right))) return null;
  if (ecosystem === 'deb') return compareDebianVersions(left, right);
  if (ecosystem === 'rpm') return compareRpm(left, right);
  if (ecosystem === 'apk') return compareApk(left, right);
  if (ecosystem === 'pypi') return comparePep440(left, right);
  if (ecosystem === 'npm' || ecosystem === 'composer') return compareSemver(left, right);
  if (ecosystem === 'windows') return compareWindows(left, right);
  const a = String(left ?? '').trim(), b = String(right ?? '').trim();
  if (!/^\d+(?:\.\d+)*$/.test(a) || !/^\d+(?:\.\d+)*$/.test(b)) return null;
  return numericCompare(a, b);
}

/**
 * Evaluate explicit inclusive/exclusive affected bounds. A null comparison
 * always produces needs_review, never an assumed affected or patched result.
 */
export function classifyVersionRange(version, range = {}, component = {}) {
  const installed = String(version ?? '').trim();
  if (!installed) return { status: 'version_missing', confidence: 'low', reason: 'Installed version is missing.' };
  const checks = [
    [range.versionStartIncluding, order => order >= 0],
    [range.versionStartExcluding, order => order > 0],
    [range.versionEndIncluding, order => order <= 0],
    [range.versionEndExcluding, order => order < 0]
  ];
  let bounded = false;
  for (const [boundary, accepts] of checks) {
    if (boundary === undefined || boundary === null || boundary === '') continue;
    if (boundary === '0' && range.versionStartIncluding === '0') continue;
    bounded = true;
    const order = compareVersionForComponent(installed, boundary, component);
    if (order === null) return { status: 'needs_review', confidence: 'low', reason: 'The installed version and advisory boundary cannot be safely compared for this ecosystem.' };
    if (!accepts(order)) return { status: 'not_affected', confidence: 'high', reason: 'The installed version is outside the explicit affected version range.' };
  }
  return bounded
    ? { status: 'affected_candidate', confidence: 'medium', reason: 'The installed version falls within the explicit affected version range; verify the vendor advisory and package build.' }
    : { status: 'needs_review', confidence: 'low', reason: 'The advisory does not provide an explicit version boundary.' };
}
