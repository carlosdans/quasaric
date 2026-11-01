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
