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
  const evidence = [{ source: 'Canonical OpenVEX', status: 'fixed', url: 'https://example.test/vex', product: { name: 'openssl', version: '3.0.2' }, references: ['https://example.test/advisory'] }];
  const withEvidence = createAnalysisSnapshot({ findings: [finding('CVE-2026-0002', [{ ...match('component-1'), evidence }])] });
  assert.deepEqual(withEvidence.findings[0].components[0].evidence, evidence);
  assert.notEqual(withEvidence.findings[0].components[0].evidence, evidence);
  assert.notEqual(withEvidence.findings[0].components[0].evidence[0].product, evidence[0].product);
  assert.notEqual(withEvidence.findings[0].components[0].evidence[0].references, evidence[0].references);
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

test('rejects malformed snapshots before comparing exposure records', () => {
  const valid = snapshot('valid', [finding('CVE-1', [match('a')])]);
  assert.throws(() => compareAnalysisSnapshots(null, valid), TypeError);
  assert.throws(() => compareAnalysisSnapshots(valid, { findings: [null] }), TypeError);
  assert.throws(() => compareAnalysisSnapshots(valid, {
    findings: [{ id: 'CVE-2', components: [{ component: [] }] }]
  }), TypeError);
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

test('tracks a component version change as a changed exposure, not a new CVE', () => {
  const before = snapshot('before', [finding('CVE-2026-0001', [match('a', 'openssl', { version: '3.0.1' })])]);
  const after = snapshot('after', [finding('CVE-2026-0001', [match('a', 'openssl', { version: '3.0.2' })])]);
  const result = compareAnalysisSnapshots(before, after);
  assert.equal(result.counts.added, 0);
  assert.equal(result.counts.resolved, 0);
  assert.equal(result.counts.changed, 1);
  assert.deepEqual(result.changed[0].differences, [{ field: 'component.version', before: '3.0.1', after: '3.0.2' }]);
});

test('persists history locally and caps it at ten snapshots', () => {
  const data = new Map();
  const storage = { getItem: key => data.get(key) || null, setItem: (key, value) => data.set(key, value) };
  const history = Array.from({ length: ANALYSIS_HISTORY_LIMIT + 2 }, (_, i) => ({ id: String(i), findings: [] }));
  assert.equal(saveAnalysisHistory(history, storage), true);
  assert.equal(loadAnalysisHistory(storage).length, ANALYSIS_HISTORY_LIMIT);
  assert.equal(loadAnalysisHistory(storage)[0].id, '0');
});

test('ignores malformed snapshots and nested findings in stored history', () => {
  const valid = { id: 'valid', findings: [finding('CVE-2026-0001', [match('a')])] };
  const data = new Map([['quasaric-analysis-history', JSON.stringify([
    valid,
    null,
    { id: 'invalid', findings: 'not-an-array' },
    { id: 'null-finding', findings: [null] },
    { id: 'missing-components', findings: [{ id: 'CVE-1' }] },
    { id: 'null-match', findings: [{ id: 'CVE-2', components: [null] }] },
    { id: 'missing-component', findings: [{ id: 'CVE-3', components: [{}] }] },
    'bad',
    { id: 'array-finding', findings: [[]] },
    { id: 'array-match', findings: [{ id: 'CVE-4', components: [[]] }] },
    { id: 'array-component', findings: [{ id: 'CVE-5', components: [{ component: [] }] }] }
  ])]]);
  const storage = { getItem: key => data.get(key) || null };
  assert.deepEqual(loadAnalysisHistory(storage), [valid]);
});

test('handles unavailable or malformed browser storage safely', () => {
  const malformed = { getItem: () => '{invalid', setItem: () => { throw new Error('quota'); } };
  assert.deepEqual(loadAnalysisHistory(malformed), []);
  assert.equal(saveAnalysisHistory([{ id: 'x' }], malformed), false);
});


test('rejects oversized snapshots and excessive finding or inventory counts', () => {
  assert.throws(() => createAnalysisSnapshot({ findings: Array(50001).fill(finding('CVE-1', [])) }), /50000/);
  assert.throws(() => createAnalysisSnapshot({ findings: [] }, Array(50001).fill({ name: 'nginx' })), /50000/);
  const huge = snapshot('huge', [finding('CVE-1', [match('a', 'x'.repeat(10 * 1024 * 1024))])]);
  assert.throws(() => createAnalysisSnapshot(huge), /10 MB/);
});

test('bounds saved history size and preserves oversized or malformed history for recovery', () => {
  const data = new Map();
  const storage = { getItem: key => data.get(key) || null, setItem: (key, value) => data.set(key, value) };
  const huge = { id: 'huge', findings: [finding('CVE-1', [match('a', 'x'.repeat(10 * 1024 * 1024))])] };
  assert.equal(saveAnalysisHistory([huge], storage), false);
  const oversizedRaw = ' '.repeat(10 * 1024 * 1024 + 1);
  data.set('quasaric-analysis-history', oversizedRaw);
  assert.deepEqual(loadAnalysisHistory(storage), []);
  assert.equal(data.get('quasaric-analysis-history-recovery'), oversizedRaw);
  const malformedRaw = JSON.stringify([{ id: 'bad', findings: 'invalid' }]);
  data.set('quasaric-analysis-history', malformedRaw);
  assert.deepEqual(loadAnalysisHistory(storage), []);
  assert.equal(data.get('quasaric-analysis-history-recovery'), malformedRaw);
});


test('rejects malformed analysis inputs before building a snapshot', () => {
  assert.throws(() => createAnalysisSnapshot({ findings: [] }, {}), TypeError);
  assert.throws(() => createAnalysisSnapshot({ findings: [null] }), TypeError);
  assert.throws(() => createAnalysisSnapshot({ findings: [{ id: 'CVE-1', components: 'bad' }] }), TypeError);
  assert.throws(() => createAnalysisSnapshot({ findings: [{ id: 'CVE-1', components: [null] }] }), TypeError);
  assert.throws(() => createAnalysisSnapshot({ findings: [{ id: 'CVE-1', components: [{ component: [] }] }] }), TypeError);
  assert.throws(() => createAnalysisSnapshot({ findings: [{ id: '  ', components: [] }] }), TypeError);
  assert.throws(() => createAnalysisSnapshot({ findings: [{ id: 'CVE-1', components: [{ component: { version: '3.0.2' } }] }] }), TypeError);
  assert.throws(() => createAnalysisSnapshot({ findings: [] }, [null]), TypeError);
});

test('validates stored inventory shape and finding identifiers while retaining legacy snapshots', () => {
  const valid = { id: 'legacy', findings: [finding('CVE-2026-0001', [match('a')])] };
  const invalidInventory = { id: 'bad-inventory', inventory: [null], findings: [] };
  const invalidFinding = { id: 'bad-finding', findings: [{ components: [] }] };
  const blankFindingId = { id: 'blank-finding', findings: [{ id: '  ', components: [] }] };
  const missingComponentIdentity = { id: 'missing-component', findings: [
    finding('CVE-2026-0002', [{ component: { version: '3.0.2' } }])
  ] };
  const data = new Map([['quasaric-analysis-history', JSON.stringify([
    valid, invalidInventory, invalidFinding, blankFindingId, missingComponentIdentity
  ])]]);
  const storage = { getItem: key => data.get(key) || null, setItem: (key, value) => data.set(key, value) };
  assert.deepEqual(loadAnalysisHistory(storage), [valid]);
  assert.equal(data.get('quasaric-analysis-history-recovery'), JSON.stringify([
    valid, invalidInventory, invalidFinding, blankFindingId, missingComponentIdentity
  ]));
});

test('preserves malformed JSON history for recovery and rejects non-array saves', () => {
  const data = new Map([['quasaric-analysis-history', '{broken json']]);
  const storage = { getItem: key => data.get(key) || null, setItem: (key, value) => data.set(key, value) };
  assert.deepEqual(loadAnalysisHistory(storage), []);
  assert.equal(data.get('quasaric-analysis-history-recovery'), '{broken json');
  assert.equal(saveAnalysisHistory({ findings: [] }, storage), false);
});


test('snapshot comparison keys cannot collide on separators in finding or component metadata', () => {
  const before = snapshot('before', [
    finding('CVE-A::B', [match('component')]),
    finding('CVE-A', [match('B::component')])
  ]);
  const after = snapshot('after', [
    finding('CVE-A::B', [match('component')])
  ]);
  const result = compareAnalysisSnapshots(before, after);
  assert.equal(result.counts.resolved, 1);
  assert.equal(result.resolved[0].cve, 'CVE-A');
  assert.equal(result.counts.retained, 1);
});
