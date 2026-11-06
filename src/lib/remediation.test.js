import test from 'node:test';
import assert from 'node:assert/strict';
import { buildRemediationGuidance, buildFindingRemediation, buildRemediationCommand } from './remediation.js';

const component = {
  name: 'libssl3', version: '3.0.2-0ubuntu1.17',
  sourcePackage: 'openssl', ecosystem: 'Ubuntu:24.04:LTS'
};
const affectedAssessment = {
  component,
  ubuntuOsv: {
    status: 'affected',
    ubuntuBinaryEvidence: [{
      binaryName: 'libssl3', installedBinaryVersion: component.version,
      sourcePackage: 'openssl', ecosystem: component.ecosystem,
      advisoryBinaryVersion: '3.0.2-0ubuntu1.18'
    }]
  },
  evidence: [{ source: 'Ubuntu OSV', url: 'https://osv.dev/vulnerability/UBUNTU-CVE-2024-0001',
    references: ['https://ubuntu.com/security/notices/USN-0001-1'] }]
};

test('provides a concrete target only for one exact matched Ubuntu binary build', () => {
  const result = buildRemediationGuidance({ id: 'CVE-2024-0001' }, affectedAssessment);
  assert.equal(result.status, 'update_candidate');
  assert.equal(result.targetVersion, '3.0.2-0ubuntu1.18');
  assert.equal(result.confirmed, false);
  assert.ok(result.references.includes('https://ubuntu.com/security/notices/USN-0001-1'));
});

test('withholds target when advisory has multiple candidate fixed builds', () => {
  const assessment = {
    ...affectedAssessment,
    ubuntuOsv: {
      ...affectedAssessment.ubuntuOsv,
      ubuntuBinaryEvidence: [
        ...affectedAssessment.ubuntuOsv.ubuntuBinaryEvidence,
        { ...affectedAssessment.ubuntuOsv.ubuntuBinaryEvidence[0], advisoryBinaryVersion: '3.0.2-0ubuntu1.19' }
      ]
    }
  };
  assert.equal(buildRemediationGuidance({}, assessment).status, 'manual_review');
  assert.equal(buildRemediationGuidance({}, assessment).targetVersion, null);
});

test('does not recommend an update when binary identity or installed version differs', () => {
  const assessment = {
    ...affectedAssessment,
    ubuntuOsv: {
      ...affectedAssessment.ubuntuOsv,
      ubuntuBinaryEvidence: [{
        ...affectedAssessment.ubuntuOsv.ubuntuBinaryEvidence[0],
        installedBinaryVersion: '3.0.2-0ubuntu1.16'
      }]
    }
  };
  assert.equal(buildRemediationGuidance({}, assessment).status, 'manual_review');
});

test('patched candidate remains unconfirmed and does not suggest another update', () => {
  const result = buildRemediationGuidance({}, {
    component, ubuntuOsv: { status: 'patched_candidate' }, evidence: []
  });
  assert.equal(result.status, 'fix_candidate_present');
  assert.equal(result.targetVersion, null);
  assert.equal(result.confirmed, false);
});

test('generic and incomplete assessments require manual review with references', () => {
  const result = buildRemediationGuidance({ references: [{ url: 'https://vendor.example.org/advisory' }] }, {
    component, evidence: []
  });
  assert.equal(result.status, 'manual_review');
  assert.deepEqual(result.references, ['https://vendor.example.org/advisory']);
});

test('builds guidance separately for each affected component', () => {
  const result = buildFindingRemediation({ id: 'CVE-2024-0001', components: [affectedAssessment] });
  assert.equal(result.length, 1);
  assert.equal(result[0].component, component);
  assert.equal(result[0].guidance.targetVersion, '3.0.2-0ubuntu1.18');
});

test('builds a shell-quoted Ubuntu upgrade command only for a concrete candidate', () => {
  const guidance = buildRemediationGuidance({}, affectedAssessment);
  assert.equal(buildRemediationCommand(guidance), "sudo apt-get install --only-upgrade -- 'libssl3=3.0.2-0ubuntu1.18'");
  assert.equal(buildRemediationCommand({ ...guidance, packageName: "pkg' --help" }),
    "sudo apt-get install --only-upgrade -- 'pkg'\\'' --help=3.0.2-0ubuntu1.18'");
});

test('does not produce commands for manual review, generic ecosystems or missing targets', () => {
  assert.equal(buildRemediationCommand({ status: 'manual_review', packageName: 'libssl3', targetVersion: '1.2', ecosystem: 'Ubuntu:24.04' }), null);
  assert.equal(buildRemediationCommand({ status: 'update_candidate', packageName: 'libssl3', targetVersion: '1.2', ecosystem: 'Debian:12' }), null);
  assert.equal(buildRemediationCommand({ status: 'update_candidate', packageName: 'libssl3', targetVersion: '1.2' }), null);
});
