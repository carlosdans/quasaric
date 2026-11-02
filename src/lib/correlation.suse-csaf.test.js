import test from 'node:test';
import assert from 'node:assert/strict';
import { matchSuseCsafVexComponent } from './vulnerabilitySources.js';

const vex = {
  document: { csaf_version: '2.0', category: 'csaf_vex' },
  product_tree: {
    branches: [{
      category: 'vendor', name: 'SUSE',
      branches: [{
        category: 'product_version', name: 'openssl',
        product: { name: 'openssl', product_id: 'openssl-sles15-x86_64',
          product_identification_helper: { purl: 'pkg:rpm/suse/openssl?arch=x86_64' } }
      }]
    }]
  },
  vulnerabilities: [{
    cve: 'CVE-2026-12345',
    product_status: { known_affected: ['openssl-sles15-x86_64'], fixed: [] },
    remediations: [{ category: 'vendor_fix', details: 'Install the vendor update.', product_ids: ['openssl-sles15-x86_64'], url: 'https://www.suse.com/security/' }]
  }]
};

test('matches SUSE VEX only by exact RPM PURL identity and preserves VEX status', () => {
  const result = matchSuseCsafVexComponent(vex, {
    ecosystem: 'SUSE Linux Enterprise Server 15 SP6',
    purl: 'pkg:rpm/suse/openssl?arch=x86_64'
  }, 'CVE-2026-12345');
  assert.equal(result.status, 'vendor_evidence');
  assert.deepEqual(result.productStatuses, ['known_affected']);
  assert.equal(result.products[0].productId, 'openssl-sles15-x86_64');
  assert.equal(result.remediations[0].category, 'vendor_fix');
});

test('rejects missing PURLs, other distros, mismatched architectures and CVEs', () => {
  assert.equal(matchSuseCsafVexComponent(vex, {
    ecosystem: 'SUSE Linux Enterprise Server 15', name: 'openssl'
  }, 'CVE-2026-12345').status, 'needs_review');
  assert.equal(matchSuseCsafVexComponent(vex, {
    ecosystem: 'openSUSE Leap 16', purl: 'pkg:rpm/opensuse/openssl?arch=x86_64'
  }, 'CVE-2026-12345').status, 'needs_review');
  assert.equal(matchSuseCsafVexComponent(vex, {
    ecosystem: 'SUSE Linux Enterprise Server 15', purl: 'pkg:rpm/suse/openssl?arch=aarch64'
  }, 'CVE-2026-12345').status, 'needs_review');
  assert.equal(matchSuseCsafVexComponent(vex, {
    ecosystem: 'SUSE Linux Enterprise Server 15', purl: 'pkg:rpm/suse/openssl?arch=x86_64'
  }, 'CVE-2026-99999').status, 'needs_review');
});

test('requires review when SUSE CSAF assigns conflicting VEX states to one product', () => {
  const conflicting = structuredClone(vex);
  conflicting.vulnerabilities[0].product_status.fixed = ['openssl-sles15-x86_64'];
  const result = matchSuseCsafVexComponent(conflicting, {
    ecosystem: 'SUSE Linux Enterprise Server 15 SP6',
    purl: 'pkg:rpm/suse/openssl?arch=x86_64'
  }, 'CVE-2026-12345');
  assert.equal(result.status, 'needs_review');
  assert.deepEqual(result.productStatuses, ['fixed', 'known_affected']);
  assert.match(result.reason, /contradictorios/i);
});

test('does not attach SUSE VEX evidence from a different published RPM version', () => {
  const versionedVex = structuredClone(vex);
  versionedVex.product_tree.branches[0].branches[0].product.product_identification_helper.purl =
    'pkg:rpm/suse/openssl@3.0.8-1?arch=x86_64';
  const result = matchSuseCsafVexComponent(versionedVex, {
    ecosystem: 'SUSE Linux Enterprise Server 15 SP6',
    purl: 'pkg:rpm/suse/openssl@3.0.7-1?arch=x86_64'
  }, 'CVE-2026-12345');
  assert.equal(result.status, 'needs_review');
  assert.match(result.reason, /versión/i);
});

test('uses exact SUSE PURL version when available and lowers confidence when version is omitted', () => {
  const versionedVex = structuredClone(vex);
  versionedVex.product_tree.branches[0].branches[0].product.product_identification_helper.purl =
    'pkg:rpm/suse/openssl@3.0.8-1?arch=x86_64';
  const exact = matchSuseCsafVexComponent(versionedVex, {
    ecosystem: 'SUSE Linux Enterprise Server 15 SP6',
    purl: 'pkg:rpm/suse/openssl@3.0.8-1?arch=x86_64'
  }, 'CVE-2026-12345');
  assert.equal(exact.status, 'vendor_evidence');
  assert.equal(exact.versionMatch, 'exact');
  const unversionedVex = matchSuseCsafVexComponent(vex, {
    ecosystem: 'SUSE Linux Enterprise Server 15 SP6',
    purl: 'pkg:rpm/suse/openssl@3.0.8-1?arch=x86_64'
  }, 'CVE-2026-12345');
  assert.equal(unversionedVex.status, 'vendor_evidence');
  assert.equal(unversionedVex.versionMatch, 'not_specified');
  assert.equal(unversionedVex.confidence, 'medium');
});

test('does not combine version and architecture evidence from separate SUSE PURLs', () => {
  const splitIdentityVex = structuredClone(vex);
  splitIdentityVex.product_tree.branches[0].branches[0].product.product_identification_helper.purls = [
    'pkg:rpm/suse/openssl@3.0.8-1',
    'pkg:rpm/suse/openssl?arch=x86_64'
  ];
  const result = matchSuseCsafVexComponent(splitIdentityVex, {
    ecosystem: 'SUSE Linux Enterprise Server 15 SP6',
    purl: 'pkg:rpm/suse/openssl@3.0.8-1?arch=x86_64'
  }, 'CVE-2026-12345');
  assert.equal(result.status, 'vendor_evidence');
  assert.equal(result.versionMatch, 'exact');
  assert.equal(result.architectureMatch, 'not_specified');
  assert.equal(result.confidence, 'medium');
});
