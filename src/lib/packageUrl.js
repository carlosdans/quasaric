const MAX_PURL_LENGTH = 2048;
const decode = value => {
  try { return decodeURIComponent(value); } catch { return null; }
};

/**
 * Parse a Package URL without changing its identity. This is deliberately
 * descriptive only: a PURL is never converted into a CPE or guessed product.
 */
export function parsePackageUrl(value) {
  if (typeof value !== 'string') return null;
  const input = value.trim();
  if (!input || input.length > MAX_PURL_LENGTH || !input.startsWith('pkg:')) return null;
  const body = input.slice(4);
  const hash = body.indexOf('#');
  const beforeSubpath = hash < 0 ? body : body.slice(0, hash);
  const subpathRaw = hash < 0 ? '' : body.slice(hash + 1);
  const question = beforeSubpath.indexOf('?');
  const hierarchy = question < 0 ? beforeSubpath : beforeSubpath.slice(0, question);
  const query = question < 0 ? '' : beforeSubpath.slice(question + 1);
  const slash = hierarchy.indexOf('/');
  if (slash < 1 || slash === hierarchy.length - 1) return null;
  const type = hierarchy.slice(0, slash);
  if (!/^[a-z][a-z0-9.+-]*$/.test(type)) return null;
  const path = hierarchy.slice(slash + 1);
  const segments = path.split('/');
  if (segments.some(segment => !segment)) return null;
  const last = segments.pop();
  const at = last.indexOf('@');
  const nameRaw = at < 0 ? last : last.slice(0, at);
  const versionRaw = at < 0 ? '' : last.slice(at + 1);
  if (!nameRaw || (at >= 0 && !versionRaw)) return null;
  const namespaceParts = segments.map(decode);
  const name = decode(nameRaw);
  const version = versionRaw ? decode(versionRaw) : '';
  const subpathParts = subpathRaw ? subpathRaw.split('/').map(decode) : [];
  if ([...namespaceParts, name, ...(version ? [version] : []), ...subpathParts].some(part => part === null || part === '' || part === '.' || part === '..')) return null;
  const qualifiers = {};
  if (query) {
    for (const pair of query.split('&')) {
      const equals = pair.indexOf('=');
      if (equals < 1) return null;
      const key = decode(pair.slice(0, equals));
      const qualifierValue = decode(pair.slice(equals + 1));
      if (!key || qualifierValue === null || !/^[a-z][a-z0-9._-]*$/.test(key) || Object.hasOwn(qualifiers, key)) return null;
      qualifiers[key] = qualifierValue;
    }
  } else if (question >= 0) return null;
  return {
    type,
    namespace: namespaceParts.join('/'),
    name,
    version,
    qualifiers,
    subpath: subpathParts.join('/'),
    ecosystem: type
  };
}
