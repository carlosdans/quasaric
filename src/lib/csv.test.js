import test from 'node:test';
import assert from 'node:assert/strict';
import { toCsv } from './csv.js';

test('CSV uses a BOM and CRLF line endings', () => {
  const csv = toCsv([['name', 'version'], ['nginx', '1.24.0']]);
  assert.equal(csv.charCodeAt(0), 0xFEFF);
  assert.equal(csv, '\uFEFF"name","version"\r\n"nginx","1.24.0"');
});

test('CSV escapes quotes and preserves commas and embedded newlines', () => {
  const csv = toCsv([['description'], ['A "quoted", value\nnext line']]);
  assert.equal(csv, '\uFEFF"description"\r\n"A ""quoted"", value\nnext line"');
});

test('CSV converts nullish values to empty fields', () => {
  assert.equal(toCsv([['a', 'b'], [null, undefined]]), '\uFEFF"a","b"\r\n"",""');
});
