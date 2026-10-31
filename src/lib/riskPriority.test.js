import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateRiskPriority, rankFindingsByRisk } from './riskPriority.js';

test('weights KEV, EPSS, CVSS and applicability into a transparent 0-100 score', () => {
  const result = calculateRiskPriority({
    kev: true, epss: 0.5, cvss: 8.5, applicabilityStatus: 'affected'
  });
  assert.equal(result.score, 40 + 15 + 17 + 10);
  assert.equal(result.band, 'high');
  assert.equal(result.isConfirmed, false);
  assert.deepEqual(result.missing, []);
  assert.match(result.reasons.join(' '), /CISA KEV/);
});

test('accepts EPSS percentage values and clamps out-of-range inputs', () => {
  assert.equal(calculateRiskPriority({
    epss: 75, cvss: 12, applicabilityStatus: 'possible'
  }).score, 23 + 20 + 6);
  assert.equal(calculateRiskPriority({
    epss: -1, cvss: -2, applicabilityStatus: 'unaffected'
  }).score, 0);
});

test('missing intelligence signals are explicit and never treated as positive evidence', () => {
  const result = calculateRiskPriority({});
  assert.equal(result.score, 3);
  assert.deepEqual(result.missing, ['EPSS', 'CVSS', 'applicability confirmation']);
  assert.equal(result.isConfirmed, false);
});

test('non-affected applicability states do not receive affected points', () => {
  for (const status of ['version_missing', 'conflicting', 'patched_candidate', 'unaffected']) {
    assert.equal(calculateRiskPriority({ applicabilityStatus: status }).applicabilityPoints, 0);
  }
  assert.equal(calculateRiskPriority({ applicabilityStatus: 'needs_review' }).applicabilityPoints, 3);
});

test('ranks findings by score without mutating the input array', () => {
  const input = [
    { id: 'CVE-2', kev: false, epss: 0.1, cvss: 5, applicabilityStatus: 'possible' },
    { id: 'CVE-1', kev: true, epss: 0.9, cvss: 9.8, applicabilityStatus: 'affected' }
  ];
  const ranked = rankFindingsByRisk(input);
  assert.deepEqual(ranked.map(item => item.id), ['CVE-1', 'CVE-2']);
  assert.equal(input[0].riskPriority, undefined);
});
