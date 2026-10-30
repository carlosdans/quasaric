import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyUbuntuOsvComponent } from './correlation.js';
import { classifyUbuntuOsvSourceVersion } from './ubuntuOsvApplicability.js';

// Minimal excerpts from Canonical's published OSV record (retrieved 2026-10-30):
// https://github.com/canonical/ubuntu-security-notices/blob/main/osv/cve/2025/UBUNTU-CVE-2025-9230.json
const record = {
  id: 'CVE-2025-9230', package: 'openssl', ecosystem: 'Ubuntu:24.04:LTS',
  affected: [
    {
      package: { name: 'openssl', ecosystem: 'Ubuntu:24.04:LTS' },
      versions: ['3.0.13-0ubuntu3', '3.0.13-0ubuntu3.1', '3.0.13-0ubuntu3.2', '3.0.13-0ubuntu3.3', '3.0.13-0ubuntu3.4', '3.0.13-0ubuntu3.5'],
      ranges: [{ type: 'ECOSYSTEM', events: [{ introduced: '0' }, { fixed: '3.0.13-0ubuntu3.6' }] }],
      ecosystem_specific: { binaries: [
        { binary_name: 'libssl3t64', binary_version: '3.0.13-0ubuntu3.6' },
        { binary_name: 'openssl', binary_version: '3.0.13-0ubuntu3.6' }
      ] }
    },
    {
      package: { name: 'openssl', ecosystem: 'Ubuntu:22.04:LTS' },
      versions: ['3.0.2-0ubuntu1', '3.0.2-0ubuntu1.1', '3.0.2-0ubuntu1.2', '3.0.2-0ubuntu1.4', '3.0.2-0ubuntu1.5', '3.0.2-0ubuntu1.6', '3.0.2-0ubuntu1.7', '3.0.2-0ubuntu1.8', '3.0.2-0ubuntu1.9', '3.0.2-0ubuntu1.10', '3.0.2-0ubuntu1.12', '3.0.2-0ubuntu1.13', '3.0.2-0ubuntu1.14', '3.0.2-0ubuntu1.15', '3.0.2-0ubuntu1.16', '3.0.2-0ubuntu1.17', '3.0.2-0ubuntu1.18', '3.0.2-0ubuntu1.19'],
      ranges: [{ type: 'ECOSYSTEM', events: [{ introduced: '0' }, { fixed: '3.0.2-0ubuntu1.20' }] }],
      ecosystem_specific: { binaries: [
        { binary_name: 'libssl3', binary_version: '3.0.2-0ubuntu1.20' },
        { binary_name: 'openssl', binary_version: '3.0.2-0ubuntu1.20' }
      ] }
    },
    {
      package: { name: 'openssl', ecosystem: 'Ubuntu:Pro:FIPS-preview:22.04:LTS' },
      versions: ['3.0.2-0ubuntu1.10+Fips1', '3.0.2-0ubuntu1.12+Fips1'],
      ranges: [{ type: 'ECOSYSTEM', events: [{ introduced: '0' }] }],
      ecosystem_specific: { binaries: [
        { binary_name: 'libssl3', binary_version: '3.0.2-0ubuntu1.12+Fips1' },
        { binary_name: 'openssl', binary_version: '3.0.2-0ubuntu1.12+Fips1' }
      ] }
    },
    {
      package: { name: 'openssl', ecosystem: 'Ubuntu:Pro:FIPS-updates:22.04:LTS' },
      versions: ['3.0.2-0ubuntu1.10+Fips1', '3.0.2-0ubuntu1.12+Fips1', '3.0.2-0ubuntu1.14+Fips1', '3.0.2-0ubuntu1.15+Fips1', '3.0.2-0ubuntu1.16+Fips1', '3.0.2-0ubuntu1.17+Fips1', '3.0.2-0ubuntu1.18+Fips1', '3.0.2-0ubuntu1.19+Fips1'],
      ranges: [{ type: 'ECOSYSTEM', events: [{ introduced: '0' }, { fixed: '3.0.2-0ubuntu1.20+Fips1' }] }],
      ecosystem_specific: { binaries: [
        { binary_name: 'libssl3', binary_version: '3.0.2-0ubuntu1.20+Fips1' },
        { binary_name: 'openssl', binary_version: '3.0.2-0ubuntu1.20+Fips1' }
      ] }
    },
    {
      package: { name: 'nodejs', ecosystem: 'Ubuntu:Pro:16.04:LTS' },
      versions: ['4.2.6~dfsg-1ubuntu4.2', '4.2.6~dfsg-1ubuntu4.2+esm1', '4.2.6~dfsg-1ubuntu4.2+esm2', '4.2.6~dfsg-1ubuntu4.2+esm3'],
      ranges: [{ type: 'ECOSYSTEM', events: [{ introduced: '0' }] }],
      ecosystem_specific: { binaries: [
        { binary_name: 'nodejs', binary_version: '4.2.6~dfsg-1ubuntu4.2+esm3' },
        { binary_name: 'nodejs-legacy', binary_version: '4.2.6~dfsg-1ubuntu4.2+esm3' }
      ] }
    }
  ]
};

