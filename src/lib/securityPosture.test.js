import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSecurityPosture } from './securityPosture.js';

const match = (id, name = 'openssl') => ({ component: { id, name, version: '3.0.2' } });
const finding = (id, matches, overrides = {}) => ({
  id, severity: 'High', cvss: 7.5, epss: 0.2, kev: false,
  applicabilityStatus: 'possible', components: matches, ...overrides
});
const snap = (at, findings) => ({ id: at, analyzedAt: at, findings });

test('builds a chronological posture trend from newest-first local snapshots', () => {
  const result = buildSecurityPosture([
    snap('2026-10-03', [finding('CVE-2', [match('a'), match('b')], { kev: true })]),
    snap('2026-10-02', [finding('CVE-1', [match('a')])]),
    snap('2026-10-01', [finding('CVE-1', [match('a')])])
  ]);
  assert.deepEqual(result.timeline.map(point => point.analyzedAt),
    ['2026-10-01', '2026-10-02', '2026-10-03']);
  assert.equal(result.latest.uniqueCves, 1);
  assert.equal(result.latest.kevCves, 1);
  assert.equal(result.latest.exposures, 2);
  assert.equal(result.change.uniqueCves, 0);
  assert.equal(result.change.kevCves, 1);
});

test('tracks first and last observations without claiming remediation', () => {
  const result = buildSecurityPosture([
    snap('new', [finding('CVE-1', [match('a')])]),
    snap('middle', [finding('CVE-1', [match('a')])]),
    snap('old', [])
  ]);
  assert.equal(result.dwell[0].firstObservedAt, 'middle');
  assert.equal(result.dwell[0].lastObservedAt, 'new');
  assert.equal(result.dwell[0].snapshotsSeen, 2);
  assert.equal(result.dwell[0].presentInLatest, true);
});

test('returns an explicit insufficient-history state for zero or one snapshot', () => {
  assert.equal(buildSecurityPosture([]).change, null);
  const single = buildSecurityPosture([snap('only', [finding('CVE-1', [match('a')])])]);
  assert.equal(single.snapshotCount, 1);
  assert.equal(single.change, null);
});

test('ignores malformed snapshots and nested records when called directly', () => {
  const valid = snap('valid', [finding('CVE-1', [match('a')])]);
  const result = buildSecurityPosture([
    { id: 'bad-finding', findings: [null] },
    { id: 'bad-components', findings: [{ id: 'CVE-2' }] },
    { id: 'bad-match', findings: [{ id: 'CVE-3', components: [null] }] },
    { id: 'bad-component', findings: [{ id: 'CVE-4', components: [{ component: [] }] }] },
    { id: 'missing-cve-id', findings: [{ components: [{ component: { id: 'a', name: 'openssl' } }] }] },
    { id: 'missing-component-identity', findings: [{ id: 'CVE-5', components: [{ component: { version: '3.0.2' } }] }] },
    [],
    valid
  ]);
  assert.equal(result.snapshotCount, 1);
  assert.equal(result.latest.uniqueCves, 1);
  assert.equal(result.timeline[0].analyzedAt, 'valid');
});

test('caps dashboard input to the ten snapshots retained by the app', () => {
  const history = Array.from({ length: 12 }, (_, i) => snap(String(11 - i), []));
  const result = buildSecurityPosture(history);
  assert.equal(result.snapshotCount, 10);
  assert.equal(result.windowStart, '2');
  assert.equal(result.windowEnd, '11');
});

test('aggregates duplicate CVE records once using the strongest observed signals', () => {
  const result = buildSecurityPosture([snap('latest', [
    finding('CVE-1', [match('a')], { severity: 'High', cvss: 7.0, epss: 0.1 }),
    finding('CVE-1', [match('b')], { severity: 'Critical', cvss: 9.8, epss: 0.9, kev: true })
  ])]);
  assert.equal(result.latest.uniqueCves, 1);
  assert.equal(result.latest.criticalCves, 1);
  assert.equal(result.latest.highCves, 0);
  assert.equal(result.latest.kevCves, 1);
  assert.equal(result.latest.exposures, 2);
  assert.equal(result.latest.riskScore, 40 + 27 + 20 + 6);
});

test('marks a previously observed exposure as not detected when absent from latest snapshot', () => {
  const result = buildSecurityPosture([
    snap('latest', []),
    snap('earlier', [finding('CVE-1', [match('a')])])
  ]);
  assert.equal(result.dwell[0].firstObservedAt, 'earlier');
  assert.equal(result.dwell[0].lastObservedAt, 'earlier');
  assert.equal(result.dwell[0].presentInLatest, false);
  assert.equal(result.latest.uniqueCves, 0);
});

test('keeps fallback component identities distinct when metadata contains separators', () => {
  const result = buildSecurityPosture([snap('latest', [
    finding('CVE-1', [
      { component: { name: 'a|b', version: 'c' } },
      { component: { name: 'a', version: 'b|c' } }
    ])
  ])]);
  assert.equal(result.latest.exposures, 2);
  assert.equal(result.dwell.length, 2);
  assert.deepEqual(result.dwell.map(item => item.componentName).sort(), ['a', 'a|b']);
});
