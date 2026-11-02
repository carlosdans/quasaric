import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyVersionRange } from './universalVersions.js';

// Real NVD configuration ranges for CVE-2021-44228 (Apache Log4j).
// Source: https://nvd.nist.gov/vuln/detail/CVE-2021-44228
const log4jCore = { name: 'log4j-core', vendor: 'Apache Software Foundation' };

const nvdRanges = [
  {
    versionStartIncluding: '2.0.1',
    versionEndExcluding: '2.3.1',
    before: '2.0.0',
    affected: '2.0.1',
    fixed: '2.3.1'
  },
  {
    versionStartIncluding: '2.4.0',
    versionEndExcluding: '2.12.2',
    before: '2.3.9',
    affected: '2.11.0',
    fixed: '2.12.2'
  },
  {
    versionStartIncluding: '2.13.0',
    versionEndExcluding: '2.15.0',
    before: '2.12.3',
    affected: '2.14.1',
    fixed: '2.15.0'
  }
];

test('classifies real NVD CVE-2021-44228 Log4j version ranges at both boundaries', () => {
  for (const range of nvdRanges) {
    assert.equal(
      classifyVersionRange(range.before, range, log4jCore).status,
      'not_affected',
      `version ${range.before} must be below the NVD lower bound`
    );
    assert.equal(
      classifyVersionRange(range.affected, range, log4jCore).status,
      'affected_candidate',
      `version ${range.affected} must be inside the NVD affected range`
    );
    assert.equal(
      classifyVersionRange(range.fixed, range, log4jCore).status,
      'not_affected',
      `version ${range.fixed} is the exclusive NVD upper bound`
    );
  }
});

test('keeps the NVD Log4j range conservative for unorderable vendor versions', () => {
  const range = {
    versionStartIncluding: '2.13.0',
    versionEndExcluding: '2.15.0'
  };
  assert.equal(
    classifyVersionRange('2.14.1-redhat', range, log4jCore).status,
    'needs_review'
  );
});
