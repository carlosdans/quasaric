import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('finding details expose source context and only validated reference links', async () => {
  const source = await readFile(new URL('../src/App.jsx', import.meta.url), 'utf8');
  assert.match(source, /evidence\.reason \|\| evidence\.description/);
  assert.match(source, /evidence\.fixedVersion/);
  assert.match(source, /evidence\.published/);
  assert.match(source, /evidence\.modified/);
  assert.match(source, /\.map\(safeExternalUrl\)\.filter\(Boolean\)/);
  assert.match(source, /finding-evidence-references/);
});
