import test from 'node:test';
import assert from 'node:assert/strict';
import { safeExternalUrl } from './externalUrl.js';

test('accepts absolute HTTPS links and normalizes them', () => {
  assert.equal(safeExternalUrl('https://example.com/advisory'), 'https://example.com/advisory');
  assert.equal(safeExternalUrl('HTTPS://EXAMPLE.COM/path'), 'https://example.com/path');
  assert.equal(safeExternalUrl('https://203.0.114.8/advisory'), 'https://203.0.114.8/advisory');
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

test('rejects local hostnames, private IPv4 ranges and IPv6 literals', () => {
  for (const value of [
    'https://localhost/advisory',
    'https://printer/advisory',
    'https://service.local/advisory',
    'https://vault.internal/advisory',
    'https://example.test/advisory',
    'https://127.0.0.1/advisory',
    'https://10.0.0.5/advisory',
    'https://172.16.0.1/advisory',
    'https://192.168.1.10/advisory',
    'https://169.254.169.254/latest/meta-data/',
    'https://100.64.0.1/advisory',
    'https://[::1]/advisory',
    'https://[fd00::1]/advisory'
  ]) assert.equal(safeExternalUrl(value), null, value);
});
