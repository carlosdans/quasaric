import test from 'node:test';
import assert from 'node:assert/strict';
import { loadInventory, saveInventory, INVENTORY_STORAGE_KEY, INVENTORY_RECOVERY_KEY } from './inventoryStorage.js';

function memoryStorage(entries = []) {
  const data = new Map(entries);
  return {
    getItem: key => data.has(key) ? data.get(key) : null,
    setItem: (key, value) => data.set(key, value),
    data
  };
}

test('loads a valid local inventory and saves updates', () => {
  const storage = memoryStorage([[INVENTORY_STORAGE_KEY, JSON.stringify([{ id: 'a', name: 'nginx' }])]]);
  assert.deepEqual(loadInventory(storage), { items: [{ id: 'a', name: 'nginx' }], warning: false });
  assert.equal(saveInventory([{ id: 'b', name: 'openssl' }], storage), true);
  assert.deepEqual(JSON.parse(storage.getItem(INVENTORY_STORAGE_KEY)), [{ id: 'b', name: 'openssl' }]);
});

test('preserves malformed inventory data for recovery instead of silently overwriting it', () => {
  const raw = '{malformed local inventory';
  const storage = memoryStorage([[INVENTORY_STORAGE_KEY, raw]]);
  assert.deepEqual(loadInventory(storage), { items: [], warning: true });
  assert.equal(storage.getItem(INVENTORY_RECOVERY_KEY), raw);
  assert.equal(storage.getItem(INVENTORY_STORAGE_KEY), raw);
});

test('preserves the original data when individual entries are invalid', () => {
  const raw = JSON.stringify([{ id: 'a', name: 'nginx' }, null, { name: '' }]);
  const storage = memoryStorage([[INVENTORY_STORAGE_KEY, raw]]);
  assert.deepEqual(loadInventory(storage), { items: [{ id: 'a', name: 'nginx' }], warning: true });
  assert.equal(storage.getItem(INVENTORY_RECOVERY_KEY), raw);
});

test('rejects invalid writes and handles quota or unavailable storage', () => {
  assert.equal(saveInventory([{ name: '' }], memoryStorage()), false);
  const full = { getItem: () => null, setItem: () => { throw new Error('quota exceeded'); } };
  assert.equal(saveInventory([{ name: 'nginx' }], full), false);
  assert.deepEqual(loadInventory(null), { items: [], warning: true });
});
