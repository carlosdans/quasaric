const normalizeValue = value => String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
export function inspectInventory(items = []) {
  const seen = new Map();
  const duplicates = [];
  const missingVersion = [];
  const missingSourceVersion = [];
  items.forEach((item, index) => {
    const name = normalizeValue(item?.name);
    const vendor = normalizeValue(item?.vendor);
    const version = normalizeValue(item?.version);
    if (!version) missingVersion.push({ id: item?.id ?? String(index), name: item?.name || '—' });
    if (normalizeValue(item?.sourcePackage) && !normalizeValue(item?.sourceVersion)) {
      missingSourceVersion.push({ id: item?.id ?? String(index), name: item?.name || '—', sourcePackage: item.sourcePackage });
    }
    const key = JSON.stringify([name, vendor, version]);
    if (name && seen.has(key)) duplicates.push({ id: item?.id ?? String(index), name: item?.name, firstIndex: seen.get(key) + 1, row: index + 1 });
    else if (name) seen.set(key, index);
  });
  return { missingVersion, missingSourceVersion, duplicates };
}
