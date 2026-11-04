import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createAnalysisSnapshot, compareAnalysisSnapshots,
  loadAnalysisHistory, saveAnalysisHistory, ANALYSIS_HISTORY_LIMIT, upsertAnalysisSnapshot
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

test('uses one consistent timestamp when the analysis has no analyzedAt value', () => {
  const result = createAnalysisSnapshot({ findings: [] });
  assert.equal(result.id, result.analyzedAt);
  assert.doesNotThrow(() => new Date(result.analyzedAt).toISOString());
});

test('compares PURL and CPE identity metadata instead of silently retaining changed package coordinates', () => {
  const before = snapshot('before', [finding('CVE-2026-0001', [
    { component: { id: 'a', name: 'openssl', version: '3.0.2', purl: 'pkg:rpm/openssl@3.0.2?arch=x86_64' } }
  ])]);
  const after = snapshot('after', [finding('CVE-2026-0001', [
    { component: { id: 'a', name: 'openssl', version: '3.0.2', purl: 'pkg:rpm/openssl@3.0.2?arch=aarch64' } }
  ])]);
  const result = compareAnalysisSnapshots(before, after);
  assert.equal(result.counts.retained, 1);
  assert.equal(result.counts.changed, 1);
  assert.deepEqual(result.changed[0].differences, [{
    field: 'component.purl',
    before: 'pkg:rpm/openssl@3.0.2?arch=x86_64',
    after: 'pkg:rpm/openssl@3.0.2?arch=aarch64'
  }]);
});

test('uses PURL and CPE in fallback identity when legacy component IDs are missing', () => {
  const before = snapshot('before', [finding('CVE-2026-0001', [
    { component: { name: 'openssl', version: '3.0.2', purl: 'pkg:rpm/openssl@3.0.2?arch=x86_64' } },
    { component: { name: 'openssl', version: '3.0.2', purl: 'pkg:rpm/openssl@3.0.2?arch=aarch64' } }
  ])]);
  const after = snapshot('after', [finding('CVE-2026-0001', [
    { component: { name: 'openssl', version: '3.0.2', purl: 'pkg:rpm/openssl@3.0.2?arch=x86_64' } }
  ])]);
  const result = compareAnalysisSnapshots(before, after);
  assert.equal(result.counts.retained, 1);
  assert.equal(result.counts.resolved, 1);
});


test('tracks SPDX source relationship metadata changes in retained exposures', () => {
  const before = snapshot('before', [finding('CVE-2026-0001', [match('a', 'openssl', {
    sourcePackage: 'openssl', sourceVersion: '3.0.2-1',
    sourceRelationship: 'spdx_generated_from', sourceRef: 'SPDXRef-source-a'
  })])]);
  const after = snapshot('after', [finding('CVE-2026-0001', [match('a', 'openssl', {
    sourcePackage: 'openssl', sourceVersion: '3.0.2-1',
    sourceRelationship: 'spdx_contains', sourceRef: 'SPDXRef-source-b'
  })])]);
  const result = compareAnalysisSnapshots(before, after);
  assert.equal(result.counts.retained, 1);
  assert.equal(result.counts.changed, 1);
  assert.deepEqual(result.changed[0].differences, [
    { field: 'component.sourceRelationship', before: 'spdx_generated_from', after: 'spdx_contains' },
    { field: 'component.sourceRef', before: 'SPDXRef-source-a', after: 'SPDXRef-source-b' }
  ]);
});

test('preserves component identity when a previously exported backup is restored', async () => {
  const { createInventoryBackup, parseInventoryBackup } = await import('./inventoryBackup.js');
  const component = { id: 'stable-component-id', name: 'openssl', version: '3.0.2' };
  const restored = parseInventoryBackup(createInventoryBackup([component])).components;
  const before = snapshot('before', [finding('CVE-2026-0001', [match(component.id)])]);
  const after = snapshot('after', [finding('CVE-2026-0001', [match(restored[0].id)])]);
  const result = compareAnalysisSnapshots(before, after);
  assert.equal(result.counts.added, 0);
  assert.equal(result.counts.resolved, 0);
  assert.equal(result.counts.retained, 1);
});

