import test from 'node:test';
import assert from 'node:assert/strict';
import { loadInventory, saveInventory, INVENTORY_STORAGE_KEY, INVENTORY_RECOVERY_KEY } from './inventoryStorage.js';

function memoryStorage(entries = []) {
  const data = new Map(entries);
  return { getItem: key => data.has(key) ? data.get(key) : null, setItem: (key, value) => data.set(key, value), data };
}

test('loads and saves inventory including SBOM identifiers', () => {
  const item = { id: 'a', name: 'nginx', purl: 'pkg:deb/debian/nginx@1.26.0', cpe: 'cpe:2.3:a:nginx:nginx:1.26.0:*:*:*:*:*:*:*' };
  const storage = memoryStorage([[INVENTORY_STORAGE_KEY, JSON.stringify([item])]]);
  assert.deepEqual(loadInventory(storage), { items: [item], warning: false });
  assert.equal(saveInventory([{ ...item, id: 'b' }], storage), true);
  assert.deepEqual(JSON.parse(storage.getItem(INVENTORY_STORAGE_KEY)), [{ ...item, id: 'b' }]);
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

test('rejects invalid identifier metadata and handles quota or unavailable storage', () => {
  assert.equal(saveInventory([{ name: '' }], memoryStorage()), false);
  assert.equal(saveInventory([{ name: 'nginx', purl: 42 }], memoryStorage()), false);
  assert.equal(saveInventory([{ name: 'nginx', cpe: 'x'.repeat(2049) }], memoryStorage()), false);
  const full = { getItem: () => null, setItem: () => { throw new Error('quota exceeded'); } };
  assert.equal(saveInventory([{ name: 'nginx' }], full), false);
  assert.deepEqual(loadInventory(null), { items: [], warning: true });
});


test('rejects inventories exceeding the component limit on load and save', async () => {
  const { MAX_INVENTORY_COMPONENTS } = await import('./inventoryStorage.js');
  const oversized = Array.from({ length: MAX_INVENTORY_COMPONENTS + 1 }, (_, i) => ({ id: String(i), name: 'package' }));
  const raw = JSON.stringify(oversized);
  const storage = memoryStorage([[INVENTORY_STORAGE_KEY, raw]]);
  assert.deepEqual(loadInventory(storage), { items: [], warning: true });
  assert.equal(storage.getItem(INVENTORY_RECOVERY_KEY), raw);
  assert.equal(saveInventory(oversized, memoryStorage()), false);
});

test('rejects oversized serialized inventories and preserves oversized stored data', async () => {
  const { MAX_INVENTORY_BYTES } = await import('./inventoryStorage.js');
  const oversizedItem = { name: 'package', description: 'x'.repeat(MAX_INVENTORY_BYTES) };
  assert.equal(saveInventory([oversizedItem], memoryStorage()), false);
  const raw = JSON.stringify([{ name: 'package', description: 'x'.repeat(MAX_INVENTORY_BYTES) }]);
  const storage = memoryStorage([[INVENTORY_STORAGE_KEY, raw]]);
  assert.deepEqual(loadInventory(storage), { items: [], warning: true });
  assert.equal(storage.getItem(INVENTORY_RECOVERY_KEY), raw);
});


test('rejects non-string and oversized inventory metadata fields', () => {
  const storage = memoryStorage();
  for (const field of ['type', 'version', 'vendor', 'sourcePackage', 'sourceVersion', 'architecture']) {
    assert.equal(saveInventory([{ name: 'nginx', [field]: 42 }], storage), false, field);
    assert.equal(saveInventory([{ name: 'nginx', [field]: 'x'.repeat(16385) }], storage), false, field);
  }
  assert.equal(saveInventory([{ name: 'x'.repeat(16385) }], storage), false);
  assert.equal(saveInventory([{ name: 'nginx', version: '1.26.0', architecture: 'amd64' }], storage), true);
});

test('preserves legacy entries with invalid optional field metadata for recovery', () => {
  const raw = JSON.stringify([{ name: 'nginx', version: 42 }, { name: 'curl', version: '8.5.0' }]);
  const storage = memoryStorage([[INVENTORY_STORAGE_KEY, raw]]);
  assert.deepEqual(loadInventory(storage), { items: [{ name: 'curl', version: '8.5.0' }], warning: true });
  assert.equal(storage.getItem(INVENTORY_RECOVERY_KEY), raw);
});
