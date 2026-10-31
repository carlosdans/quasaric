import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeInventory } from './correlation.js';

const component = (overrides = {}) => ({
  id: 'openssl-noble',
  name: 'openssl',
  version: '1.0.0-1',
  sourcePackage: 'openssl',
  sourceVersion: '1.0.0-1',
  ecosystem: 'Ubuntu:24.04:LTS',
  architecture: 'amd64',
  type: 'library',
  ...overrides
});

const sourcePurl = 'pkg:deb/ubuntu/openssl@1.0.0-1?arch=source&distro=ubuntu/noble';
const binaryPurl = 'pkg:deb/ubuntu/openssl@1.0.0-1?arch=amd64&distro=ubuntu/noble';
const osvRecord = {
  id: 'CVE-2026-12345',
  osvId: 'UBUNTU-CVE-2026-12345',
  package: 'openssl',
  ecosystem: 'Ubuntu:24.04:LTS',
  summary: 'Test Ubuntu OpenSSL advisory',
  published: '2026-01-01T00:00:00Z',
  modified: '2026-01-02T00:00:00Z',
  references: [{ url: 'https://ubuntu.com/security/CVE-2026-12345' }],
  affected: [{
    package: { name: 'openssl', ecosystem: 'Ubuntu:24.04:LTS', purl: sourcePurl },
    versions: ['1.0.0-1'],
    ranges: [{ type: 'ECOSYSTEM', events: [{ introduced: '0' }, { fixed: '1.0.0-2' }] }],
    ecosystem_specific: {
      binaries: [{ binary_name: 'openssl', binary_version: '1.0.0-2' }]
    }
  }]
};
const nvdRecord = {
  id: 'CVE-2026-12345',
  descriptions: [{ lang: 'en', value: 'Test OpenSSL CVE' }],
  published: '2026-01-01T00:00:00Z',
  lastModified: '2026-01-02T00:00:00Z',
  metrics: {},
  weaknesses: [],
  references: [],
  configurations: [{
    nodes: [{
      cpeMatch: [{
        vulnerable: true,
        criteria: 'cpe:2.3:a:openssl:openssl:*:*:*:*:*:*:*:*',
        versionStartIncluding: '0'
      }]
    }]
  }]
};
const vexRecord = {
  '@id': 'https://github.com/canonical/ubuntu-security-notices/blob/main/vex/cve/2026/CVE-2026-12345',
  sourceUrl: 'https://raw.githubusercontent.com/canonical/ubuntu-security-notices/main/vex/cve/2026/CVE-2026-12345.json',
  timestamp: '2026-10-30T10:00:00Z',
  version: 1,
  statements: [{
    status: 'fixed',
    products: [{ '@id': binaryPurl }]
  }]
};
const sources = (overrides = {}) => ({
  fetchNvdByKeyword: async () => [nvdRecord],
  fetchUbuntuOsvForSourcePackage: async () => [osvRecord],
  fetchCanonicalUbuntuVex: async () => vexRecord,
  fetchEpssScores: async () => new Map([['CVE-2026-12345', 0.02]]),
  fetchKevCatalog: async () => new Map(),
  ...overrides
});

test('attaches exact OpenVEX evidence when the same CVE is already present from NVD', async () => {
  const result = await analyzeInventory([component()], { sources: sources() });
  const finding = result.findings.find(item => item.id === 'CVE-2026-12345');
  assert.ok(finding);
  assert.equal(finding.components.length, 1);
  assert.equal(finding.components[0].applicability.status, 'possible');
  assert.equal(finding.components[0].ubuntuVex.status, 'fixed');
  assert.equal(finding.components[0].ubuntuVex.documentTimestamp, vexRecord.timestamp);
  assert.equal(finding.components[0].ubuntuVex.documentUrl, vexRecord.sourceUrl);
  assert.equal(finding.applicabilityStatus, 'possible');
  assert.equal(result.sources.ubuntuVex, 'queried');
});

