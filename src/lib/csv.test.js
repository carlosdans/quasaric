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

test('CSV neutralizes spreadsheet formulas in untrusted values', () => {
  const csv = toCsv([
    ['name'],
    ['=HYPERLINK("https://example.invalid","open")'],
    ['+SUM(1,1)'],
    ['@cmd'],
    ['-1+2'],
    ['  =1+1'],
    ['\t=1+1'],
    ['\r=1+1'],
    ['\n=1+1']
  ]);
  assert.ok(csv.includes("\"'=HYPERLINK(\"\"https://example.invalid\"\",\"\"open\"\")\""));
  assert.ok(csv.includes("\"'+SUM(1,1)\""));
  assert.ok(csv.includes("\"'@cmd\""));
  assert.ok(csv.includes("\"'-1+2\""));
  assert.ok(csv.includes("\"'  =1+1\""));
  assert.ok(csv.includes("\"\t=1+1\"") === false);
  assert.ok(csv.includes("\"\r=1+1\"") === false);
  assert.ok(csv.includes("\"\n=1+1\"") === false);
  assert.ok(csv.includes("\"\t=1+1\"") === false);
  assert.ok(csv.includes("\"'\t=1+1\""));
  assert.ok(csv.includes("\"'\r=1+1\""));
  assert.ok(csv.includes("\"'\n=1+1\""));
});

test('CSV neutralizes formulas preceded by control characters or a BOM', () => {
  const values = ['\\u0000=1+1', '\\u001f+1+1', '\\u007f@cmd', '\\u009f-1+2', '\\uFEFF=1+1'];
  const csv = toCsv([['value'], ...values.map(value => [value])]);
  for (const value of values) {
    assert.ok(csv.includes('"' + "'" + value.replaceAll('"', '""') + '"'));
  }
});

test('CSV leaves ordinary text and positive numeric values unchanged', () => {
  assert.equal(toCsv([['name', 'value'], ['nginx', '1']]),
    '\uFEFF"name","value"\r\n"nginx","1"');
});
