export const INVENTORY_STORAGE_KEY = 'quasaric-inventory';
export const INVENTORY_RECOVERY_KEY = 'quasaric-inventory-recovery';
export const MAX_INVENTORY_BYTES = 10 * 1024 * 1024;
export const MAX_INVENTORY_COMPONENTS = 50000;
const MAX_IDENTIFIER_LENGTH = 2048;
const MAX_FIELD_LENGTH = 16384;
const STRING_FIELDS = ['name', 'type', 'version', 'vendor', 'sourcePackage', 'sourceVersion', 'architecture', 'sourceRelationship'];

function withinByteLimit(value) {
  return new TextEncoder().encode(value).byteLength <= MAX_INVENTORY_BYTES;
}

function preserveForRecovery(storage, raw) {
  try { storage?.setItem(INVENTORY_RECOVERY_KEY, raw); } catch { /* best effort */ }
}

function isInventoryItem(item) {
  return item !== null && typeof item === 'object' && !Array.isArray(item) &&
    typeof item.name === 'string' && item.name.trim().length > 0 &&
    STRING_FIELDS.every(field => item[field] == null ||
      (typeof item[field] === 'string' && item[field].length <= MAX_FIELD_LENGTH)) &&
    ['purl', 'cpe', 'sourceRef', 'sourcePurl'].every(field => item[field] == null ||
      (typeof item[field] === 'string' && item[field].length <= MAX_IDENTIFIER_LENGTH));
}

/**
 * Read browser-local inventory without silently discarding malformed data.
 * A recoverable copy of the original serialized value is kept before the
 * application proceeds with the valid entries.
 */
export function loadInventory(storage = globalThis.localStorage) {
  if (!storage) return { items: [], warning: true };
  try {
    const raw = storage?.getItem(INVENTORY_STORAGE_KEY);
    if (raw == null || raw === '') return { items: [], warning: false };
    if (!withinByteLimit(raw)) {
      preserveForRecovery(storage, raw);
      return { items: [], warning: true };
    }
    let parsed;
    try { parsed = JSON.parse(raw); }
    catch {
      preserveForRecovery(storage, raw);
      return { items: [], warning: true };
    }
    if (!Array.isArray(parsed) || parsed.length > MAX_INVENTORY_COMPONENTS) {
      preserveForRecovery(storage, raw);
      return { items: [], warning: true };
    }
    const items = parsed.filter(isInventoryItem);
    const warning = items.length !== parsed.length;
    if (warning) {
      preserveForRecovery(storage, raw)
    }
    return { items, warning };
  } catch { return { items: [], warning: true }; }
}

export function saveInventory(items, storage = globalThis.localStorage) {
  if (!Array.isArray(items) || !items.every(isInventoryItem)) return false;
  if (items.length > MAX_INVENTORY_COMPONENTS) return false;
  try {
    if (!storage) return false;
    const serialized = JSON.stringify(items);
    if (typeof serialized !== 'string' || !withinByteLimit(serialized)) return false;
    // Validate the exact JSON representation that will be persisted. This
    // prevents custom toJSON methods or unusual object values from bypassing
    // the inventory shape checks performed on the original input.
    const normalized = JSON.parse(serialized);
    if (!Array.isArray(normalized) || normalized.length > MAX_INVENTORY_COMPONENTS ||
        !normalized.every(isInventoryItem)) return false;
    storage.setItem(INVENTORY_STORAGE_KEY, serialized);
    return true;
  } catch { return false; }
}