test('attaches source identifiers, dates, URLs and exact product details to each source evidence item', async () => {
  const result = await analyzeInventory([component()], { sources: sources() });
  const finding = result.findings.find(item => item.id === 'CVE-2026-12345');
  const evidence = finding.components[0].evidence;
  assert.deepEqual(evidence.map(item => item.source), ['NVD', 'Ubuntu OSV', 'Canonical OpenVEX']);

  const nvd = evidence.find(item => item.source === 'NVD');
  assert.equal(nvd.advisoryId, 'CVE-2026-12345');
  assert.equal(nvd.status, 'possible');
  assert.equal(nvd.publishedAt, nvdRecord.published);
  assert.equal(nvd.updatedAt, nvdRecord.lastModified);
  assert.equal(nvd.url, 'https://nvd.nist.gov/vuln/detail/CVE-2026-12345');

  const osv = evidence.find(item => item.source === 'Ubuntu OSV');
  assert.equal(osv.advisoryId, 'UBUNTU-CVE-2026-12345');
  assert.equal(osv.status, 'affected');
  assert.equal(osv.publishedAt, osvRecord.published);
  assert.equal(osv.updatedAt, osvRecord.modified);
  assert.equal(osv.url, 'https://osv.dev/vulnerability/UBUNTU-CVE-2026-12345');
  assert.ok(osv.references.includes('https://ubuntu.com/security/CVE-2026-12345'));

  const vex = evidence.find(item => item.source === 'Canonical OpenVEX');
  assert.equal(vex.status, 'fixed');
  assert.equal(vex.documentTimestamp, vexRecord.timestamp);
  assert.equal(vex.documentVersion, vexRecord.version);
  assert.equal(vex.url, vexRecord.sourceUrl);

  for (const item of evidence) {
    assert.equal(item.product.name, 'openssl');
    assert.equal(item.product.version, '1.0.0-1');
    assert.equal(item.product.sourcePackage, 'openssl');
    assert.equal(item.product.architecture, 'amd64');
    assert.equal(item.product.ecosystem, 'Ubuntu:24.04:LTS');
    if (item.source !== 'Canonical OpenVEX') assert.ok(item.reason);
  }
});

test('OSV-only findings do not claim NVD provenance', async () => {
  const result = await analyzeInventory([component()], {
    sources: sources({ fetchNvdByKeyword: async () => [] })
  });
  const finding = result.findings.find(item => item.id === 'CVE-2026-12345');
  const evidence = finding.components[0].evidence;
  assert.equal(evidence.some(item => item.source === 'NVD'), false);
  assert.equal(evidence.some(item => item.source === 'Ubuntu OSV'), true);
  assert.equal(evidence.some(item => item.source === 'Canonical OpenVEX'), true);
});

test('OpenVEX download failure leaves NVD and Ubuntu OSV assessment intact', async () => {
  const result = await analyzeInventory([component()], {
    sources: sources({ fetchCanonicalUbuntuVex: async () => { throw new Error('simulated network failure'); } })
  });
  const finding = result.findings.find(item => item.id === 'CVE-2026-12345');
  assert.equal(finding.components[0].applicability.status, 'possible');
  assert.equal(finding.components[0].ubuntuVex.status, 'unavailable');
  assert.match(finding.components[0].ubuntuVex.reason, /se conserva sin cambios/i);
  assert.equal(result.sources.ubuntuVex, 'unavailable');
  assert.equal(result.errors.some(error => error.source === 'Canonical OpenVEX'), true);
});

test('missing local architecture skips remote VEX lookup and stays needs_review', async () => {
  let vexFetches = 0;
  const result = await analyzeInventory([component({ architecture: '' })], {
    sources: sources({ fetchCanonicalUbuntuVex: async () => { vexFetches++; return vexRecord; } })
  });
  const finding = result.findings.find(item => item.id === 'CVE-2026-12345');
  assert.equal(vexFetches, 0);
  assert.equal(finding.components[0].ubuntuVex.status, 'needs_review');
  assert.match(finding.components[0].ubuntuVex.reason, /arquitectura/i);
  assert.equal(finding.components[0].applicability.status, 'possible');
});

