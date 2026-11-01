import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeInventory } from '../src/lib/correlation.js';

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
