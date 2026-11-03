import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('validated audit package preview explains severity, applicability and source coverage', async () => {
  const source = await readFile(new URL('../src/App.jsx', import.meta.url), 'utf8');
  assert.match(source, /audit-package-breakdowns/);
  assert.match(source, /summary\.severity/);
  assert.match(source, /summary\.applicability/);
  assert.match(source, /summary\.sourceStatuses/);
  assert.match(source, /summary\.queryErrors/);
  assert.match(source, /summary\.queryLimits/);
  assert.match(source, /correlation candidates, not proof of exploitation/);
  assert.match(source, /candidatos de correlación, no confirmaciones de explotación/);
});
