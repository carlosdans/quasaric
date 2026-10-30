import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyCpeApplicability } from './correlation.js';

const php = version => ({ name: 'PHP', version });
const range = (fields = {}) => ({
  criteria: 'cpe:2.3:a:php:php:*:*:*:*:*:*:*:*',
  vulnerable: true,
  ...fields
});

test('includes both endpoints of an inclusive affected version range', () => {
  const cpes = [range({ versionStartIncluding: '8.1', versionEndIncluding: '8.3' })];
  for (const version of ['8.1', '8.2', '8.3']) {
    assert.equal(classifyCpeApplicability(cpes, php(version)).status, 'possible', version);
  }
});

test('excludes the lower endpoint of an exclusive start range', () => {
  const cpes = [range({ versionStartExcluding: '8.1', versionEndIncluding: '8.3' })];
  assert.equal(classifyCpeApplicability(cpes, php('8.1')).status, 'needs_review');
  assert.equal(classifyCpeApplicability(cpes, php('8.1.1')).status, 'possible');
});

test('excludes the upper endpoint of an exclusive end range', () => {
  const cpes = [range({ versionStartIncluding: '8.1', versionEndExcluding: '8.3' })];
  assert.equal(classifyCpeApplicability(cpes, php('8.3')).status, 'needs_review');
  assert.equal(classifyCpeApplicability(cpes, php('8.2.9')).status, 'possible');
});

test('requires an exact match when the CPE contains a concrete version', () => {
  const cpes = [{ criteria: 'cpe:2.3:a:php:php:8.2:*:*:*:*:*:*:*', vulnerable: true }];
  assert.equal(classifyCpeApplicability(cpes, php('8.2')).status, 'possible');
  assert.equal(classifyCpeApplicability(cpes, php('8.2.1')).status, 'needs_review');
});

test('does not treat a non-vulnerable CPE match as affected', () => {
  const cpes = [range({ vulnerable: false })];
  assert.equal(classifyCpeApplicability(cpes, php('8.2')).status, 'needs_review');
});

test('does not infer applicability when the version is missing', () => {
  assert.equal(classifyCpeApplicability([range()], { name: 'PHP' }).status, 'version_missing');
});

test('does not apply a PHP CPE range to another product', () => {
  assert.equal(classifyCpeApplicability([range()], { name: 'Python', version: '8.2' }).status, 'needs_review');
});
