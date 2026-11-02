import test from 'node:test';
import assert from 'node:assert/strict';
import { createInventoryBackup, parseInventoryBackup, compareInventories } from './inventoryBackup.js';

test('round-trips versioned backup including SBOM identifiers', () => {
  const component = { id: 'a', name: 'NGINX', type: 'web', version: '1.25', vendor: 'F5', purl: 'pkg:deb/debian/nginx@1.25', cpe: 'cpe:2.3:a:nginx:nginx:1.25:*:*:*:*:*:*:*' };
  const restored = parseInventoryBackup(createInventoryBackup([component])).components[0];
  assert.equal(restored.id, 'a');
  assert.equal(restored.name, 'NGINX');
  assert.equal(restored.version, '1.25');
  assert.equal(restored.vendor, 'F5');
  assert.equal(restored.purl, component.purl);
  assert.equal(restored.cpe, component.cpe);
  assert.equal(restored.sourcePackage, '');
});

test('remains backwards-compatible and rejects malformed backups', () => {
  assert.throws(() => parseInventoryBackup('{'), /Invalid JSON/);
  assert.throws(() => parseInventoryBackup({ format: 'other', version: 1, components: [] }), /Unsupported/);
  const restored = parseInventoryBackup({ format: 'quasaric-inventory', version: 1, components: Array.from({ length: 25 }, (_, i) => ({ name: 'component-' + i })) });
  assert.equal(restored.components.length, 25);
  assert.equal(restored.components[0].purl, '');
  assert.throws(() => parseInventoryBackup({ format: 'quasaric-inventory', version: 1, components: [{ name: '' }] }), /Invalid component/);
  assert.throws(() => parseInventoryBackup({ format: 'quasaric-inventory', version: 1, components: [{ name: 'nginx', purl: 4 }] }), /Invalid component/);
});

test('rejects oversized and excessive-component backups before mapping', () => {
  const base = { format: 'quasaric-inventory', version: 1, components: [] };
  assert.throws(() => parseInventoryBackup(' '.repeat(10 * 1024 * 1024 + 1)), /10 MB/);
  assert.throws(() => parseInventoryBackup({ ...base, components: Array(50001).fill({ name: 'nginx' }) }), /50000/);
  assert.throws(() => createInventoryBackup(Array(50001).fill({ name: 'nginx' })), /50000/);
});

test('compares SBOM identifiers as part of component identity', () => {
  const original = { name: 'A', version: '1', purl: 'pkg:npm/a@1' };
  const changed = { ...original, purl: 'pkg:npm/a@2' };
  const diff = compareInventories([original], [changed]);
  assert.equal(diff.added.length, 1);
  assert.equal(diff.removed.length, 1);
  assert.equal(diff.unchanged.length, 0);
});

test('compares additions, removals and unchanged entries', () => {
  const diff = compareInventories([{ name: 'A', version: '1' }, { name: 'B', version: '1' }], [{ name: 'A', version: '1' }, { name: 'C', version: '2' }]);
  assert.equal(diff.added[0].name, 'C');
  assert.equal(diff.removed[0].name, 'B');
  assert.equal(diff.unchanged[0].name, 'A');
});


test('enforces the byte limit for object inputs and newly created backups', () => {
  const large = { name: 'nginx', description: '😀'.repeat(3 * 1024 * 1024) };
  const backup = { format: 'quasaric-inventory', version: 1, components: [large] };
  assert.throws(() => parseInventoryBackup(backup), /10 MB/);
  assert.throws(() => createInventoryBackup([large]), /10 MB/);
});

test('rejects non-serializable object backups and non-object roots', () => {
  const cyclic = { format: 'quasaric-inventory', version: 1, components: [] };
  cyclic.self = cyclic;
  assert.throws(() => parseInventoryBackup(cyclic), /serializable JSON/);
  assert.throws(() => parseInventoryBackup([]), /Unsupported/);
});


test('rejects invalid or oversized optional metadata instead of silently dropping it', () => {
  const base = { format: 'quasaric-inventory', version: 1 };
  for (const field of ['version', 'vendor', 'sourcePackage', 'sourceVersion', 'architecture']) {
    assert.throws(() => parseInventoryBackup({ ...base, components: [{ name: 'nginx', [field]: 42 }] }), /Invalid component/);
    assert.throws(() => parseInventoryBackup({ ...base, components: [{ name: 'nginx', [field]: 'x'.repeat(16385) }] }), /Invalid component/);
  }
  assert.throws(() => parseInventoryBackup({ ...base, components: [{ name: 'x'.repeat(16385) }] }), /Invalid component/);
  assert.throws(() => parseInventoryBackup({ ...base, components: [{ name: 'nginx', type: 42 }] }), /Invalid component/);
});


test('compares duplicate inventory entries as a multiset without losing rows', () => {
  const first = { name: 'nginx', type: 'web', version: '1.25' };
  const second = { ...first };
  const diff = compareInventories([first, second], [first]);
  assert.equal(diff.added.length, 0);
  assert.equal(diff.removed.length, 1);
  assert.equal(diff.unchanged.length, 1);
  assert.equal(diff.removed[0], second);
});

test('comparison keys cannot collide when metadata contains separators', () => {
  const previous = [{ name: 'a|b', version: 'c' }];
  const current = [{ name: 'a', version: 'b|c' }];
  const diff = compareInventories(previous, current);
  assert.equal(diff.added.length, 1);
  assert.equal(diff.removed.length, 1);
  assert.equal(diff.unchanged.length, 0);
});


test('round-trips explicit SBOM source relationship metadata in local backups', () => {
  const component = {
    id: 'binary', name: 'openssl-libs', type: 'library', version: '3.0.7-1',
    sourcePackage: 'openssl', sourceVersion: '3.0.7-1',
    sourceRelationship: 'spdx_generated_from', sourceRef: 'SPDXRef-openssl-src',
    sourcePurl: 'pkg:rpm/openssl@3.0.7-1?arch=src'
  };
  const restored = parseInventoryBackup(createInventoryBackup([component])).components[0];
  for (const field of ['sourcePackage', 'sourceVersion', 'sourceRelationship', 'sourceRef', 'sourcePurl']) {
    assert.equal(restored[field], component[field]);
  }
});


test('rejects malformed component and source PURLs in restored backups', () => {
  const base = { format: 'quasaric-inventory', version: 1 };
  for (const field of ['purl', 'sourcePurl']) {
    assert.throws(
      () => parseInventoryBackup({ ...base, components: [{ name: 'nginx', [field]: 'pkg:rpm/%ZZ' }] }),
      /Invalid component/
    );
  }
  const restored = parseInventoryBackup({
    ...base,
    components: [{ name: 'nginx', purl: '', sourcePurl: '' }]
  });
  assert.equal(restored.components.length, 1);
});

test('does not create backups that cannot be restored', () => {
  assert.throws(() => createInventoryBackup([{ name: '' }]), /Invalid component at position 1/);
  assert.throws(() => createInventoryBackup([{ name: 'nginx', purl: 'not-a-purl' }]), /Invalid component at position 1/);
  assert.throws(() => createInventoryBackup([{ name: 'nginx', type: 'unsupported' }]), /Invalid component at position 1/);
});
