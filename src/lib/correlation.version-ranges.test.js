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
  assert.equal(classifyCpeApplicability(cpes, php('8.1')).status, 'not_affected');
  assert.equal(classifyCpeApplicability(cpes, php('8.1.1')).status, 'possible');
});

test('excludes the upper endpoint of an exclusive end range', () => {
  const cpes = [range({ versionStartIncluding: '8.1', versionEndExcluding: '8.3' })];
  assert.equal(classifyCpeApplicability(cpes, php('8.3')).status, 'not_affected');
  assert.equal(classifyCpeApplicability(cpes, php('8.2.9')).status, 'possible');
});

test('excludes versions outside an explicitly bounded wildcard CPE range', () => {
  const cpes = [
    range({ versionStartIncluding: '4.0', versionEndExcluding: '4.3.8' }),
    { criteria: 'cpe:2.3:a:php:php:5.0.0:beta1:*:*:*:*:*:*', vulnerable: true },
    { criteria: 'cpe:2.3:a:php:php:5.0.0:beta2:*:*:*:*:*:*', vulnerable: true },
    { criteria: 'cpe:2.3:a:php:php:5.0.0:beta3:*:*:*:*:*:*', vulnerable: true }
  ];
  assert.equal(classifyCpeApplicability(cpes, php('4.3.7')).status, 'possible');
  assert.equal(classifyCpeApplicability(cpes, php('8.1.0')).status, 'not_affected');
});

test('does not exclude a version when a wildcard CPE has no explicit version boundaries', () => {
  assert.equal(classifyCpeApplicability([range()], php('8.1.0')).status, 'possible');
});

test('requires an exact match when the CPE contains a concrete version', () => {
  const cpes = [{ criteria: 'cpe:2.3:a:php:php:8.2:*:*:*:*:*:*:*', vulnerable: true }];
  assert.equal(classifyCpeApplicability(cpes, php('8.2')).status, 'possible');
  assert.equal(classifyCpeApplicability(cpes, php('8.2.1')).status, 'not_affected');
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

test('uses explicit PHP version ranges in NVD descriptions when wildcard CPEs are inconclusive', async () => {
  const { analyzeInventory } = await import('./correlation.js');
  const records = [
    { id: 'CVE-2018-7584', descriptions: [{ lang: 'en', value: 'In PHP through 5.6.33, 7.0.x before 7.0.28, 7.1.x through 7.1.14, and 7.2.x through 7.2.2.' }], configurations: [{ nodes: [{ cpeMatch: [range()] }] }] },
    { id: 'CVE-2017-8923', descriptions: [{ lang: 'en', value: 'The function in PHP through 7.1.5 has an issue.' }], configurations: [{ nodes: [{ cpeMatch: [range()] }] }] },
    { id: 'CVE-2015-9253', descriptions: [{ lang: 'en', value: 'An issue was discovered in PHP 7.2.x before 7.2.8.' }], configurations: [{ nodes: [{ cpeMatch: [range()] }] }] }
  ];
  const result = await analyzeInventory([{ id: 'php', name: 'php', type: 'runtime', version: '7.2.0' }], {
    sources: {
      fetchNvdByKeyword: async () => records,
      fetchEpssScores: async () => new Map(),
      fetchKevCatalog: async () => new Map()
    }
  });
  const statuses = new Map(result.findings.map(item => [item.id, item.applicabilityStatus]));
  assert.equal(statuses.get('CVE-2018-7584'), 'possible');
  assert.equal(statuses.get('CVE-2017-8923'), undefined);
  assert.equal(statuses.get('CVE-2015-9253'), 'possible');
});
