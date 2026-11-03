const MAX_PURL_LENGTH = 2048;
const isEncodedComponent = value => /^(?:[A-Za-z0-9._~-]|%[0-9A-Fa-f]{2})*$/.test(value);
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
  if (!input || input.length > MAX_PURL_LENGTH ||
      !/^[\x00-\x7F]*$/.test(input) || input.slice(0, 4).toLowerCase() !== 'pkg:') return null;

  // ECMA-427 permits parsers to accept the equivalent pkg:// form.
  const body = input.slice(4).replace(/^\/+/, '');
  const hash = body.indexOf('#');
  const beforeSubpath = hash < 0 ? body : body.slice(0, hash);
  const subpathRaw = hash < 0 ? '' : body.slice(hash + 1);
  if (hash >= 0 && (!subpathRaw || subpathRaw.includes('#'))) return null;

  const question = beforeSubpath.indexOf('?');
  const hierarchy = question < 0 ? beforeSubpath : beforeSubpath.slice(0, question);
  const query = question < 0 ? '' : beforeSubpath.slice(question + 1);
  if (question >= 0 && (!query || query.includes('?'))) return null;

  const slash = hierarchy.indexOf('/');
  if (slash < 1 || slash === hierarchy.length - 1) return null;
  const type = hierarchy.slice(0, slash).toLowerCase();
  if (!/^[a-z][a-z0-9.-]*$/.test(type)) return null;

  // Leading/trailing path slashes are insignificant in the PURL namespace/name.
  const path = hierarchy.slice(slash + 1).replace(/^\/+|\/+$/g, '');
  if (!path) return null;
  const segments = path.split('/');
  if (segments.some(segment => !segment)) return null;
  const last = segments.pop();
  const at = last.indexOf('@');
  const nameRaw = at < 0 ? last : last.slice(0, at);
  const versionRaw = at < 0 ? '' : last.slice(at + 1);
  if (!nameRaw || !isEncodedComponent(nameRaw) ||
      (at >= 0 && (!versionRaw || !isEncodedComponent(versionRaw)))) return null;

  if (segments.some(segment => !isEncodedComponent(segment))) return null;
  const namespaceParts = segments.map(decode);
  const name = decode(nameRaw);
  const version = versionRaw ? decode(versionRaw) : '';
  if (versionRaw && version === null) return null;
  // Namespace/name segments participate in URL path structure. Version,
  // however, is an opaque identifier and may legitimately be "." or "..".
  if ([...namespaceParts, name].some(part =>
    part === null || part === '' || part === '.' || part === '..'
  )) return null;
  if (versionRaw && (version === null || version === '')) return null;
  if (namespaceParts.some(part => part.includes('/'))) return null;

  const qualifiers = {};
  if (query) {
    for (const pair of query.split('&')) {
      const equals = pair.indexOf('=');
      if (equals < 1 || pair.indexOf('=', equals + 1) >= 0 || !isEncodedComponent(pair.slice(equals + 1))) return null;
      const key = pair.slice(0, equals).toLowerCase();
      const qualifierValue = decode(pair.slice(equals + 1));
      if (!/^[a-z][a-z0-9._-]*$/.test(key) ||
          qualifierValue === null || qualifierValue === '' ||
          Object.hasOwn(qualifiers, key)) return null;
      qualifiers[key] = qualifierValue;
    }
  }

  const normalizedSubpath = subpathRaw.replace(/^\/+|\/+$/g, '');
  const rawSubpathParts = normalizedSubpath ? normalizedSubpath.split('/') : [];
  if (rawSubpathParts.some(part => !isEncodedComponent(part))) return null;
  const subpathParts = rawSubpathParts.map(decode);
  if (hash >= 0 && !subpathParts.length) return null;
  if (subpathParts.some(part =>
    part === null || part === '' || part === '.' || part === '..' || part.includes('/')
  )) return null;

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
