import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyUbuntuOsvComponent, summarizeApplicabilityStatus } from './correlation.js';

const record = {
  package: 'openssl',
  ecosystem: 'Ubuntu:24.04:LTS',
  affected: [{
    package: { name: 'openssl', ecosystem: 'Ubuntu:24.04:LTS' },
    versions: ['3.0.13-0ubuntu3'],
    ranges: [{ type: 'ECOSYSTEM', events: [{ introduced: '0' }, { fixed: '3.0.13-0ubuntu3.2' }] }],
    ecosystem_specific: { binaries: [
      { binary_name: 'libssl3t64', binary_version: '3.0.13-0ubuntu3.1' }
    ] }
  }]
};
const component = (overrides = {}) => ({
  id: 'pkg-1', name: 'libssl3t64', version: '3.0.13-0ubuntu3.1',
  sourcePackage: 'openssl', sourceVersion: '3.0.13-0ubuntu3',
  ecosystem: 'Ubuntu:24.04:LTS', ...overrides
});

test('requires source-version and exact binary evidence to classify affected', () => {
  const result = classifyUbuntuOsvComponent(record, component());
  assert.equal(result.status, 'affected');
  assert.equal(result.ubuntuSourceEvidence.classification, 'affected');
  assert.equal(result.ubuntuBinaryEvidence.length, 1);
});

test('binary match does not replace missing source version', () => {
  const result = classifyUbuntuOsvComponent(record, component({ sourceVersion: '' }));
  assert.equal(result.status, 'needs_review');
  assert.equal(result.ubuntuSourceEvidence.classification, 'needs_review');
});

test('source version at fixed boundary remains a candidate, not confirmed remediation', () => {
  const result = classifyUbuntuOsvComponent(record, component({ sourceVersion: '3.0.13-0ubuntu3.2' }));
  assert.equal(result.status, 'patched_candidate');
});

test('a binary version mismatch prevents a positive source classification', () => {
  const result = classifyUbuntuOsvComponent(record, component({ version: '3.0.13-0ubuntu3.2' }));
  assert.equal(result.status, 'needs_review');
  assert.deepEqual(result.ubuntuBinaryEvidence, []);
});

test('source package and Ubuntu release must match the exact affected entry', () => {
  const wrongPackage = classifyUbuntuOsvComponent(record, component({ sourcePackage: 'libssl3t64' }));
  const wrongRelease = classifyUbuntuOsvComponent(record, component({ ecosystem: 'Ubuntu:22.04:LTS' }));
  assert.equal(wrongPackage.status, 'needs_review');
  assert.equal(wrongRelease.status, 'needs_review');
});

test('explicit not-affected status requires exact binary evidence too', () => {
  const explicit = { ...record, affected: [{
    ...record.affected[0], ecosystem_specific: {
      ...record.affected[0].ecosystem_specific, status: 'not-affected'
    }
  }] };
  assert.equal(classifyUbuntuOsvComponent(explicit, component()).status, 'unaffected');
});


test('summary keeps a single shared component status', () => {
  assert.equal(summarizeApplicabilityStatus([
    { applicability: { status: 'affected' } },
    { applicability: { status: 'affected' } }
  ]), 'affected');
});

test('summary is conservative when components have conflicting statuses', () => {
  assert.equal(summarizeApplicabilityStatus([
    { applicability: { status: 'affected' } },
    { applicability: { status: 'unaffected' } }
  ]), 'needs_review');
});

test('summary does not promote a partial result over missing evidence', () => {
  assert.equal(summarizeApplicabilityStatus([
    { applicability: { status: 'patched_candidate' } },
    { applicability: { status: 'needs_review' } }
  ]), 'needs_review');
});
