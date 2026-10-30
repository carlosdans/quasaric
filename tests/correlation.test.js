import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyCpeApplicability } from '../src/lib/correlation.js';

const cpe = (criteria, extra = {}) => ({ criteria, vulnerable: true, ...extra });

test('matches an exact NGINX CPE product and version', () => {
  const result = classifyCpeApplicability(
    [cpe('cpe:2.3:a:nginx:nginx:1.24.0:*:*:*:*:*:*:*')],
    { name: 'NGINX', version: '1.24.0' }
  );
  assert.equal(result.status, 'possible');
});

test('does not match a different product with a similar name', () => {
  const result = classifyCpeApplicability(
    [cpe('cpe:2.3:a:nginx:nginx_plus:1.24.0:*:*:*:*:*:*:*')],
    { name: 'NGINX', version: '1.24.0' }
  );
  assert.equal(result.status, 'needs_review');
});

test('checks inclusive and exclusive version boundaries', () => {
  const range = [cpe('cpe:2.3:a:nginx:nginx:*:*:*:*:*:*:*:*', {
    versionStartIncluding: '1.20.0',
    versionEndExcluding: '1.25.0'
  })];
  assert.equal(classifyCpeApplicability(range, { name: 'nginx', version: '1.24.9' }).status, 'possible');
  assert.equal(classifyCpeApplicability(range, { name: 'nginx', version: '1.25.0' }).status, 'needs_review');
  assert.equal(classifyCpeApplicability(range, { name: 'nginx', version: '1.19.9' }).status, 'needs_review');
});

test('requires an exact supplied version', () => {
  const result = classifyCpeApplicability(
    [cpe('cpe:2.3:a:nginx:nginx:*:*:*:*:*:*:*:*')],
    { name: 'nginx', version: '' }
  );
  assert.equal(result.status, 'version_missing');
});

test('does not classify non-vulnerable CPE matches as affected', () => {
  const result = classifyCpeApplicability(
    [cpe('cpe:2.3:a:nginx:nginx:*:*:*:*:*:*:*:*', { vulnerable: false })],
    { name: 'nginx', version: '1.24.0' }
  );
  assert.equal(result.status, 'needs_review');
});
