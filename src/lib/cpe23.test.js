import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCpe23 } from './cpe23.js';

test('parses a complete CPE 2.3 formatted string', () => {
  const parsed = parseCpe23('cpe:2.3:a:openssl:openssl:3.0.2:*:*:*:*:*:*:*');
  assert.equal(parsed.part, 'a');
  assert.equal(parsed.vendor, 'openssl');
  assert.equal(parsed.product, 'openssl');
  assert.equal(parsed.version, '3.0.2');
  assert.equal(parsed.other, '*');
});

test('accepts escaped delimiters without splitting CPE attributes', () => {
  const parsed = parseCpe23('cpe:2.3:a:vendor:product\\:edition:1.0:*:*:*:*:*:*:*');
  assert.equal(parsed.product, 'product:edition');
  assert.equal(parsed.version, '1.0');
});

test('accepts the CPE formatted-string escaped punctuation set', () => {
  const parsed = parseCpe23('cpe:2.3:a:vendor:product\\?edition:1.0:*:*:*:*:*:*:*');
  assert.equal(parsed.product, 'product?edition');
  assert.equal(parseCpe23('cpe:2.3:a:vendor:product\\\\edition:1.0:*:*:*:*:*:*:*').product, 'product\\edition');
});

test('accepts escaped hyphen, dot and underscore', () => {
  for (const escaped of ['-', '.', '_']) {
    const parsed = parseCpe23('cpe:2.3:a:vendor:product\\' + escaped + 'edition:1.0:*:*:*:*:*:*:*');
    assert.equal(parsed.product, 'product' + escaped + 'edition');
  }
});

test('rejects escaped spaces and alphanumeric characters', () => {
  for (const escaped of [' ', 'a', 'z', '0']) {
    assert.equal(
      parseCpe23('cpe:2.3:a:vendor:product\\' + escaped + 'edition:1.0:*:*:*:*:*:*:*'),
      null,
      JSON.stringify(escaped)
    );
  }
  assert.equal(parseCpe23('cpe:2.3:a:vendor:product edition:1.0:*:*:*:*:*:*:*'), null);
});

test('accepts valid wildcard and not-applicable bindings', () => {
  assert.equal(parseCpe23('cpe:2.3:o:*:*:*:*:*:*:*:*:*:*').part, 'o');
  assert.equal(parseCpe23('cpe:2.3:h:vendor:device:-:*:*:*:*:*:*:*').version, '-');
});

test('rejects malformed, incomplete, unsupported and unsafe CPE strings', () => {
  for (const value of [
    '', null, 'cpe:2.2:a:v:p:1:*:*:*:*:*:*:*',
    'cpe:2.3:x:v:p:1:*:*:*:*:*:*:*',
    'cpe:2.3:a:v:p:1:*:*:*:*:*:*',
    'cpe:2.3:a:v:p:1:*:*:*:*:*:*:*:extra',
    'cpe:2.3:a:v:p:1:*:*:*:*:*:*:*\\',
    'cpe:2.3:a:v:p:1 bad:*:*:*:*:*:*:*'
  ]) assert.equal(parseCpe23(value), null, String(value));
});

test('rejects CPE values beyond the identifier size limit', () => {
  assert.equal(parseCpe23('cpe:2.3:a:' + 'v'.repeat(2040)), null);
});
