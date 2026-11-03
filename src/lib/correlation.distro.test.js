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
  affected: [{ package: { ecosystem: 'AlmaLinux:9', name: 'openssl' }, ranges: [{ type: 'ECOSYSTEM', events: [{ introduced: '0' }, { fixed: '1:3.0.7-27.el9_4.2' }] }] }],
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
        assert.equal(ecosystem, 'AlmaLinux:9');
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
  assert.equal(evidence.ecosystem, 'AlmaLinux:9');
  assert.deepEqual(evidence.fixedVersions, ['1:3.0.7-27.el9_4.2']);
  assert.equal(finding.components[0].applicability.status, 'possible', 'vendor fix metadata must not override NVD applicability');
  assert.equal(finding.components[0].applicability.status, 'possible');
});


test('attaches SUSE source-package VEX only as indirect review evidence through an explicit CSAF relationship', async () => {
  const suseDocument = {
    document: { csaf_version: '2.0' },
    product_tree: {
      branches: [{ name: 'SLES 15 SP6', branches: [
        { product: { product_id: 'sles-openssl-bin', name: 'openssl binary', product_identification_helper: { purl: 'pkg:rpm/suse/openssl@3.0.0?arch=x86_64' } } },
        { product: { product_id: 'sles-openssl-src', name: 'openssl source', product_identification_helper: { purl: 'pkg:rpm/suse/openssl@3.0.0?arch=src' } } }
      ] }],
      relationships: [{
        category: 'default_component_of',
        product_reference: 'sles-openssl-src',
        relates_to_product_reference: 'sles-openssl-bin',
        full_product_name: { product_id: 'sles-openssl-combined', name: 'openssl source component of binary' }
      }]
    },
    vulnerabilities: [{ cve: 'CVE-2025-67890', product_status: { fixed: ['sles-openssl-src'] } }]
  };
  const result = await analyzeInventory([{
    id: 'openssl-suse', name: 'openssl', version: '3.0.0-1',
    sourcePackage: 'openssl', ecosystem: 'SLES 15 SP6',
    purl: 'pkg:rpm/suse/openssl@3.0.0?arch=x86_64',
    architecture: 'x86_64', type: 'library'
  }], {
    sources: {
      fetchNvdByKeyword: async () => [cve],
      fetchSuseCsafVex: async cveId => {
        assert.equal(cveId, 'CVE-2025-67890');
        return suseDocument;
      },
      fetchEpssScores: async () => new Map(),
      fetchKevCatalog: async () => new Map()
    }
  });
  const finding = result.findings.find(item => item.id === 'CVE-2025-67890');
  assert.ok(finding);
  const evidence = finding.components[0].evidence.find(item => item.source === 'SUSE CSAF VEX');
  assert.ok(evidence);
  assert.equal(evidence.status, 'needs_review');
  assert.equal(evidence.evidenceType, 'source_package_relationship');
  assert.equal(evidence.confidence, 'medium');
  assert.equal(evidence.relatedBinaryProducts[0].productId, 'sles-openssl-bin');
  assert.equal(finding.components[0].applicability.status, 'possible', 'source-level VEX must not override NVD applicability');
});

test('queries AlmaLinux source package separately and attaches indirect evidence without transferring fixed version to binary', async () => {
  const sourceAdvisory = {
    id: 'ALSA-2025:5678', aliases: ['CVE-2025-67890'], summary: 'Source package security update',
    affected: [{ package: { ecosystem: 'AlmaLinux:9', name: 'openssl' }, ranges: [
      { type: 'ECOSYSTEM', events: [{ introduced: '0' }, { fixed: '1:3.0.7-27.el9_4.2' }] }
    ] }]
  };
  const calls = [];
  const result = await analyzeInventory([{
    id: 'openssl-libs-alma9', name: 'openssl-libs', version: '3.0.7-27.el9',
    sourcePackage: 'openssl', sourceVersion: '1:3.0.7-27.el9',
    ecosystem: 'AlmaLinux 9', type: 'library'
  }], {
    sources: {
      fetchNvdByKeyword: async () => [cve],
      fetchOsvForDistroPackage: async (name, ecosystem, version) => {
        calls.push({ name, ecosystem, version });
        return name === 'openssl' && version.startsWith('1:') ? [sourceAdvisory] : [];
      },
      fetchEpssScores: async () => new Map(),
      fetchKevCatalog: async () => new Map()
    }
  });
  assert.deepEqual(calls.sort((a, b) => a.name.localeCompare(b.name)), [
    { name: 'openssl', ecosystem: 'AlmaLinux:9', version: '1:3.0.7-27.el9' },
    { name: 'openssl-libs', ecosystem: 'AlmaLinux:9', version: '3.0.7-27.el9' }
  ]);
  const finding = result.findings.find(item => item.id === 'CVE-2025-67890');
  assert.ok(finding);
  const evidence = finding.components[0].evidence.find(item =>
    item.source === 'OSV (Linux distributions)' && item.evidenceType === 'source_package'
  );
  assert.ok(evidence);
  assert.equal(evidence.status, 'needs_review');
  assert.equal(evidence.confidence, 'medium');
  assert.equal(evidence.sourcePackage, 'openssl');
  assert.equal(evidence.binaryPackage, 'openssl-libs');
  assert.deepEqual(evidence.fixedVersions, ['1:3.0.7-27.el9_4.2']);
  assert.match(evidence.reason, /permite trasladar su versión corregida al binario/i);
  assert.equal(finding.components[0].applicability.status, 'needs_review', 'source-package evidence must not confirm binary applicability');
});

