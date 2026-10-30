import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyCanonicalUbuntuVexComponent } from './correlation.js';

const sourcePurl = 'pkg:deb/ubuntu/openssl@3.0.13-0ubuntu3.6?arch=source&distro=esm-infra-legacy/trusty';
const record = {
  affected: [{
    package: { name: 'openssl', ecosystem: 'Ubuntu:Pro:14.04:LTS', purl: sourcePurl }
  }]
};
const component = {
  id: 'libssl1',
  name: 'libssl1.0.0',
  version: '1.0.1f-1ubuntu2.27+esm17',
  architecture: 'amd64',
  sourcePackage: 'openssl',
  ecosystem: 'Ubuntu:Pro:14.04:LTS'
};
const vex = (status, purl = 'pkg:deb/ubuntu/libssl1.0.0@1.0.1f-1ubuntu2.27+esm17?arch=amd64&distro=esm-infra-legacy/trusty') => ({
  '@id': 'https://github.com/canonical/ubuntu-security-notices/blob/main/vex/cve/2025/CVE-2025-9230',
  timestamp: '2026-10-22T01:50:19Z',
  version: 26,
  statements: [{ status, products: [{ '@id': purl }] }]
});

test('attaches exact Canonical OpenVEX status as independent product evidence', () => {
  const result = classifyCanonicalUbuntuVexComponent(vex('fixed'), record, component);
  assert.equal(result.status, 'fixed');
  assert.equal(result.source, 'Canonical OpenVEX');
  assert.equal(result.documentTimestamp, '2026-10-22T01:50:19Z');
  assert.equal(result.documentVersion, 26);
});

test('preserves all supported OpenVEX statuses without converting them to OSV applicability', () => {
  for (const status of ['affected', 'fixed', 'not_affected', 'under_investigation']) {
    assert.equal(classifyCanonicalUbuntuVexComponent(vex(status), record, component).status, status);
  }
});

test('missing architecture or source PURL remains needs_review', () => {
  assert.equal(classifyCanonicalUbuntuVexComponent(vex('fixed'), record, { ...component, architecture: '' }).status, 'needs_review');
  assert.equal(classifyCanonicalUbuntuVexComponent(vex('fixed'), { affected: [{ package: { name: 'openssl', ecosystem: 'Ubuntu:Pro:14.04:LTS' } }] }, component).status, 'needs_review');
});

test('does not cross-match a different Ubuntu Pro distro', () => {
  const wrongDistro = vex('fixed', 'pkg:deb/ubuntu/libssl1.0.0@1.0.1f-1ubuntu2.27+esm17?arch=amd64&distro=esm-apps/xenial');
  assert.equal(classifyCanonicalUbuntuVexComponent(wrongDistro, record, component).status, 'needs_review');
});

test('does not reuse a status when source package and Ubuntu ecosystem disagree', () => {
  const wrongSource = { affected: [{ package: { name: 'other-source', ecosystem: 'Ubuntu:Pro:14.04:LTS', purl: sourcePurl } }] };
  assert.equal(classifyCanonicalUbuntuVexComponent(vex('fixed'), wrongSource, component).status, 'needs_review');
});
