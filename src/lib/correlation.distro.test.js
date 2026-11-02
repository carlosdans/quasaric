import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeInventory } from './correlation.js';

const cve = {
  id: 'CVE-2025-67890',
  descriptions: [{ lang: 'en', value: 'Test package advisory' }],
  published: '2025-02-01T00:00:00Z',
  lastModified: '2025-02-02T00:00:00Z',
  metrics: {}, weaknesses: [], references: [],
  configurations: [{ nodes: [{ cpeMatch: [{
    vulnerable: true, criteria: 'cpe:2.3:a:openssl:openssl:*:*:*:*:*:*:*:*',
    versionStartIncluding: '0'
  }] }] }]
};
const advisory = {
  id: 'ALSA-2025:1234',
  aliases: ['CVE-2025-67890'],
  summary: 'OpenSSL security update',
  published: '2025-02-01T00:00:00Z',
  affected: [{ package: { ecosystem: 'AlmaLinux', name: 'openssl' }, ranges: [{ type: 'ECOSYSTEM', events: [{ introduced: '0' }, { fixed: '1:3.0.7-27.el9_4.2' }] }] }],
  references: [{ type: 'ADVISORY', url: 'https://errata.almalinux.org/9/ALSA-2025-1234.html' }]
};

test('attaches OSV distro advisory evidence to exact AlmaLinux package without overriding NVD', async () => {
  const result = await analyzeInventory([{
    id: 'openssl-alma9', name: 'openssl', version: '3.0.7-27.el9',
    sourcePackage: 'openssl', ecosystem: 'AlmaLinux 9', type: 'library'
  }], {
    sources: {
      fetchNvdByKeyword: async () => [cve],
      fetchOsvForDistroPackage: async (name, ecosystem, version) => {
        assert.equal(name, 'openssl');
        assert.equal(ecosystem, 'AlmaLinux');
        assert.equal(version, '3.0.7-27.el9');
        return [advisory];
      },
      fetchEpssScores: async () => new Map(),
      fetchKevCatalog: async () => new Map()
    }
  });
  const finding = result.findings.find(item => item.id === 'CVE-2025-67890');
  assert.ok(finding);
  const evidence = finding.components[0].evidence.find(item => item.source === 'OSV (Linux distributions)');
  assert.ok(evidence);
  assert.equal(evidence.advisoryId, 'ALSA-2025:1234');
  assert.equal(evidence.ecosystem, 'AlmaLinux');
  assert.deepEqual(evidence.fixedVersions, ['1:3.0.7-27.el9_4.2']);
  assert.equal(finding.components[0].applicability.status, 'possible', 'vendor fix metadata must not override NVD applicability');
  assert.equal(finding.components[0].applicability.status, 'possible');
});