test('OSV-only CVE still creates a finding and receives OpenVEX evidence', async () => {
  const result = await analyzeInventory([component()], {
    sources: sources({ fetchNvdByKeyword: async () => [] })
  });
  const finding = result.findings.find(item => item.id === 'CVE-2026-12345');
  assert.ok(finding);
  assert.equal(finding.components[0].applicability.status, 'affected');
  assert.equal(finding.components[0].ubuntuVex.status, 'fixed');
  assert.equal(finding.applicabilityStatus, 'affected');
});

test('one public VEX document is fetched per CVE even when multiple local binaries map to it', async () => {
  let vexFetches = 0;
  const result = await analyzeInventory([
    component(),
    component({ id: 'openssl-noble-second', name: 'openssl', architecture: 'amd64' })
  ], {
    sources: sources({ fetchCanonicalUbuntuVex: async () => { vexFetches++; return vexRecord; } })
  });
  const finding = result.findings.find(item => item.id === 'CVE-2026-12345');
  assert.equal(vexFetches, 1);
  assert.equal(finding.components.length, 2);
  assert.ok(finding.components.every(item => item.ubuntuVex.status === 'fixed'));
});


test('limits OpenVEX document fetches to 100 per inventory analysis', async () => {
  const records = Array.from({ length: 101 }, (_, index) => {
    const id = `CVE-2026-${10000 + index}`;
    return {
      ...osvRecord,
      id,
      affected: [{
        ...osvRecord.affected[0],
        package: { ...osvRecord.affected[0].package, purl: sourcePurl }
      }]
    };
  });
  let vexFetches = 0;
  const result = await analyzeInventory([component()], {
    sources: sources({
      fetchNvdByKeyword: async () => [],
      fetchUbuntuOsvForSourcePackage: async () => records,
      fetchCanonicalUbuntuVex: async () => { vexFetches++; return vexRecord; }
    })
  });
  assert.equal(vexFetches, 100);
  assert.equal(result.findings.length, 101);
  assert.equal(result.sources.ubuntuVex, 'partial_or_unavailable');
  assert.equal(result.errors.some(error => /límite de 100 documentos/i.test(error.message)), true);
  const capped = result.findings.find(finding => finding.id === 'CVE-2026-10100');
  assert.equal(capped.components[0].ubuntuVex.status, 'unavailable');
});

test('keeps Canonical OpenVEX document fetch concurrency at or below four', async () => {
  const records = Array.from({ length: 8 }, (_, index) => ({
    ...osvRecord,
    id: `CVE-2026-${20000 + index}`
  }));
  let active = 0;
  let maximumActive = 0;
  const result = await analyzeInventory([component()], {
    sources: sources({
      fetchNvdByKeyword: async () => [],
      fetchUbuntuOsvForSourcePackage: async () => records,
      fetchCanonicalUbuntuVex: async () => {
        active++;
        maximumActive = Math.max(maximumActive, active);
        await new Promise(resolve => setTimeout(resolve, 5));
        active--;
        return vexRecord;
      }
    })
  });
  assert.equal(result.findings.length, 8);
  assert.ok(maximumActive > 1);
  assert.ok(maximumActive <= 4);
});


test('retains Ubuntu OSV assessment beside NVD applicability and flags OSV/OpenVEX contradiction', async () => {
  const result = await analyzeInventory([component()], { sources: sources() });
  const finding = result.findings.find(item => item.id === 'CVE-2026-12345');
  const matched = finding.components[0];
  assert.equal(matched.applicability.status, 'possible');
  assert.equal(matched.ubuntuOsv.status, 'affected');
  assert.equal(matched.ubuntuVex.status, 'fixed');
  assert.equal(matched.ubuntuVex.consistency.status, 'conflicting');
  assert.match(matched.ubuntuVex.consistency.reason, /Ubuntu OSV reports affected.*OpenVEX reports fixed/i);
  assert.equal(finding.applicabilityStatus, 'possible');
});

