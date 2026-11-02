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
  assert.deepEqual(loadInventory(storage), { items: [{ name: 'curl', version: '8.5.0', id: 'recovered-1' }], warning: true });
  assert.equal(storage.getItem(INVENTORY_RECOVERY_KEY), raw);
});

test('rejects inventory objects whose serialized representation is invalid', () => {
  const storage = memoryStorage();
  const item = {
    name: 'nginx',
    toJSON() { return { name: 'nginx', version: 42 }; }
  };
  assert.equal(saveInventory([item], storage), false);
  assert.equal(storage.getItem(INVENTORY_STORAGE_KEY), null);

  const omitted = {
    name: 'nginx',
    toJSON() { return { version: '1.26.0' }; }
  };
  assert.equal(saveInventory([omitted], storage), false);
  assert.equal(storage.getItem(INVENTORY_STORAGE_KEY), null);
});


test('preserves and validates explicit SBOM source relationship metadata', () => {
  const storage = memoryStorage();
  const component = {
    id: 'openssl-libs-id', name: 'openssl-libs', type: 'library', version: '3.0.7',
    sourcePackage: 'openssl', sourceVersion: '3.0.7-1',
    sourceRelationship: 'spdx_generated_from', sourceRef: 'SPDXRef-source',
    sourcePurl: 'pkg:rpm/openssl@3.0.7-1?arch=src'
  };
  assert.equal(saveInventory([component], storage), true);
  const loaded = loadInventory(storage);
  assert.equal(loaded.warning, false);
  for (const field of ['sourcePackage', 'sourceVersion', 'sourceRelationship', 'sourceRef', 'sourcePurl']) {
    assert.equal(loaded.items[0][field], component[field]);
  }
  assert.equal(saveInventory([{ ...component, sourceRef: 'x'.repeat(2049) }], storage), false);
  assert.equal(saveInventory([{ ...component, sourceRelationship: 42 }], storage), false);
});


test('rejects invalid PURLs on save and preserves invalid stored rows for recovery', () => {
  const storage = memoryStorage();
  assert.equal(saveInventory([{ name: 'nginx', purl: 'pkg:rpm/%ZZ' }], storage), false);
  assert.equal(saveInventory([{ name: 'nginx', sourcePurl: 'not-a-purl' }], storage), false);
  const raw = JSON.stringify([
    { name: 'nginx', purl: 'pkg:rpm/%ZZ' },
    { name: 'curl', purl: 'pkg:generic/curl@8.5.0' }
  ]);
  const stored = memoryStorage([[INVENTORY_STORAGE_KEY, raw]]);
  assert.deepEqual(loadInventory(stored), {
    items: [{ name: 'curl', purl: 'pkg:generic/curl@8.5.0', id: 'recovered-1' }],
    warning: true
  });
  assert.equal(stored.getItem(INVENTORY_RECOVERY_KEY), raw);
});

test('handles browsers where accessing localStorage itself throws', () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  try {
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      get() { throw new Error('storage access blocked'); }
    });
    assert.deepEqual(loadInventory(), { items: [], warning: true });
    assert.equal(saveInventory([{ name: 'nginx' }]), false);
  } finally {
    if (descriptor) Object.defineProperty(globalThis, 'localStorage', descriptor);
    else delete globalThis.localStorage;
  }
});

test('repairs duplicate or missing component IDs without losing inventory rows', () => {
  const raw = JSON.stringify([
    { id: 'same-id', name: 'nginx' },
    { id: 'same-id', name: 'curl' },
    { name: 'openssl' }
  ]);
  const storage = memoryStorage([[INVENTORY_STORAGE_KEY, raw]]);
  const result = loadInventory(storage);
  assert.equal(result.warning, true);
  assert.equal(result.items.length, 3);
  assert.equal(result.items[0].id, 'same-id');
  assert.notEqual(result.items[1].id, 'same-id');
  assert.ok(result.items[1].id);
  assert.ok(result.items[2].id);
  assert.equal(new Set(result.items.map(item => item.id)).size, 3);
  assert.equal(storage.getItem(INVENTORY_RECOVERY_KEY), raw);
  assert.equal(saveInventory(result.items, storage), true);
});

test('rejects saving duplicate non-empty component IDs', () => {
  const storage = memoryStorage();
  assert.equal(saveInventory([
    { id: 'duplicate', name: 'nginx' },
    { id: 'duplicate', name: 'curl' }
  ], storage), false);
  assert.equal(storage.getItem(INVENTORY_STORAGE_KEY), null);
});

test('does not assign a generated ID that belongs to a later valid row', () => {
  const storage = memoryStorage([[INVENTORY_STORAGE_KEY, JSON.stringify([
    { name: 'nginx' },
    { id: 'recovered-2', name: 'curl' }
  ])]]);
  const result = loadInventory(storage);
  assert.equal(result.items[1].id, 'recovered-2');
  assert.notEqual(result.items[0].id, result.items[1].id);
});