test('Canonical OpenSSL fixed boundary is evaluated separately for Ubuntu 24.04', () => {
  const result = classifyUbuntuOsvComponent(record, {
    id: 'openssl-24', name: 'libssl3t64', version: '3.0.13-0ubuntu3.6',
    sourcePackage: 'openssl', sourceVersion: '3.0.13-0ubuntu3.6', ecosystem: 'Ubuntu:24.04:LTS'
  });
  assert.equal(result.status, 'patched_candidate');
  assert.equal(result.ubuntuSourceEvidence.ecosystem, 'Ubuntu:24.04:LTS');
  assert.equal(result.ubuntuBinaryEvidence[0].advisoryBinaryVersion, '3.0.13-0ubuntu3.6');
});

test('Canonical OpenSSL fixed boundary is evaluated separately for Ubuntu 22.04', () => {
  const result = classifyUbuntuOsvComponent(record, {
    id: 'openssl-22', name: 'libssl3', version: '3.0.2-0ubuntu1.20',
    sourcePackage: 'openssl', sourceVersion: '3.0.2-0ubuntu1.20', ecosystem: 'Ubuntu:22.04:LTS'
  });
  assert.equal(result.status, 'patched_candidate');
  assert.equal(result.ubuntuSourceEvidence.ecosystem, 'Ubuntu:22.04:LTS');
  assert.equal(result.ubuntuBinaryEvidence[0].advisoryBinaryVersion, '3.0.2-0ubuntu1.20');
});

test('Canonical Ubuntu Pro entry with no fixed event remains affected when explicitly listed', () => {
  const proRecord = { ...record, package: 'nodejs', ecosystem: 'Ubuntu:Pro:16.04:LTS' };
  const result = classifyUbuntuOsvComponent(proRecord, {
    id: 'nodejs-pro', name: 'nodejs', version: '4.2.6~dfsg-1ubuntu4.2+esm3',
    sourcePackage: 'nodejs', sourceVersion: '4.2.6~dfsg-1ubuntu4.2+esm3',
    ecosystem: 'Ubuntu:Pro:16.04:LTS'
  });
  assert.equal(result.status, 'affected');
  assert.equal(result.ubuntuSourceEvidence.classification, 'affected');
  assert.equal(result.ubuntuBinaryEvidence[0].binaryName, 'nodejs');
});

test('Canonical listed vulnerable source and binary builds below the fixed build are classified as affected', () => {
  const entry = record.affected.find(item => item.package.name === 'openssl' && item.package.ecosystem === 'Ubuntu:24.04:LTS');
  assert.equal(classifyUbuntuOsvSourceVersion(entry, '3.0.13-0ubuntu3.5').status, 'affected');
  const result = classifyUbuntuOsvComponent(record, {
    id: 'openssl-old', name: 'libssl3t64', version: '3.0.13-0ubuntu3.5',
    sourcePackage: 'openssl', sourceVersion: '3.0.13-0ubuntu3.5', ecosystem: 'Ubuntu:24.04:LTS'
  });
  assert.equal(result.status, 'affected');
  assert.equal(result.ubuntuBinaryEvidence[0].advisoryBinaryVersion, '3.0.13-0ubuntu3.6');
  assert.equal(result.ubuntuBinaryEvidence[0].installedBinaryVersion, '3.0.13-0ubuntu3.5');
});


test('Canonical FIPS-preview binaries without a fixed event are not treated as fixed boundaries', () => {
  const result = classifyUbuntuOsvComponent(record, {
    id: 'openssl-fips-preview', name: 'libssl3', version: '3.0.2-0ubuntu1.10+Fips1',
    sourcePackage: 'openssl', sourceVersion: '3.0.2-0ubuntu1.10+Fips1',
    ecosystem: 'Ubuntu:Pro:FIPS-preview:22.04:LTS'
  });
  assert.equal(result.status, 'affected');
  assert.equal(result.ubuntuBinaryEvidence[0].advisoryBinaryVersion, '3.0.2-0ubuntu1.12+Fips1');
  assert.match(result.reason, /exact source version is listed as affected/i);
});