test('compares OpenVEX independently for two binaries from the same Ubuntu source package', async () => {
  const libsslPurl = 'pkg:deb/ubuntu/libssl3@1.0.0-1?arch=amd64&distro=ubuntu/noble';
  const record = {
    ...osvRecord,
    affected: [{
      ...osvRecord.affected[0],
      ecosystem_specific: {
        binaries: [
          { binary_name: 'openssl', binary_version: '1.0.0-2' },
          { binary_name: 'libssl3', binary_version: '1.0.0-2' }
        ]
      }
    }]
  };
  const document = {
    ...vexRecord,
    statements: [
      { status: 'not_affected', products: [{ '@id': binaryPurl }] },
      { status: 'affected', products: [{ '@id': libsslPurl }] }
    ]
  };
  const result = await analyzeInventory([
    component({ id: 'openssl-amd64' }),
    component({ id: 'libssl3-amd64', name: 'libssl3' })
  ], {
    sources: sources({
      fetchNvdByKeyword: async () => [],
      fetchUbuntuOsvForSourcePackage: async () => [record],
      fetchCanonicalUbuntuVex: async () => document
    })
  });
  const finding = result.findings.find(item => item.id === 'CVE-2026-12345');
  assert.equal(finding.components.length, 2);
  const openssl = finding.components.find(item => item.component.name === 'openssl');
  const libssl3 = finding.components.find(item => item.component.name === 'libssl3');
  assert.equal(openssl.ubuntuOsv.status, 'affected');
  assert.equal(openssl.ubuntuVex.status, 'not_affected');
  assert.equal(openssl.ubuntuVex.consistency.status, 'conflicting');
  assert.equal(libssl3.ubuntuOsv.status, 'affected');
  assert.equal(libssl3.ubuntuVex.status, 'affected');
  assert.equal(libssl3.ubuntuVex.consistency.status, 'aligned');
  assert.equal(finding.applicabilityStatus, 'affected');
});

test('flags an OpenVEX affected statement that contradicts an Ubuntu OSV patched candidate', async () => {
  const result = await analyzeInventory([
    component({ version: '1.0.0-2', sourceVersion: '1.0.0-2' })
  ], {
    sources: sources({
      fetchNvdByKeyword: async () => [],
      fetchCanonicalUbuntuVex: async () => ({
        ...vexRecord,
        statements: [{ status: 'affected', products: [{ '@id': 'pkg:deb/ubuntu/openssl@1.0.0-2?arch=amd64&distro=ubuntu/noble' }] }]
      })
    })
  });
  const finding = result.findings.find(item => item.id === 'CVE-2026-12345');
  const matched = finding.components[0];
  assert.equal(matched.ubuntuOsv.status, 'patched_candidate');
  assert.equal(matched.ubuntuVex.status, 'affected');
  assert.equal(matched.ubuntuVex.consistency.status, 'conflicting');
  assert.equal(matched.applicability.status, 'patched_candidate');
  assert.equal(finding.applicabilityStatus, 'patched_candidate');
});

test('conflicting Ubuntu OSV advisories for the same CVE stay under review', async () => {
  const contradictoryRecord = {
    ...osvRecord,
    osvId: 'UBUNTU-CVE-2026-12345-SECOND',
    affected: [{
      ...osvRecord.affected[0],
      ecosystem_specific: {
        ...osvRecord.affected[0].ecosystem_specific,
        status: 'not-affected'
      }
    }]
  };
  const result = await analyzeInventory([component()], {
    sources: sources({
      fetchNvdByKeyword: async () => [],
      fetchUbuntuOsvForSourcePackage: async () => [osvRecord, contradictoryRecord],
      fetchCanonicalUbuntuVex: async () => vexRecord
    })
  });
  const finding = result.findings.find(item => item.id === 'CVE-2026-12345');
  const matched = finding.components[0];
  assert.equal(matched.ubuntuOsv.status, 'needs_review');
  assert.match(matched.ubuntuOsv.reason, /Multiple Ubuntu OSV advisories/);
  assert.equal(matched.ubuntuOsvEvidence.length, 2);
  assert.equal(matched.ubuntuVex.consistency.status, 'not_comparable');
});
