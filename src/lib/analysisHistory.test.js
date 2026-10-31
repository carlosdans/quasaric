import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createAnalysisSnapshot, compareAnalysisSnapshots,
  loadAnalysisHistory, saveAnalysisHistory, ANALYSIS_HISTORY_LIMIT
} from './analysisHistory.js';

const match = (id, name = 'openssl', overrides = {}) => ({
  component: { id, name, version: '3.0.2', ...overrides }
});
const finding = (id, matches, overrides = {}) => ({
  id, description: id + ' test', severity: 'High', cvss: 7.5,
  epss: 0.1, kev: false, applicabilityStatus: 'possible',
  components: matches, ...overrides
});
const snapshot = (at, findings) => ({ analyzedAt: at, findings });

test('creates a serializable snapshot from a completed analysis', () => {
  const result = createAnalysisSnapshot({
    analyzedAt: '2026-10-01T10:00:00Z',
    findings: [finding('CVE-2026-0001', [match('component-1')])]
  }, [{ id: 'component-1', name: 'openssl' }]);
  assert.equal(result.id, result.analyzedAt);
  assert.equal(result.inventory.length, 1);
  assert.equal(result.findings[0].components[0].component.id, 'component-1');
  assert.doesNotThrow(() => JSON.stringify(result));
});

test('compares CVE exposure per component and reports added, resolved and retained items', () => {
  const before = snapshot('before', [
    finding('CVE-2026-0001', [match('a'), match('b')]),
    finding('CVE-2026-0002', [match('a')])
  ]);
  const after = snapshot('after', [
    finding('CVE-2026-0001', [match('a'), match('c')]),
    finding('CVE-2026-0003', [match('a')])
  ]);
  const result = compareAnalysisSnapshots(before, after);
  assert.equal(result.counts.added, 2);
  assert.equal(result.counts.resolved, 2);
  assert.equal(result.counts.retained, 1);
  assert.deepEqual(result.added.map(x => x.cve).sort(), ['CVE-2026-0001', 'CVE-2026-0003']);
  assert.deepEqual(result.resolved.map(x => x.cve).sort(), ['CVE-2026-0001', 'CVE-2026-0002']);
  assert.equal(result.counts.addedCves, 2);
  assert.equal(result.counts.resolvedCves, 2);
});

test('detects changes in severity, scores, KEV and applicability', () => {
  const before = snapshot('before', [finding('CVE-2026-0001', [match('a')])]);
  const after = snapshot('after', [finding('CVE-2026-0001', [match('a')], {
    severity: 'Critical', cvss: 9.8, epss: 0.8, kev: true,
    applicabilityStatus: 'needs_review'
  })]);
  const result = compareAnalysisSnapshots(before, after);
  assert.equal(result.counts.added, 0);
  assert.equal(result.counts.resolved, 0);
  assert.equal(result.counts.changed, 1);
  assert.deepEqual(result.changed[0].differences.map(x => x.field),
    ['severity', 'cvss', 'epss', 'kev', 'applicabilityStatus']);
});

test('treats the same CVE on a changed component version as a distinct exposure', () => {
  const before = snapshot('before', [finding('CVE-2026-0001', [match('a', 'openssl', { version: '3.0.1' })])]);
  const after = snapshot('after', [finding('CVE-2026-0001', [match('a', 'openssl', { version: '3.0.2' })])]);
  const result = compareAnalysisSnapshots(before, after);
  assert.equal(result.counts.added, 1);
  assert.equal(result.counts.resolved, 1);
});

test('persists history locally and caps it at ten snapshots', () => {
  const data = new Map();
  const storage = { getItem: key => data.get(key) || null, setItem: (key, value) => data.set(key, value) };
  const history = Array.from({ length: ANALYSIS_HISTORY_LIMIT + 2 }, (_, i) => ({ id: String(i) }));
  assert.equal(saveAnalysisHistory(history, storage), true);
  assert.equal(loadAnalysisHistory(storage).length, ANALYSIS_HISTORY_LIMIT);
  assert.equal(loadAnalysisHistory(storage)[0].id, '0');
});

test('handles unavailable or malformed browser storage safely', () => {
  const malformed = { getItem: () => '{invalid', setItem: () => { throw new Error('quota'); } };
  assert.deepEqual(loadAnalysisHistory(malformed), []);
  assert.equal(saveAnalysisHistory([{ id: 'x' }], malformed), false);
});