test('does not query distro source package without an explicit source version', async () => {
  const calls = [];
  await analyzeInventory([{
    id: 'openssl-libs-rocky9', name: 'openssl-libs', version: '3.0.7-1.el9',
    sourcePackage: 'openssl', ecosystem: 'Rocky Linux 9', type: 'library'
  }], {
    sources: {
      fetchNvdByKeyword: async () => [],
      fetchOsvForDistroPackage: async (...args) => { calls.push(args); return []; },
      fetchEpssScores: async () => new Map(),
      fetchKevCatalog: async () => new Map()
    }
  });
  assert.deepEqual(calls, [['openssl-libs', 'Rocky Linux', '3.0.7-1.el9', { signal: undefined }]]);
});


test('queries Alpine OSV by exact APK PURL identity and keeps it separate from NVD applicability', async () => {
  const calls = [];
  const alpineAdvisory = {
    id: 'ALPINE-CVE-2025-67890',
    aliases: ['CVE-2025-67890'],
    summary: 'BusyBox security update',
    published: '2025-02-01T00:00:00Z',
    modified: '2025-02-02T00:00:00Z',
    affected: [{
      package: { ecosystem: 'Alpine', name: 'busybox' },
      ranges: [{ type: 'ECOSYSTEM', events: [{ introduced: '0' }, { fixed: '1.36.1-r3' }] }]
    }],
    references: [{ type: 'ADVISORY', url: 'https://security.alpinelinux.org/vuln/CVE-2025-67890' }]
  };
  const result = await analyzeInventory([{
    id: 'busybox-alpine',
    name: 'busybox',
    version: '1.36.1-r2',
    purl: 'pkg:apk/alpine/busybox@1.36.1-r2',
    type: 'library'
  }], {
    sources: {
      fetchNvdByKeyword: async () => [cve],
      fetchOsvForDistroPackage: async (name, ecosystem, version) => {
        calls.push({ name, ecosystem, version });
        return [alpineAdvisory];
      },
      fetchEpssScores: async () => new Map(),
      fetchKevCatalog: async () => new Map()
    }
  });
  assert.deepEqual(calls, [{ name: 'busybox', ecosystem: 'Alpine', version: '1.36.1-r2' }]);
  const finding = result.findings.find(item => item.id === 'CVE-2025-67890');
  assert.ok(finding);
  const evidence = finding.components[0].evidence.find(item => item.source === 'OSV (Linux distributions)');
  assert.ok(evidence);
  assert.equal(evidence.ecosystem, 'Alpine');
  assert.equal(evidence.installedVersion, '1.36.1-r2');
  assert.deepEqual(evidence.fixedVersions, ['1.36.1-r3']);
  assert.equal(evidence.status, 'needs_review');
  assert.equal(finding.components[0].applicability.status, 'possible');
});

test('does not infer Alpine OSV from a generic APK PURL with a non-Alpine namespace', async () => {
  const calls = [];
  await analyzeInventory([{
    id: 'busybox-other',
    name: 'busybox',
    version: '1.36.1-r2',
    purl: 'pkg:apk/custom/busybox@1.36.1-r2',
    type: 'library'
  }], {
    sources: {
      fetchNvdByKeyword: async () => [],
      fetchOsvForDistroPackage: async (...args) => { calls.push(args); return []; },
      fetchEpssScores: async () => new Map(),
      fetchKevCatalog: async () => new Map()
    }
  });
  assert.deepEqual(calls, []);
});
