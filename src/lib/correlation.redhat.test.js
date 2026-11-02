import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeInventory } from './correlation.js';

const cve = {
  id: 'CVE-2025-12345',
  descriptions: [{ lang: 'en', value: 'OpenSSL test advisory' }],
  published: '2025-01-01T00:00:00Z',
  lastModified: '2025-01-02T00:00:00Z',
  metrics: {}, weaknesses: [], references: [],
  configurations: [{ nodes: [{ cpeMatch: [{
    vulnerable: true,
    criteria: 'cpe:2.3:a:openssl:openssl:*:*:*:*:*:*:*:*',
    versionStartIncluding: '0'
  }] }] }]
};
const redHatRecord = {
  CVE: 'CVE-2025-12345',
  package_state: [{
    product_name: 'Red Hat Enterprise Linux 9',
    package_name: 'openssl',
    fix_state: 'Affected',
    impact: 'Important'
  }],
  affected_release: [{
    product_name: 'Red Hat Enterprise Linux 9',
    advisory: 'RHSA-2025:1234',
    release_date: '2025-03-01',
    package: { name: 'openssl', version: '1:3.0.7-28.el9' }
  }]
};

test('attaches official Red Hat package-state and erratum evidence without changing NVD applicability', async () => {
  let redHatFetches = 0;
  const result = await analyzeInventory([{
    id: 'openssl-rhel9', name: 'openssl', version: '1:3.0.7-27.el9',
    sourcePackage: 'openssl', ecosystem: 'Red Hat Enterprise Linux 9', type: 'library'
  }], {
    sources: {
      fetchNvdByKeyword: async () => [cve],
      fetchRedHatCve: async id => {
        redHatFetches++;
        assert.equal(id, 'CVE-2025-12345');
        return redHatRecord;
      },
      fetchEpssScores: async () => new Map(),
      fetchKevCatalog: async () => new Map()
    }
  });
  const finding = result.findings.find(item => item.id === 'CVE-2025-12345');
  assert.ok(finding);
  assert.equal(redHatFetches, 1);
  assert.equal(finding.components[0].applicability.status, 'possible');
  const evidence = finding.components[0].evidence.find(item => item.source === 'Red Hat Security Data');
  assert.ok(evidence);
  assert.equal(evidence.packageStates[0].fixState, 'Affected');
  assert.equal(evidence.affectedReleases[0].advisory, 'RHSA-2025:1234');
  assert.equal(result.sources.redHatSecurityData, 'queried');
});
