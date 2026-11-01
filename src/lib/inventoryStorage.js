export const INVENTORY_STORAGE_KEY = 'quasaric-inventory';
export const INVENTORY_RECOVERY_KEY = 'quasaric-inventory-recovery';

function isInventoryItem(item) {
  return item !== null && typeof item === 'object' && !Array.isArray(item) &&
    typeof item.name === 'string' && item.name.trim().length > 0;
}

/**
 * Read browser-local inventory without silently discarding malformed data.
 * A recoverable copy of the original serialized value is kept before the
 * application proceeds with the valid entries.
 */
export function loadInventory(storage = globalThis.localStorage) {
  try {
    const raw = storage?.getItem(INVENTORY_STORAGE_KEY);
    if (raw == null || raw === '') return { items: [], warning: false };
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      try { storage?.setItem(INVENTORY_RECOVERY_KEY, raw); } catch { /* best effort */ }
      return { items: [], warning: true };
    }
    if (!Array.isArray(parsed)) {
      try { storage?.setItem(INVENTORY_RECOVERY_KEY, raw); } catch { /* best effort */ }
      return { items: [], warning: true };
    }
    const items = parsed.filter(isInventoryItem);
    const warning = items.length !== parsed.length;
    if (warning) {
      try { storage?.setItem(INVENTORY_RECOVERY_KEY, raw); } catch { /* best effort */ }
    }
    return { items, warning };
  } catch {
    return { items: [], warning: true };
  }
}

export function saveInventory(items, storage = globalThis.localStorage) {
  if (!Array.isArray(items) || !items.every(isInventoryItem)) return false;
  try {
    if (!storage) return false;
    storage.setItem(INVENTORY_STORAGE_KEY, JSON.stringify(items));
    return true;
  } catch {
    return false;
  }
}
