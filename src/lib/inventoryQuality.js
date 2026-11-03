import { parsePackageUrl } from './packageUrl.js';
import { parseCpe23 } from './cpe23.js';
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
  items.forEach((item, index) => {
    const name = normalizeValue(item?.name);
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
  return { missingVersion, missingSourceVersion, invalidPurls, invalidCpes, sourceVersionWithoutPackage, duplicates };
}