test('Canonical FIPS-updates source and binary fixed boundaries are compared independently', () => {
  const affected = classifyUbuntuOsvComponent(record, {
    id: 'openssl-fips-updates-old', name: 'libssl3', version: '3.0.2-0ubuntu1.19+Fips1',
    sourcePackage: 'openssl', sourceVersion: '3.0.2-0ubuntu1.19+Fips1',
    ecosystem: 'Ubuntu:Pro:FIPS-updates:22.04:LTS'
  });
  const fixed = classifyUbuntuOsvComponent(record, {
    id: 'openssl-fips-updates-fixed', name: 'libssl3', version: '3.0.2-0ubuntu1.20+Fips1',
    sourcePackage: 'openssl', sourceVersion: '3.0.2-0ubuntu1.20+Fips1',
    ecosystem: 'Ubuntu:Pro:FIPS-updates:22.04:LTS'
  });
  assert.equal(affected.status, 'affected');
  assert.equal(fixed.status, 'patched_candidate');
  assert.equal(fixed.ubuntuBinaryEvidence[0].advisoryBinaryVersion, '3.0.2-0ubuntu1.20+Fips1');
});

test('an exact binary from Ubuntu 24.04 cannot cross-match the Ubuntu 22.04 entry', () => {
  const result = classifyUbuntuOsvComponent(record, {
    id: 'wrong-release', name: 'libssl3t64', version: '3.0.13-0ubuntu3.6',
    sourcePackage: 'openssl', sourceVersion: '3.0.13-0ubuntu3.6', ecosystem: 'Ubuntu:22.04:LTS'
  });
  assert.equal(result.status, 'needs_review');
  assert.deepEqual(result.ubuntuBinaryEvidence, []);
});


// Minimal excerpts from Canonical's published records:
// https://github.com/canonical/ubuntu-security-notices/blob/main/osv/cve/2026/UBUNTU-CVE-2026-14164.json
// https://github.com/canonical/ubuntu-security-notices/blob/main/osv/cve/2026/UBUNTU-CVE-2026-54371.json
const libarchiveRecord = {
  id: 'CVE-2026-14164', package: 'libarchive', ecosystem: 'Ubuntu:24.04:LTS',
  affected: [
    {
      package: { name: 'libarchive', ecosystem: 'Ubuntu:Pro:20.04:LTS' },
      versions: ['3.4.0-2ubuntu1.5', '3.4.0-2ubuntu1.5+esm1', '3.4.0-2ubuntu1.5+esm2'],
      ranges: [{ type: 'ECOSYSTEM', events: [{ introduced: '0' }, { fixed: '3.4.0-2ubuntu1.5+esm3' }] }],
      ecosystem_specific: { binaries: [
        { binary_name: 'libarchive-tools', binary_version: '3.4.0-2ubuntu1.5+esm3' },
        { binary_name: 'libarchive13', binary_version: '3.4.0-2ubuntu1.5+esm3' }
      ] }
    },
    {
      package: { name: 'libarchive', ecosystem: 'Ubuntu:24.04:LTS' },
      versions: ['3.6.2-1ubuntu1', '3.7.2-1ubuntu1', '3.7.2-1ubuntu2', '3.7.2-1.1ubuntu2', '3.7.2-2', '3.7.2-2ubuntu0.1', '3.7.2-2ubuntu0.2', '3.7.2-2ubuntu0.3', '3.7.2-2ubuntu0.4', '3.7.2-2ubuntu0.5', '3.7.2-2ubuntu0.6', '3.7.2-2ubuntu0.7'],
      ranges: [{ type: 'ECOSYSTEM', events: [{ introduced: '0' }, { fixed: '3.7.2-2ubuntu0.8' }] }],
      ecosystem_specific: { binaries: [
        { binary_name: 'libarchive-tools', binary_version: '3.7.2-2ubuntu0.8' },
        { binary_name: 'libarchive13t64', binary_version: '3.7.2-2ubuntu0.8' }
      ] }
    },
    {
      package: { name: 'libarchive', ecosystem: 'Ubuntu:25.10' },
      versions: ['3.7.7-0ubuntu2', '3.7.7-0ubuntu2.1', '3.7.7-0ubuntu2.2', '3.7.7-0ubuntu3', '3.7.7-0ubuntu3.1', '3.7.7-0ubuntu3.2'],
      ranges: [{ type: 'ECOSYSTEM', events: [{ introduced: '0' }] }],
      ecosystem_specific: { binaries: [
        { binary_name: 'libarchive-tools', binary_version: '3.7.7-0ubuntu3.2' },
        { binary_name: 'libarchive13t64', binary_version: '3.7.7-0ubuntu3.2' }
      ] }
    }
  ]
};

