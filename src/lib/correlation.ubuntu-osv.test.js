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
      { binary_name: 'libssl3t64', binary_version: '3.0.13-0ubuntu3.2' }
    ] }
  }]
};
const component = (overrides = {}) => ({
  id: 'pkg-1', name: 'libssl3t64', version: '3.0.13-0ubuntu3.1',
  sourcePackage: 'openssl', sourceVersion: '3.0.13-0ubuntu3',
  ecosystem: 'Ubuntu:24.04:LTS', ...overrides
});

test('requires source-version and binary-to-source mapping to classify affected', () => {
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

test('source version and binary build at fixed boundaries remain a candidate, not confirmed remediation', () => {
  const result = classifyUbuntuOsvComponent(record, component({ version: '3.0.13-0ubuntu3.2', sourceVersion: '3.0.13-0ubuntu3.2' }));
  assert.equal(result.status, 'patched_candidate');
});

test('a fixed binary build conflicts with an affected source version', () => {
  const result = classifyUbuntuOsvComponent(record, component({ version: '3.0.13-0ubuntu3.2' }));
  assert.equal(result.status, 'needs_review');
  assert.equal(result.ubuntuBinaryEvidence.length, 1);
  assert.match(result.reason, /evidence conflicts/i);
});

test('does not call an older source version affected when the installed binary is already at the fixed build', () => {
  const result = classifyUbuntuOsvComponent(record, component({
    version: '3.0.13-0ubuntu3.2',
    sourceVersion: '3.0.13-0ubuntu3'
  }));
  assert.equal(result.status, 'needs_review');
  assert.match(result.reason, /evidence conflicts/i);
});

test('keeps a patched source version under review when its binary is below the fixed build', () => {
  const result = classifyUbuntuOsvComponent(record, component({
    version: '3.0.13-0ubuntu3.1',
    sourceVersion: '3.0.13-0ubuntu3.2'
  }));
  assert.equal(result.status, 'needs_review');
  assert.match(result.reason, /below the published fixed build/i);
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


test('binary evidence from another source package cannot validate this component', () => {
  const multiSourceRecord = {
    ...record,
    affected: [
      ...record.affected,
      {
        package: { name: 'curl', ecosystem: 'Ubuntu:24.04:LTS' },
        versions: ['8.5.0-2ubuntu10'],
        ranges: [{ type: 'ECOSYSTEM', events: [{ introduced: '0' }, { fixed: '8.5.0-2ubuntu10.2' }] }],
        ecosystem_specific: { binaries: [
          { binary_name: 'curl', binary_version: '8.5.0-2ubuntu10.1' }
        ] }
      }
    ]
  };
  const result = classifyUbuntuOsvComponent(
    multiSourceRecord,
    component({ name: 'curl', version: '8.5.0-2ubuntu10.1' })
  );
  assert.equal(result.status, 'needs_review');
  assert.deepEqual(result.ubuntuBinaryEvidence, []);
  assert.match(result.reason, /binary package name is not listed/i);
});

test('evaluates all duplicate Ubuntu OSV entries for the same source package and release', () => {
  const multiEntry = {
    ...record,
    affected: [
      {
        ...record.affected[0],
        versions: [],
        ranges: [{ type: 'ECOSYSTEM', events: [
          { introduced: '9.0-1' }, { fixed: '10.0-1' }
        ] }]
      },
      {
        ...record.affected[0],
        versions: [],
        ranges: [{ type: 'ECOSYSTEM', events: [
          { introduced: '0' }, { fixed: '3.0.13-0ubuntu3.2' }
        ] }]
      }
    ]
  };
  const result = classifyUbuntuOsvComponent(multiEntry, component());
  assert.equal(result.status, 'affected');
  assert.equal(result.ubuntuSourceEvidence.classification, 'affected');
});

test('keeps contradictory Ubuntu OSV source entries under manual review', () => {
  const multiEntry = {
    ...record,
    affected: [
      { ...record.affected[0], versions: ['3.0.13-0ubuntu3.1'], ranges: [] },
      { ...record.affected[0], versions: [], ranges: [
        { type: 'ECOSYSTEM', events: [{ introduced: '0' }, { fixed: '3.0.13-0ubuntu3.1' }] }
      ] }
    ]
  };
  const result = classifyUbuntuOsvComponent(multiEntry, component({ sourceVersion: '3.0.13-0ubuntu3.1' }));
  assert.equal(result.status, 'needs_review');
  assert.match(result.reason, /conflicting source-version assessments/i);
});


test('does not classify a binary as affected when a fixed source boundary exists but no fixed binary build is published', () => {
  const incompleteBinaryEvidence = {
    ...record,
    affected: [{
      ...record.affected[0],
      ecosystem_specific: {
        ...record.affected[0].ecosystem_specific,
        binaries: [{ binary_name: 'libssl3t64' }]
      }
    }]
  };
  const result = classifyUbuntuOsvComponent(incompleteBinaryEvidence, component());
  assert.equal(result.status, 'needs_review');
  assert.equal(result.ubuntuSourceEvidence.classification, 'affected');
  assert.equal(result.ubuntuBinaryEvidence.length, 1);
  assert.match(result.reason, /does not publish a fixed binary build/i);
});

test('an explicitly affected source version can remain a candidate when no fixed source boundary exists', () => {
  const noFixedBoundary = {
    ...record,
    affected: [{
      ...record.affected[0],
      ranges: [],
      ecosystem_specific: {
        ...record.affected[0].ecosystem_specific,
        binaries: [{ binary_name: 'libssl3t64' }]
      }
    }]
  };
  const result = classifyUbuntuOsvComponent(noFixedBoundary, component());
  assert.equal(result.status, 'affected');
});

test('does not let an explicit not-affected entry override an incomplete source assessment', () => {
  const mixedEvidence = {
    ...record,
    affected: [
      {
        ...record.affected[0],
        ecosystem_specific: {
          ...record.affected[0].ecosystem_specific,
          status: 'not-affected'
        }
      },
      {
        package: { name: 'openssl', ecosystem: 'Ubuntu:24.04:LTS' },
        ecosystem_specific: { binaries: [
          { binary_name: 'libssl3t64', binary_version: '3.0.13-0ubuntu3.2' }
        ] }
      }
    ]
  };
  const result = classifyUbuntuOsvComponent(mixedEvidence, component());
  assert.equal(result.status, 'needs_review');
  assert.match(result.reason, /conflicting or incomplete/i);
});
