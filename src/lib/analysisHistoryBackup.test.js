import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createAnalysisHistoryBackup,
  parseAnalysisHistoryBackup,
  mergeAnalysisHistory
} from './analysisHistoryBackup.js';

const snapshot = (id, name = 'openssl') => ({
  id,
  analyzedAt: id,
  inventory: [{ id: 'component-1', name }],
  findings: [{
    id: 'CVE-2026-1234',
    severity: 'High',
    cvss: 8.1,
    epss: 0.2,
    kev: false,
    components: [{ component: { id: 'component-1', name, version: '3.0.2' }, evidence: [
      { source: 'NVD', url: 'https://nvd.nist.gov/vuln/detail/CVE-2026-1234' }
    ] }]
  }]
});

test('exports and restores a versioned history backup without losing evidence', () => {
  const history = [snapshot('2026-11-02T10:00:00.000Z')];
  const backup = createAnalysisHistoryBackup(history);
  const parsed = JSON.parse(backup);
  assert.equal(parsed.format, 'quasaric-analysis-history');
  assert.equal(parsed.version, 1);
  assert.deepEqual(parseAnalysisHistoryBackup(backup), history);
  assert.equal(parseAnalysisHistoryBackup(backup)[0].findings[0].components[0].evidence[0].source, 'NVD');
});

test('rejects malformed, unsupported, oversized and partially invalid backups atomically', () => {
  for (const input of ['', '{broken', ' '.repeat(10 * 1024 * 1024 + 1)]) {
    assert.throws(() => parseAnalysisHistoryBackup(input));
  }
  assert.throws(() => parseAnalysisHistoryBackup(JSON.stringify({ format: 'other', version: 1, snapshots: [] })));
  assert.throws(() => parseAnalysisHistoryBackup(JSON.stringify({
    format: 'quasaric-analysis-history', version: 1,
    snapshots: [snapshot('2026-11-02T10:00:00.000Z'), { id: 'bad', findings: 'invalid' }]
  })));
  assert.throws(() => parseAnalysisHistoryBackup(JSON.stringify({
    format: 'quasaric-analysis-history', version: 1,
    snapshots: [snapshot('same'), snapshot('same')]
  })));
});

test('export refuses invalid history and more than ten snapshots', () => {
  assert.throws(() => createAnalysisHistoryBackup([{ id: 'bad', findings: 'invalid' }]));
  assert.throws(() => createAnalysisHistoryBackup(Array.from({ length: 11 }, (_, i) => snapshot(String(i)))));
});

test('merges imported and local history, deduplicates IDs and retains newest ten', () => {
  const local = [snapshot('2026-11-03T10:00:00.000Z'), snapshot('2026-11-01T10:00:00.000Z')];
  const imported = [
    snapshot('2026-11-02T10:00:00.000Z'),
    snapshot('2026-11-01T10:00:00.000Z', 'imported-duplicate'),
    ...Array.from({ length: 10 }, (_, i) => snapshot(new Date(Date.UTC(2026, 9, i + 1)).toISOString()))
  ];
  const merged = mergeAnalysisHistory(local, imported);
  assert.equal(merged.length, 10);
  assert.equal(merged[0].id, '2026-11-03T10:00:00.000Z');
  assert.equal(merged.filter(item => item.id === '2026-11-01T10:00:00.000Z').length, 1);
  assert.equal(merged.find(item => item.id === '2026-11-01T10:00:00.000Z').inventory[0].name, 'openssl');
});

test('merge validates both histories instead of silently discarding malformed entries', () => {
  assert.throws(() => mergeAnalysisHistory([{ id: 'bad', findings: [] }], []));
  assert.throws(() => mergeAnalysisHistory([], [{ id: 'bad', findings: 'invalid' }]));
});