test('preserves duplicate component rows when comparing historical exposures', () => {
  const duplicate = { component: { name: 'openssl', version: '3.0.2' } };
  const before = snapshot('before', [
    finding('CVE-2026-0001', [duplicate, { component: { ...duplicate.component } }])
  ]);
  const after = snapshot('after', [
    finding('CVE-2026-0001', [{ component: { ...duplicate.component } }])
  ]);
  const result = compareAnalysisSnapshots(before, after);
  assert.equal(result.counts.retained, 1);
  assert.equal(result.counts.resolved, 1);
  assert.equal(result.resolved[0].cve, 'CVE-2026-0001');
});


test('does not promote truthy non-boolean KEV metadata when snapshotting findings', () => {
  for (const kev of ['false', '0', 1, {}, []]) {
    const result = createAnalysisSnapshot({ findings: [finding('CVE-2026-0099', [match('a')], { kev })] });
    assert.equal(result.findings[0].kev, false, String(kev));
  }
  const confirmed = createAnalysisSnapshot({ findings: [finding('CVE-2026-0100', [match('a')], { kev: true })] });
  assert.equal(confirmed.findings[0].kev, true);
});


test('rejects malformed KEV types in stored snapshots and preserves raw history for recovery', () => {
  const valid = { id: 'valid', findings: [finding('CVE-2026-0001', [match('a')])] };
  const legacyWithoutKev = { id: 'legacy-no-kev', findings: [{ id: 'CVE-OLD', components: [match('b')] }] };
  const malformed = ['false', '0', 1, {}, []].map((kev, index) => ({
    id: 'malformed-' + index,
    findings: [finding('CVE-2026-000' + (index + 2), [match('c')], { kev })]
  }));
  const raw = JSON.stringify([valid, legacyWithoutKev, ...malformed]);
  const data = new Map([['quasaric-analysis-history', raw]]);
  const storage = { getItem: key => data.get(key) || null, setItem: (key, value) => data.set(key, value) };

  assert.deepEqual(loadAnalysisHistory(storage), [valid, legacyWithoutKev]);
  assert.equal(data.get('quasaric-analysis-history-recovery'), raw);
  assert.equal(saveAnalysisHistory(malformed, storage), false);
  assert.equal(saveAnalysisHistory([valid, legacyWithoutKev], storage), true);
});

test('accepts explicit boolean and null KEV values in legacy-compatible snapshots', () => {
  for (const kev of [true, false, null]) {
    const item = { id: 'kev-' + String(kev), findings: [finding('CVE-2026-0101', [match('a')], { kev })] };
    const data = new Map([['quasaric-analysis-history', JSON.stringify([item])]]);
    assert.deepEqual(loadAnalysisHistory({ getItem: key => data.get(key) || null }), [item]);
  }
  const withoutKev = { id: 'missing-kev', findings: [{ id: 'CVE-OLD', components: [match('a')] }] };
  const data = new Map([['quasaric-analysis-history', JSON.stringify([withoutKev])]]);
  assert.deepEqual(loadAnalysisHistory({ getItem: key => data.get(key) || null }), [withoutKev]);
});


test('validates CVSS and EPSS ranges when creating analysis snapshots', () => {
  for (const cvss of [-0.1, 10.1, 'not-a-score', '', NaN, Infinity, true, {}]) {
    assert.throws(() => createAnalysisSnapshot({
      findings: [finding('CVE-2026-0201', [match('a')], { cvss })]
    }), TypeError, String(cvss));
  }
  for (const epss of [-0.01, 100.01, 'not-a-score', '', NaN, Infinity, true, {}]) {
    assert.throws(() => createAnalysisSnapshot({
      findings: [finding('CVE-2026-0202', [match('a')], { epss })]
    }), TypeError, String(epss));
  }
  const valid = createAnalysisSnapshot({ findings: [
    finding('CVE-2026-0203', [match('a')], { cvss: '9.8', epss: '0.95' }),
    finding('CVE-2026-0204', [match('b')], { cvss: 0, epss: 100 }),
    finding('CVE-2026-0205', [match('c')], { cvss: null, epss: null })
  ] });
  assert.equal(valid.findings.length, 3);
});

