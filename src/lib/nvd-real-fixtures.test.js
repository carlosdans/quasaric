import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyVersionRange } from './universalVersions.js';
import { classifyCpeApplicability, cpeMatchesComponent } from './correlation.js';

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


// Real NVD CPE configurations:
// CVE-2026-47360: https://nvd.nist.gov/vuln/detail/CVE-2026-47360
// CVE-2023-44487: https://nvd.nist.gov/vuln/detail/CVE-2023-44487

test('classifies the NVD Apache HTTP Server CVE-2026-47360 range at its boundaries', () => {
  const cpeItems = [{
    criteria: 'cpe:2.3:a:apache:http_server:*:*:*:*:*:*:*:*',
    vulnerable: true,
    versionStartIncluding: '2.4.60',
    versionEndExcluding: '2.4.69'
  }];
  const classify = version => classifyCpeApplicability(cpeItems, {
    name: 'Apache HTTP Server',
    version
  }).status;

  assert.equal(classify('2.4.59'), 'not_affected');
  assert.equal(classify('2.4.60'), 'possible');
  assert.equal(classify('2.4.68'), 'possible');
  assert.equal(classify('2.4.69'), 'not_affected');
});

test('does not confuse the F5 NGINX CPE in CVE-2023-44487 with upstream NGINX', () => {
  const f5Nginx = {
    criteria: 'cpe:2.3:a:f5:nginx:*:*:*:*:*:*:*:*',
    vulnerable: true,
    versionStartIncluding: '1.9.5',
    versionEndIncluding: '1.25.2'
  };
  const upstreamNginx = { name: 'NGINX', version: '1.24.0' };

  assert.equal(cpeMatchesComponent(f5Nginx.criteria, upstreamNginx), false);
  assert.equal(classifyCpeApplicability([f5Nginx], upstreamNginx).status, 'needs_review');
});
