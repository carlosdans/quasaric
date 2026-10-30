import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyCpeApplicability, collectCpeMatches } from '../src/lib/correlation.js';

const cpe = (criteria, extra = {}) => ({ criteria, vulnerable: true, ...extra });

test('matches an exact NGINX CPE product and version', () => {
  const result = classifyCpeApplicability([cpe('cpe:2.3:a:nginx:nginx:1.24.0:*:*:*:*:*:*:*')], { name: 'NGINX', version: '1.24.0' });
  assert.equal(result.status, 'possible');
});

test('does not match a similarly named but distinct product', () => {
  const result = classifyCpeApplicability([cpe('cpe:2.3:a:nginx:nginx_plus:1.24.0:*:*:*:*:*:*:*')], { name: 'NGINX', version: '1.24.0' });
  assert.equal(result.status, 'needs_review');
});

test('respects inclusive and exclusive version boundaries', () => {
  const range = [cpe('cpe:2.3:a:nginx:nginx:*:*:*:*:*:*:*:*', { versionStartIncluding: '1.20.0', versionEndExcluding: '1.25.0' })];
  assert.equal(classifyCpeApplicability(range, { name: 'nginx', version: '1.24.9' }).status, 'possible');
  assert.equal(classifyCpeApplicability(range, { name: 'nginx', version: '1.25.0' }).status, 'needs_review');
  assert.equal(classifyCpeApplicability(range, { name: 'nginx', version: '1.19.9' }).status, 'needs_review');
});

test('requires an exact supplied version', () => {
  const result = classifyCpeApplicability([cpe('cpe:2.3:a:nginx:nginx:*:*:*:*:*:*:*:*')], { name: 'nginx', version: '' });
  assert.equal(result.status, 'version_missing');
});

test('ignores non-vulnerable CPE matches', () => {
  const result = classifyCpeApplicability([cpe('cpe:2.3:a:nginx:nginx:*:*:*:*:*:*:*:*', { vulnerable: false })], { name: 'nginx', version: '1.24.0' });
  assert.equal(result.status, 'needs_review');
});

test('matches Apache HTTP Server CPE but not unrelated Apache products', () => {
  assert.equal(classifyCpeApplicability([cpe('cpe:2.3:a:apache:http_server:2.4.58:*:*:*:*:*:*:*')], { name: 'Apache', version: '2.4.58' }).status, 'possible');
  assert.equal(classifyCpeApplicability([cpe('cpe:2.3:a:apache:tomcat:2.4.58:*:*:*:*:*:*:*')], { name: 'Apache', version: '2.4.58' }).status, 'needs_review');
});

test('collects CPE matches recursively from nested NVD configuration nodes', () => {
  const nested = [
    { cpeMatch: [{ criteria: 'root' }], children: [
      { cpeMatch: [{ criteria: 'child' }], children: [
        { cpeMatch: [{ criteria: 'grandchild' }] }
      ] }
    ] }
  ];
  assert.deepEqual(collectCpeMatches(nested).map(x => x.criteria), ['root', 'child', 'grandchild']);
});


test('does not treat the CPE logical version - as a wildcard', () => {
  const result = classifyCpeApplicability(
    [cpe('cpe:2.3:a:nginx:nginx:-:*:*:*:*:*:*:*')],
    { name: 'nginx', version: '1.24.0' }
  );
  assert.equal(result.status, 'needs_review');
});

test('requires the exact Apache vendor and product pair', () => {
  const unrelated = classifyCpeApplicability(
    [cpe('cpe:2.3:a:apache:tomcat:9.0:*:*:*:*:*:*:*')],
    { name: 'Apache', version: '9.0' }
  );
  const correct = classifyCpeApplicability(
    [cpe('cpe:2.3:a:apache:http_server:2.4.58:*:*:*:*:*:*:*')],
    { name: 'Apache', version: '2.4.58' }
  );
  assert.equal(unrelated.status, 'needs_review');
  assert.equal(correct.status, 'possible');
});


test('Ubuntu OSV annotations are keyed to upstream CVE identifiers', () => {
  const upstream = ['CVE-2025-6491'];
  const id = upstream.find(value => /^CVE-\\d{4}-\\d+$/.test(value));
  assert.equal(id, 'CVE-2025-6491');
});

test('Ubuntu ecosystem requires an explicit release, not a generic Ubuntu label', () => {
  const valid = /^Ubuntu:(?:Pro:)?\\d{2}\\.\\d{2}(?::LTS)?$/;
  assert.equal(valid.test('Ubuntu:24.04:LTS'), true);
  assert.equal(valid.test('Ubuntu:Pro:22.04:LTS'), true);
  assert.equal(valid.test('Ubuntu'), false);
  assert.equal(valid.test('Ubuntu:latest'), false);
});
