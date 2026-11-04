import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const app = await readFile(new URL('../src/App.jsx', import.meta.url), 'utf8');

test('copy actions use a clipboard helper with a browser fallback', () => {
  assert.match(app, /export async function copyTextToClipboard\(value\)/);
  assert.match(app, /clipboard.*writeText\(text\)/);
  assert.match(app, /document\.execCommand\('copy'\)/);
  assert.match(app, /copyTextToClipboard\(command\)/);
  assert.match(app, /copyTextToClipboard\(item\.cmd\)/);
});
