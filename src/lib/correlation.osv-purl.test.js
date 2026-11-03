import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeInventory } from './correlation.js';

const component = (id = 'pkg-1') => ({
  id,
  name: 'lodash',
  version: '4.17.20',
  type: 'library',
  purl: 'pkg:npm/lodash@4.17.20'
});

const sources = (records) => ({
  fetchNvdByKeyword: async () => [],
  fetchNvdByVirtualMatchString: async () => [],
  fetchOsvForPurl: async () => records,
  fetchEpssScores: async () => new Map(),
  fetchKevCatalog: async () => new Map(),
  fetchUbuntuOsvForSourcePackage: async () => [],
  fetchCanonicalUbuntuVex: async () => null
});

test('retains OSV advisories without CVE aliases as review-only PURL advisories', async () => {
  const result = await analyzeInventory([component()], {
    sources: sources([{
      id: 'GHSA-abcd-1234-efgh',
      summary: 'Example advisory without a CVE alias',
      published: '2025-01-02T00:00:00Z',
      modified: '2025-01-03T00:00:00Z',
      references: [{ url: 'https://example.org/advisory' }]
    }])
  });

  assert.equal(result.findings.length, 0);
  assert.equal(result.purlAdvisories.length, 1);
  assert.equal(result.purlAdvisories[0].id, 'GHSA-abcd-1234-efgh');
  assert.equal(result.purlAdvisories[0].status, 'needs_review');
  assert.equal(result.purlAdvisories[0].component.id, 'pkg-1');
  assert.equal(result.purlAdvisories[0].url, 'https://osv.dev/vulnerability/GHSA-abcd-1234-efgh');
  assert.deepEqual(result.purlAdvisories[0].references, ['https://example.org/advisory']);
});

test('preserves explicitly selected component types throughout vulnerability analysis', async () => {
  const result = await analyzeInventory([{
    id: 'python-library',
    name: 'python',
    version: '1.0.0',
    type: 'library',
    purl: 'pkg:npm/python@1.0.0'
  }], {
    sources: sources([{
      id: 'GHSA-type-preservation',
      summary: 'Example advisory without a CVE alias'
    }])
  });

  assert.equal(result.purlAdvisories.length, 1);
  assert.equal(result.purlAdvisories[0].component.type, 'library');
});

test('does not treat withdrawn OSV advisories as active PURL advisories', async () => {
  const result = await analyzeInventory([component()], {
    sources: sources([{ id: 'GHSA-withdrawn', withdrawn: '2025-01-04T00:00:00Z' }])
  });

  assert.equal(result.purlAdvisories.length, 0);
  assert.equal(result.findings.length, 0);
});

test('keeps OSV advisories with CVE aliases in the CVE finding path', async () => {
  const result = await analyzeInventory([component()], {
    sources: sources([{
      id: 'GHSA-cve-link',
      aliases: ['CVE-2025-12345'],
      summary: 'Advisory linked to a CVE'
    }])
  });

  assert.equal(result.purlAdvisories.length, 0);
  assert.equal(result.findings.length, 1);
  assert.equal(result.findings[0].id, 'CVE-2025-12345');
  assert.equal(result.findings[0].components[0].applicability.status, 'needs_review');
});


test('preserves successful results and reports a partial OSV PURL failure', async () => {
  const result = await analyzeInventory([component()], {
    sources: {
      ...sources([]),
      fetchOsvForPurl: async () => { throw new Error('OSV temporarily unavailable'); }
    }
  });

  assert.deepEqual(result.findings, []);
  assert.equal(result.sources.osvPurl, 'partial_or_unavailable');
  assert.equal(result.errors.length, 1);
  assert.equal(result.errors[0].source, 'OSV (PURL)');
  assert.match(result.errors[0].message, /temporarily unavailable/);
});

test('propagates OSV cancellation instead of returning an empty result', async () => {
  const controller = new AbortController();
  const resultPromise = analyzeInventory([component()], {
    signal: controller.signal,
    sources: {
      ...sources([]),
      fetchOsvForPurl: async () => {
        controller.abort();
        throw new DOMException('The operation was aborted.', 'AbortError');
      }
    }
  });

  await assert.rejects(resultPromise, error => error?.name === 'AbortError');
});


test('normalizes direct OSV CVE identifiers and deduplicates alias paths', async () => {
  const result = await analyzeInventory([component()], {
    sources: sources([{
      id: 'cve-2025-12345',
      aliases: ['CVE-2025-12345', 'CVE-2025-12345'],
      upstream: ['cve-2025-12345'],
      summary: 'Advisory identified directly by its CVE'
    }])
  });

  assert.equal(result.purlAdvisories.length, 0);
  assert.equal(result.findings.length, 1);
  assert.equal(result.findings[0].id, 'CVE-2025-12345');
  assert.equal(result.findings[0].components.length, 1);
  assert.equal(result.findings[0].components[0].evidence.filter(item => item.source === 'OSV (PURL)').length, 1);
});
