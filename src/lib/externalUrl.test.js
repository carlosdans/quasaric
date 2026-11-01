import test from 'node:test';
import assert from 'node:assert/strict';
import { safeExternalUrl } from './externalUrl.js';

test('accepts absolute HTTPS links and normalizes them', () => {
  assert.equal(safeExternalUrl('https://example.com/advisory'), 'https://example.com/advisory');
  assert.equal(safeExternalUrl('HTTPS://EXAMPLE.COM/path'), 'https://example.com/path');
});

test('rejects script and non-HTTPS URL schemes', () => {
  for (const value of [
    'javascript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'http://example.com/advisory',
    '//example.com/advisory',
    '/relative/path'
  ]) assert.equal(safeExternalUrl(value), null, value);
});

test('rejects malformed, empty, non-string and credential-bearing URLs', () => {
  for (const value of [null, undefined, '', '   ', 42, 'https://user:pass@example.com/']) {
    assert.equal(safeExternalUrl(value), null);
  }
});
