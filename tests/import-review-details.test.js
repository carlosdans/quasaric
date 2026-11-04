import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('import review discloses when skipped-entry and warning details are truncated', async () => {
  const source = await readFile(new URL('../src/App.jsx', import.meta.url), 'utf8');
  assert.match(source, /pendingInventoryImport\.errors\.length > 12 \|\| pendingInventoryImport\.warnings\.length > 12/);
  assert.match(source, /Se muestran las primeras 12 entradas omitidas y 12 advertencias/);
  assert.match(source, /Showing the first 12 skipped entries and 12 warnings/);
  assert.match(source, /pendingInventoryImport\.errors\.length\} omitidas/);
  assert.match(source, /pendingInventoryImport\.warnings\.length\} warnings/);
  assert.match(source, /pendingInventoryImport\.errors\.slice\(0,12\)/);
  assert.match(source, /pendingInventoryImport\.warnings\.slice\(0,12\)/);
});
