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

test('caps dashboard input to the ten snapshots retained by the app', () => {
  const history = Array.from({ length: 12 }, (_, i) => snap(String(i), []));
  const result = buildSecurityPosture(history);
  assert.equal(result.snapshotCount, 10);
  assert.equal(result.windowStart, '2');
  assert.equal(result.windowEnd, '11');
});
