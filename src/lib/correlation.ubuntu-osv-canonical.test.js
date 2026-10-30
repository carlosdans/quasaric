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
  assert.equal(result.ubuntuBinaryEvidence[0].fixedBinaryVersion, '3.0.13-0ubuntu3.6');
});

test('Canonical OpenSSL fixed boundary is evaluated separately for Ubuntu 22.04', () => {
  const result = classifyUbuntuOsvComponent(record, {
    id: 'openssl-22', name: 'libssl3', version: '3.0.2-0ubuntu1.20',
    sourcePackage: 'openssl', sourceVersion: '3.0.2-0ubuntu1.20', ecosystem: 'Ubuntu:22.04:LTS'
  });
  assert.equal(result.status, 'patched_candidate');
  assert.equal(result.ubuntuSourceEvidence.ecosystem, 'Ubuntu:22.04:LTS');
  assert.equal(result.ubuntuBinaryEvidence[0].fixedBinaryVersion, '3.0.2-0ubuntu1.20');
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
  assert.equal(result.ubuntuBinaryEvidence[0].fixedBinaryVersion, '3.0.13-0ubuntu3.6');
  assert.equal(result.ubuntuBinaryEvidence[0].installedBinaryVersion, '3.0.13-0ubuntu3.5');
});

test('an exact binary from Ubuntu 24.04 cannot cross-match the Ubuntu 22.04 entry', () => {
  const result = classifyUbuntuOsvComponent(record, {
    id: 'wrong-release', name: 'libssl3t64', version: '3.0.13-0ubuntu3.6',
    sourcePackage: 'openssl', sourceVersion: '3.0.13-0ubuntu3.6', ecosystem: 'Ubuntu:22.04:LTS'
  });
  assert.equal(result.status, 'needs_review');
  assert.deepEqual(result.ubuntuBinaryEvidence, []);
});
