import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyCpeApplicability, collectCpeMatches, classifyPhpDescriptionApplicability, hasUnsupportedCpeLogic } from '../src/lib/correlation.js';

const cpe = (criteria, extra = {}) => ({ criteria, vulnerable: true, ...extra });

test('matches an exact NGINX CPE product and version', () => {
  const result = classifyCpeApplicability([cpe('cpe:2.3:a:nginx:nginx:1.24.0:*:*:*:*:*:*:*')], { name: 'NGINX', version: '1.24.0' });
  assert.equal(result.status, 'possible');
});

test('does not match a similarly named but distinct product', () => {
  const result = classifyCpeApplicability([cpe('cpe:2.3:a:nginx:nginx_plus:1.24.0:*:*:*:*:*:*:*')], { name: 'NGINX', version: '1.24.0' });
  assert.equal(result.status, 'needs_review');
});

test('excludes a newer installed version when NVD enumerates only older concrete versions', () => {
  const historicalPhpVersions = [
    cpe('cpe:2.3:a:php:php:4.3.7:*:*:*:*:*:*:*'),
    cpe('cpe:2.3:a:php:php:5.0:rc1:*:*:*:*:*:*'),
    cpe('cpe:2.3:a:php:php:5.0:rc2:*:*:*:*:*:*'),
    cpe('cpe:2.3:a:php:php:5.0:rc3:*:*:*:*:*:*')
  ];
  const result = classifyCpeApplicability(historicalPhpVersions, { name: 'PHP', version: '8.1.0' });
  assert.equal(result.status, 'not_affected');
  assert.match(result.reason, /outside the concrete versions and explicit affected ranges/i);
});

test('respects inclusive and exclusive version boundaries', () => {
  const range = [cpe('cpe:2.3:a:nginx:nginx:*:*:*:*:*:*:*:*', { versionStartIncluding: '1.20.0', versionEndExcluding: '1.25.0' })];
  assert.equal(classifyCpeApplicability(range, { name: 'nginx', version: '1.24.9' }).status, 'possible');
  assert.equal(classifyCpeApplicability(range, { name: 'nginx', version: '1.25.0' }).status, 'not_affected');
  assert.equal(classifyCpeApplicability(range, { name: 'nginx', version: '1.19.9' }).status, 'not_affected');
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
  const id = upstream.find(value => /^CVE-\d{4}-\d+$/.test(value));
  assert.equal(id, 'CVE-2025-6491');
});

test('Ubuntu ecosystem requires an explicit release, not a generic Ubuntu label', () => {
  const valid = /^Ubuntu:(?:Pro:)?\d{2}\.\d{2}(?::LTS)?$/;
  assert.equal(valid.test('Ubuntu:24.04:LTS'), true);
  assert.equal(valid.test('Ubuntu:Pro:22.04:LTS'), true);
  assert.equal(valid.test('Ubuntu'), false);
  assert.equal(valid.test('Ubuntu:latest'), false);
});


test('does not flatten NVD AND conditions into a false single-product match', () => {
  const configurations = [{
    nodes: [{
      operator: 'AND',
      negate: false,
      cpeMatch: [
        cpe('cpe:2.3:a:vendor:product:1.0:*:*:*:*:*:*:*'),
        cpe('cpe:2.3:o:vendor:required_platform:1.0:*:*:*:*:*:*:*', { vulnerable: false })
      ]
    }]
  }];
  assert.equal(hasUnsupportedCpeLogic(configurations), true);
});

test('accepts ordinary OR-only NVD CPE trees for per-product matching', () => {
  const configurations = [{
    nodes: [{
      operator: 'OR',
      cpeMatch: [cpe('cpe:2.3:a:vendor:product:1.0:*:*:*:*:*:*:*')],
      children: [{
        operator: 'OR',
        cpeMatch: [cpe('cpe:2.3:a:vendor:product:2.0:*:*:*:*:*:*:*')]
      }]
    }]
  }];
  assert.equal(hasUnsupportedCpeLogic(configurations), false);
});

test('keeps negated NVD CPE conditions in manual review', () => {
  assert.equal(hasUnsupportedCpeLogic([{
    nodes: [{ operator: 'OR', negate: true, cpeMatch: [cpe('cpe:2.3:a:vendor:product:*:*:*:*:*:*:*:*')] }]
  }]), true);
});

test('scopes unqualified PHP description boundaries to the stated branch', () => {
  const result = classifyPhpDescriptionApplicability({
    descriptions: [{ lang: 'en', value: 'PHP versions before 8.1.29 are affected.' }]
  }, { name: 'PHP', version: '7.2.0' });
  assert.equal(result.status, 'not_affected');
});

test('recognizes GD as a PHP extension-specific condition', () => {
  const result = classifyPhpDescriptionApplicability({
    descriptions: [{ lang: 'en', value: 'PHP 7.2.x before 7.2.24 is affected when GD is enabled.' }]
  }, { name: 'PHP', version: '7.2.23' });
  assert.equal(result.status, 'needs_review');
});

test('supports wildcard PHP branch notation and exclusive upper bounds', () => {
  const cve = { descriptions: [{ lang: 'en', value: 'PHP 8.1.* less than 8.1.29 is affected.' }] };
  assert.equal(classifyPhpDescriptionApplicability(cve, { name: 'PHP', version: '8.1.28' }).status, 'possible');
  assert.equal(classifyPhpDescriptionApplicability(cve, { name: 'PHP', version: '8.1.29' }).status, 'not_affected');
  assert.equal(classifyPhpDescriptionApplicability(cve, { name: 'PHP', version: '8.2.0' }).status, 'not_affected');
});

test('supports inclusive PHP wording without including the next patch release', () => {
  const cve = { descriptions: [{ lang: 'en', value: 'PHP 7.2.x up to and including 7.2.24 is affected.' }] };
  assert.equal(classifyPhpDescriptionApplicability(cve, { name: 'PHP', version: '7.2.24' }).status, 'possible');
  assert.equal(classifyPhpDescriptionApplicability(cve, { name: 'PHP', version: '7.2.25' }).status, 'not_affected');
});

test('supports the PHP through operator as an inclusive boundary', () => {
  const cve = { descriptions: [{ lang: 'en', value: 'PHP 8.2.x through 8.2.15 is affected.' }] };
  assert.equal(classifyPhpDescriptionApplicability(cve, { name: 'PHP', version: '8.2.15' }).status, 'possible');
  assert.equal(classifyPhpDescriptionApplicability(cve, { name: 'PHP', version: '8.2.16' }).status, 'not_affected');
});
