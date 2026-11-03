import test from 'node:test';
import assert from 'node:assert/strict';
import { isValidCveId } from './cveId.js';

test('accepts legacy CVE sequence lengths assigned before 2014', () => {
  for (const id of ['CVE-1999-1', 'CVE-2002-123', 'CVE-2013-1234']) {
    assert.equal(isValidCveId(id), true, id);
  }
});

test('requires at least four sequence digits from 2014 onward', () => {
  for (const id of ['CVE-2014-1', 'CVE-2025-123', 'CVE-2026-999']) {
    assert.equal(isValidCveId(id), false, id);
  }
  for (const id of ['CVE-2014-0001', 'CVE-2025-12345', 'CVE-2026-10001']) {
    assert.equal(isValidCveId(id), true, id);
  }
});

test('rejects invalid years, zero sequences and non-canonical identifiers', () => {
  for (const id of [
    'CVE-1998-0001', 'CVE-2025-0000', 'cve-2025-12345',
    ' CVE-2025-12345', 'CVE-2025-12345 ', 'CVE-25-1234', null, 123
  ]) assert.equal(isValidCveId(id), false, String(id));
});

test('rejects legacy identifiers with more than four sequence digits', () => {
  assert.equal(isValidCveId('CVE-2013-12345'), false);
});
