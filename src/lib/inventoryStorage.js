import { parsePackageUrl } from './packageUrl.js';

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
    (item.id == null || (typeof item.id === 'string' && item.id.trim().length > 0 && item.id.length <= MAX_IDENTIFIER_LENGTH)) &&
    typeof item.name === 'string' && item.name.trim().length > 0 &&
    STRING_FIELDS.every(field => item[field] == null ||
      (typeof item[field] === 'string' && item[field].length <= MAX_FIELD_LENGTH)) &&
    ['purl', 'cpe', 'sourceRef', 'sourcePurl'].every(field => item[field] == null ||
      (typeof item[field] === 'string' && item[field].length <= MAX_IDENTIFIER_LENGTH)) &&
    ['purl', 'sourcePurl'].every(field => !item[field] || parsePackageUrl(item[field]) !== null);
}

/**
 * Read browser-local inventory without silently discarding malformed data.
 * A recoverable copy of the original serialized value is kept before the
 * application proceeds with the valid entries.
 */
export function loadInventory(storage) {
  try {
    const target = storage === undefined ? globalThis.localStorage : storage;
    if (!target) return { items: [], warning: true };
    const raw = target.getItem(INVENTORY_STORAGE_KEY);
    if (raw == null || raw === '') return { items: [], warning: false };
    if (!withinByteLimit(raw)) {
      preserveForRecovery(target, raw);
      return { items: [], warning: true };
    }
    let parsed;
    try { parsed = JSON.parse(raw); }
    catch {
      preserveForRecovery(target, raw);
      return { items: [], warning: true };
    }
    if (!Array.isArray(parsed) || parsed.length > MAX_INVENTORY_COMPONENTS) {
      preserveForRecovery(target, raw);
      return { items: [], warning: true };
    }
    const validItems = parsed.filter(isInventoryItem);
    const items = [];
    const seenIds = new Set();
    // Reserve every original ID before generating replacements so a missing
    // or duplicate row never steals an ID belonging to a later valid row.
    const reservedIds = new Set(validItems
      .map(item => typeof item.id === 'string' && item.id.trim() ? item.id : null)
      .filter(Boolean));
    let duplicateIds = false;
    for (let index = 0; index < validItems.length; index += 1) {
      const item = validItems[index];
      let id = typeof item.id === 'string' && item.id.trim() ? item.id : null;
      if (id && seenIds.has(id)) {
        duplicateIds = true;
        id = null;
      }
      if (!id) {
        let suffix = index + 1;
        id = `recovered-${suffix}`;
        while (reservedIds.has(id) || seenIds.has(id)) {
          suffix += 1;
          id = `recovered-${suffix}`;
        }
      }
      seenIds.add(id);
      items.push(item.id === id ? item : { ...item, id });
    }
    const warning = items.length !== parsed.length || duplicateIds ||
      validItems.some(item => typeof item.id !== 'string' || !item.id.trim());
    if (warning) {
      preserveForRecovery(target, raw);
    }
    return { items, warning };
  } catch { return { items: [], warning: true }; }
}

export function saveInventory(items, storage) {
  if (!Array.isArray(items) || !items.every(isInventoryItem)) return false;
  if (items.length > MAX_INVENTORY_COMPONENTS) return false;
  try {
    const target = storage === undefined ? globalThis.localStorage : storage;
    if (!target) return false;
    const serialized = JSON.stringify(items);
    if (typeof serialized !== 'string' || !withinByteLimit(serialized)) return false;
    // Validate the exact JSON representation that will be persisted. This
    // prevents custom toJSON methods or unusual object values from bypassing
    // the inventory shape checks performed on the original input.
    const normalized = JSON.parse(serialized);
    if (!Array.isArray(normalized) || normalized.length > MAX_INVENTORY_COMPONENTS ||
        !normalized.every(isInventoryItem)) return false;
    const ids = normalized.map(item => item.id).filter(id => typeof id === 'string' && id.trim());
    if (new Set(ids).size !== ids.length) return false;
    target.setItem(INVENTORY_STORAGE_KEY, serialized);
    return true;
  } catch { return false; }
}
