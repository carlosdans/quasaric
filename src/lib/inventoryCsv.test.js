import test from 'node:test';
import assert from 'node:assert/strict';
import { parseInventoryCsv } from './inventoryCsv.js';

test('parses the inventory CSV schema with BOM, CRLF and quoted commas', () => {
  const result = parseInventoryCsv('\uFEFFname,type,version,vendor,sourcePackage,sourceVersion,architecture\r\n"NGINX, Plus",web,1.25,"Example, Inc.",,,\r\nUbuntu,os,24.04,,,,amd64\r\n');
  assert.equal(result.errors.length, 0);
  assert.equal(result.components.length, 2);
  assert.equal(result.components[0].name, 'NGINX, Plus');
  assert.equal(result.components[0].vendor, 'Example, Inc.');
  assert.equal(result.components[1].architecture, 'amd64');
});

test('supports escaped quotes, optional columns and empty rows', () => {
  const result = parseInventoryCsv('name,vendor\n"Web ""Core""",Acme\n\nPHP,\n');
  assert.deepEqual(result.components.map(item => [item.name, item.type, item.vendor]), [
    ['Web "Core"', 'other', 'Acme'], ['PHP', 'other', '']
  ]);
});

test('reports invalid data rows while preserving valid rows', () => {
  const result = parseInventoryCsv('name,type,version\nNGINX,web,1.2\n,os,24.04\nUbuntu,unknown,24.04\nPHP,runtime\n');
  assert.equal(result.components.length, 1);
  assert.deepEqual(result.errors.map(error => error.row), [3, 4, 5]);
});

test('rejects malformed quoting, unsupported headers and missing name header', () => {
  assert.throws(() => parseInventoryCsv('name,type\n"NGINX,web'), /unterminated/);
  assert.throws(() => parseInventoryCsv('product,type\nNGINX,web'), /name column/);
  assert.throws(() => parseInventoryCsv('name,name\nNGINX,web'), /duplicate/);
  assert.throws(() => parseInventoryCsv('name,secret\nNGINX,x'), /unsupported columns/);
});

test('rejects text input that is not a string and empty files', () => {
  assert.throws(() => parseInventoryCsv(null), /must be text/);
  assert.throws(() => parseInventoryCsv(''), /empty/);
});

test('enforces safe size, row, column and field limits', () => {
  assert.throws(() => parseInventoryCsv('name\\n' + 'x'.repeat(5 * 1024 * 1024)), /5 MB/);
  assert.throws(() => parseInventoryCsv('name\\n' + Array.from({length: 50002}, (_, i) => 'item' + i).join('\\n')), /50000 data-row/);
  assert.throws(() => parseInventoryCsv(Array.from({length: 33}, (_, i) => i === 0 ? 'name' : 'x' + i).join(',') + '\\nitem' + ',x'.repeat(32)), /32-column/);
  assert.throws(() => parseInventoryCsv('name\\n' + 'x'.repeat(16385)), /field longer/);
});

test('rejects duplicate headers regardless of letter case', () => {
  assert.throws(() => parseInventoryCsv('name,Name\\nnginx,nginx'), /duplicate/);
});
