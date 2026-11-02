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