test('rejects out-of-range CVSS and EPSS in persisted snapshots and preserves raw history', () => {
  const valid = { id: 'valid-scores', findings: [finding('CVE-2026-0301', [match('a')])] };
  const malformed = [
    { id: 'bad-cvss-low', findings: [finding('CVE-2026-0302', [match('a')], { cvss: -1 })] },
    { id: 'bad-cvss-high', findings: [finding('CVE-2026-0303', [match('a')], { cvss: 10.01 })] },
    { id: 'bad-epss-low', findings: [finding('CVE-2026-0304', [match('a')], { epss: -0.01 })] },
    { id: 'bad-epss-high', findings: [finding('CVE-2026-0305', [match('a')], { epss: 100.01 })] },
    { id: 'bad-score-type', findings: [finding('CVE-2026-0306', [match('a')], { epss: 'unknown' })] }
  ];
  const raw = JSON.stringify([valid, ...malformed]);
  const data = new Map([['quasaric-analysis-history', raw]]);
  const storage = { getItem: key => data.get(key) || null, setItem: (key, value) => data.set(key, value) };
  assert.deepEqual(loadAnalysisHistory(storage), [valid]);
  assert.equal(data.get('quasaric-analysis-history-recovery'), raw);
  assert.equal(saveAnalysisHistory(malformed, storage), false);
  assert.equal(saveAnalysisHistory([valid], storage), true);
});


test('upserts a completed analysis without losing snapshots imported while it was running', () => {
  const imported = { id: '2026-11-03T09:00:00.000Z', analyzedAt: '2026-11-03T09:00:00.000Z', findings: [] };
  const completed = { id: '2026-11-03T10:00:00.000Z', analyzedAt: '2026-11-03T10:00:00.000Z', findings: [] };
  const next = upsertAnalysisSnapshot([imported], completed);
  assert.deepEqual(next.map(item => item.id), [completed.id, imported.id]);
});

test('upsert replaces a duplicate ID and preserves the ten-snapshot limit', () => {
  const old = { id: 'same', findings: [] };
  const replacement = { id: 'same', analyzedAt: '2026-11-03T10:00:00.000Z', findings: [] };
  const history = Array.from({ length: 10 }, (_, index) => ({ id: 'old-' + index, findings: [] }));
  const next = upsertAnalysisSnapshot([old, ...history], replacement);
  assert.equal(next.length, ANALYSIS_HISTORY_LIMIT);
  assert.equal(next[0], replacement);
  assert.equal(next.includes(old), false);
});

test('upsert rejects invalid histories and snapshots', () => {
  assert.throws(() => upsertAnalysisSnapshot([{ id: 'broken', findings: 'invalid' }], { id: 'new', findings: [] }), TypeError);
  assert.throws(() => upsertAnalysisSnapshot([], { id: 'broken', findings: 'invalid' }), TypeError);
  assert.throws(() => upsertAnalysisSnapshot([], { findings: [] }), TypeError);
});


test('reads the preserved analysis history recovery copy without modifying it', async () => {
  const { readAnalysisHistoryRecovery } = await import('./analysisHistory.js');
  const raw = '[{malformed history';
  const data = new Map([['quasaric-analysis-history-recovery', raw]]);
  const storage = { getItem: key => data.has(key) ? data.get(key) : null };
  assert.equal(readAnalysisHistoryRecovery(storage), raw);
  assert.equal(data.get('quasaric-analysis-history-recovery'), raw);
  assert.equal(readAnalysisHistoryRecovery({ getItem: () => '' }), null);
  assert.equal(readAnalysisHistoryRecovery({ getItem: () => null }), null);
  assert.equal(readAnalysisHistoryRecovery(null), null);
  assert.equal(readAnalysisHistoryRecovery({ getItem() { throw new Error('storage blocked'); } }), null);
});


test('distinguishes an empty history from inaccessible or damaged local storage', async () => {
  const { readAnalysisHistoryState } = await import('./analysisHistory.js');
  assert.deepEqual(readAnalysisHistoryState({ getItem: () => null }), { history: [], warning: false });
  assert.deepEqual(readAnalysisHistoryState(null), { history: [], warning: true });
  assert.deepEqual(readAnalysisHistoryState({ getItem() { throw new Error('storage blocked'); } }), { history: [], warning: true });

  const raw = '{broken history';
  const data = new Map([['quasaric-analysis-history', raw]]);
  const storage = { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) };
  assert.deepEqual(readAnalysisHistoryState(storage), { history: [], warning: true });
  assert.equal(data.get('quasaric-analysis-history-recovery'), raw);
});

