import test from 'node:test';
import assert from 'node:assert/strict';
import { compareDebianVersions } from './debianVersions.js';

test('compares numeric Debian revisions numerically', () => {
  assert.equal(compareDebianVersions('1.0-2ubuntu9', '1.0-2ubuntu10'), -1);
});

test('orders tilde before the corresponding release', () => {
  assert.equal(compareDebianVersions('1.0~rc1-1', '1.0-1'), -1);
});

test('compares epochs before upstream versions', () => {
  assert.equal(compareDebianVersions('2:1.0-1', '1:9.9-9'), 1);
});

test('compares upstream versions before Debian revisions', () => {
  assert.equal(compareDebianVersions('1.1-1', '1.0-99'), 1);
});

test('treats an omitted Debian revision as revision zero', () => {
  assert.equal(compareDebianVersions('1.0', '1.0-0'), 0);
});

test('handles Ubuntu update suffixes and ESM revisions', () => {
  assert.equal(compareDebianVersions('8.1.2-1ubuntu2.9', '8.1.2-1ubuntu2.10'), -1);
  assert.equal(compareDebianVersions('7.0.33-0ubuntu0.16.04.16+esm9', '7.0.33-0ubuntu0.16.04.16+esm10'), -1);
});

test('returns null for empty or invalid versions', () => {
  assert.equal(compareDebianVersions('', '1.0-1'), null);
  assert.equal(compareDebianVersions('not a version', '1.0-1'), null);
  assert.equal(compareDebianVersions('1.0-1', '1.0-'), null);
});
