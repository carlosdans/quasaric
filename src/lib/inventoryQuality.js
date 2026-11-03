import { parsePackageUrl } from './packageUrl.js';
import { parseCpe23 } from './cpe23.js';
function normalizeArchitecture(value) {
  const normalized = String(value || '').trim().toLowerCase().replace(/[\\s-]+/g, '_');
  const aliases = { amd64: 'x86_64', x64: 'x86_64', x86_64: 'x86_64', i386: 'x86', i486: 'x86', i586: 'x86', i686: 'x86', x86: 'x86', arm64: 'aarch64', aarch64: 'aarch64', armv7l: 'arm', armhf: 'arm' };
  return aliases[normalized] || normalized;
}
const normalizeValue = value => String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');

function duplicateIdentity(item) {
  const name = normalizeValue(item?.name);
  const version = normalizeValue(item?.version);
  // Without both name and installed version, duplicate detection is too
  // speculative: keep the item visible in the quality warnings instead.
  if (!name || !version) return null;
  const identifier = value => String(value || '').trim();
  return JSON.stringify([
    name, normalizeValue(item?.type), normalizeValue(item?.vendor),
    normalizeValue(item?.ecosystem), version, normalizeValue(item?.architecture),
    normalizeValue(item?.sourcePackage), normalizeValue(item?.sourceVersion),
    // PURLs and source references can contain case-sensitive ecosystem IDs.
    // Keep explicit identifiers intact rather than collapsing distinct packages.
    identifier(item?.purl), identifier(item?.cpe), identifier(item?.sourcePurl),
    identifier(item?.sourceRef)
  ]);
}

export function inspectInventory(items = []) {
  const seen = new Map();
  const duplicates = [];
  const missingVersion = [];
  const missingSourceVersion = [];
  const invalidPurls = [];
  const invalidCpes = [];
  const sourceVersionWithoutPackage = [];
  const identifierConflicts = [];
  items.forEach((item, index) => {
    const name = normalizeValue(item?.name);
    const declaredArchitecture = normalizeArchitecture(item?.architecture);
    const purl = item?.purl ? parsePackageUrl(item.purl) : null;
    const cpe = item?.cpe ? parseCpe23(item.cpe) : null;
    const architectureClaims = [
      declaredArchitecture && { source: 'inventory', value: declaredArchitecture },
      purl?.qualifiers?.arch && { source: 'PURL', value: normalizeArchitecture(purl.qualifiers.arch) },
      cpe?.targetHw && !['*', '-'].includes(cpe.targetHw) && { source: 'CPE targetHw', value: normalizeArchitecture(cpe.targetHw) }
    ].filter(Boolean);
    if (new Set(architectureClaims.map(claim => claim.value)).size > 1) {
      identifierConflicts.push({ id: item?.id ?? String(index), name: item?.name || '—', claims: architectureClaims });
    }
    if (!normalizeValue(item?.version)) {
      missingVersion.push({ id: item?.id ?? String(index), name: item?.name || '—' });
    }
    for (const field of ['purl', 'sourcePurl']) {
      const value = String(item?.[field] || '').trim();
      if (value && !parsePackageUrl(value)) {
        invalidPurls.push({ id: item?.id ?? String(index), name: item?.name || '—', field });
      }
    }
    if (item?.cpe && !parseCpe23(item.cpe)) {
      invalidCpes.push({ id: item?.id ?? String(index), name: item?.name || '—' });
    }
    if (normalizeValue(item?.sourceVersion) && !normalizeValue(item?.sourcePackage)) {
      sourceVersionWithoutPackage.push({ id: item?.id ?? String(index), name: item?.name || '—' });
    }
    if (normalizeValue(item?.sourcePackage) && !normalizeValue(item?.sourceVersion)) {
      missingSourceVersion.push({
        id: item?.id ?? String(index),
        name: item?.name || '—',
        sourcePackage: item.sourcePackage
      });
    }
    const key = duplicateIdentity(item);
    if (!key) return;
    if (seen.has(key)) {
      duplicates.push({
        id: item?.id ?? String(index),
        name: item?.name,
        firstIndex: seen.get(key) + 1,
        row: index + 1
      });
    } else {
      seen.set(key, index);
    }
  });
  return { missingVersion, missingSourceVersion, invalidPurls, invalidCpes, sourceVersionWithoutPackage, identifierConflicts, duplicates };
}