const attrRecord = {
  id: 'CVE-2026-54371', package: 'attr', ecosystem: 'Ubuntu:24.04:LTS',
  affected: [
    {
      package: { name: 'attr', ecosystem: 'Ubuntu:Pro:14.04:LTS' },
      versions: ['1:2.4.47-1', '1:2.4.47-1ubuntu1'],
      ranges: [{ type: 'ECOSYSTEM', events: [{ introduced: '0' }, { fixed: '1:2.4.47-1ubuntu1+esm1' }] }],
      ecosystem_specific: { binaries: [
        { binary_name: 'attr', binary_version: '1:2.4.47-1ubuntu1+esm1' },
        { binary_name: 'libattr1', binary_version: '1:2.4.47-1ubuntu1+esm1' }
      ] }
    },
    {
      package: { name: 'attr', ecosystem: 'Ubuntu:24.04:LTS' },
      versions: ['1:2.5.1-4', '1:2.5.1-5', '1:2.5.2-1', '1:2.5.2-1build1', '1:2.5.2-1build1.1'],
      ranges: [{ type: 'ECOSYSTEM', events: [{ introduced: '0' }, { fixed: '1:2.5.2-1ubuntu0.1' }] }],
      ecosystem_specific: { binaries: [
        { binary_name: 'attr', binary_version: '1:2.5.2-1ubuntu0.1' },
        { binary_name: 'libattr1', binary_version: '1:2.5.2-1ubuntu0.1' }
      ] }
    }
  ]
};

test('Canonical multi-binary source entry maps each listed libarchive binary independently', () => {
  for (const binary of ['libarchive-tools', 'libarchive13t64']) {
    const result = classifyUbuntuOsvComponent(libarchiveRecord, {
      id: `libarchive-${binary}`, name: binary, version: '3.7.2-2ubuntu0.7',
      sourcePackage: 'libarchive', sourceVersion: '3.7.2-2ubuntu0.7',
      ecosystem: 'Ubuntu:24.04:LTS'
    });
    assert.equal(result.status, 'affected', binary);
    assert.equal(result.ubuntuBinaryEvidence.length, 1, binary);
    assert.equal(result.ubuntuBinaryEvidence[0].binaryName, binary);
  }
});

test('Canonical Ubuntu Pro ESM source and binary fixed versions preserve +esm suffix ordering', () => {
  const affected = classifyUbuntuOsvComponent(libarchiveRecord, {
    id: 'libarchive-esm-old', name: 'libarchive13', version: '3.4.0-2ubuntu1.5+esm2',
    sourcePackage: 'libarchive', sourceVersion: '3.4.0-2ubuntu1.5+esm2',
    ecosystem: 'Ubuntu:Pro:20.04:LTS'
  });
  const fixed = classifyUbuntuOsvComponent(libarchiveRecord, {
    id: 'libarchive-esm-fixed', name: 'libarchive13', version: '3.4.0-2ubuntu1.5+esm3',
    sourcePackage: 'libarchive', sourceVersion: '3.4.0-2ubuntu1.5+esm3',
    ecosystem: 'Ubuntu:Pro:20.04:LTS'
  });
  assert.equal(affected.status, 'affected');
  assert.equal(fixed.status, 'patched_candidate');
  assert.equal(fixed.ubuntuBinaryEvidence[0].advisoryBinaryVersion, '3.4.0-2ubuntu1.5+esm3');
});

test('Canonical epoch-bearing Debian versions classify vulnerable and fixed builds correctly', () => {
  const affected = classifyUbuntuOsvComponent(attrRecord, {
    id: 'attr-epoch-old', name: 'libattr1', version: '1:2.5.2-1build1.1',
    sourcePackage: 'attr', sourceVersion: '1:2.5.2-1build1.1',
    ecosystem: 'Ubuntu:24.04:LTS'
  });
  const fixed = classifyUbuntuOsvComponent(attrRecord, {
    id: 'attr-epoch-fixed', name: 'libattr1', version: '1:2.5.2-1ubuntu0.1',
    sourcePackage: 'attr', sourceVersion: '1:2.5.2-1ubuntu0.1',
    ecosystem: 'Ubuntu:24.04:LTS'
  });
  assert.equal(affected.status, 'affected');
  assert.equal(fixed.status, 'patched_candidate');
  assert.equal(fixed.ubuntuBinaryEvidence[0].advisoryBinaryVersion, '1:2.5.2-1ubuntu0.1');
});

test('Canonical Ubuntu OSV entry without a fixed event does not imply unaffected for an unlisted version', () => {
  const result = classifyUbuntuOsvComponent(libarchiveRecord, {
    id: 'libarchive-no-fixed-evidence', name: 'libarchive-tools', version: '3.7.7-0ubuntu3.3',
    sourcePackage: 'libarchive', sourceVersion: '3.7.7-0ubuntu3.3',
    ecosystem: 'Ubuntu:25.10'
  });
  assert.equal(result.status, 'needs_review');
  assert.match(result.reason, /not proven affected or fixed|no usable source-version evidence/i);
});
