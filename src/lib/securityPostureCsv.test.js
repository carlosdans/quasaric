import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSecurityPostureCsv } from './securityPostureCsv.js';

test('exports timeline metrics and observation rows with CSV escaping', () => {
  const csv = buildSecurityPostureCsv({
    timeline: [{
      id: 'snapshot-1', analyzedAt: '2026-10-01', exposures: 2, uniqueCves: 1,
      kevCves: 1, criticalCves: 0, highCves: 1, components: 2, riskScore: 42
    }],
    dwell: [{
      cve: 'CVE-1', componentName: 'lib, "core"', firstObservedAt: '2026-10-01',
      lastObservedAt: '2026-10-01', snapshotsSeen: 1, presentInLatest: true
    }]
  });
  const lines = csv.replace(/^\uFEFF/, '').split('\r\n');
  assert.equal(lines.length, 3);
  assert.match(lines[1], /^"snapshot","snapshot-1","2026-10-01","2","1"/);
  assert.match(lines[2], /"CVE-1","lib, ""core""","2026-10-01","2026-10-01","1","true"$/);
});

test('exports an empty but valid header when no history is available', () => {
  const csv = buildSecurityPostureCsv({ timeline: [], dwell: [] });
  assert.equal(csv.replace(/^\uFEFF/, '').split('\r\n').length, 1);
  assert.match(csv, /^\uFEFF"record_type"/);
});
