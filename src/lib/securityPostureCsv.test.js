import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSecurityPostureCsv } from './securityPostureCsv.js';

const linesOf = csv => csv.slice(1).split(String.fromCharCode(13, 10));

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
  assert.equal(csv.charCodeAt(0), 0xfeff);
  const lines = linesOf(csv);
  assert.equal(lines.length, 3);
  assert.match(lines[1], /^"snapshot","snapshot-1","2026-10-01","2","1"/);
  assert.match(lines[2], /"CVE-1","lib, ""core""","2026-10-01","2026-10-01","1","true"$/);
});

test('exports an empty but valid header when no history is available', () => {
  const csv = buildSecurityPostureCsv({ timeline: [], dwell: [] });
  assert.equal(csv.charCodeAt(0), 0xfeff);
  assert.equal(linesOf(csv).length, 1);
  assert.match(csv.slice(1), /^"record_type"/);
});

test('neutralizes spreadsheet formulas in untrusted text fields', () => {
  const csv = buildSecurityPostureCsv({
    timeline: [{ id: '=HYPERLINK("https://example.invalid","open")' }],
    dwell: [{
      cve: '+SUM(1,1)', componentName: '@cmd', firstObservedAt: '-1',
      lastObservedAt: String.fromCharCode(9) + '2'
    }]
  });
  assert.ok(csv.includes('"\'=HYPERLINK(""https://example.invalid"",""open"")"'));
  assert.ok(csv.includes('"\'+SUM(1,1)","\'@cmd","\'-1","\'' + String.fromCharCode(9) + '2"'));
  const newlineCsv = buildSecurityPostureCsv({
    timeline: [{ id: String.fromCharCode(10) + '=1+1' }],
    dwell: [{ cve: 'CVE-1', componentName: '  =1+1' }]
  });
  assert.ok(newlineCsv.includes("\\\"'" + String.fromCharCode(10) + "=1+1\\\""));
  assert.ok(newlineCsv.includes("\\\"'  =1+1\\\""));
});

test('handles absent, malformed and null history collections safely', () => {
  assert.equal(linesOf(buildSecurityPostureCsv()).length, 1);
  assert.equal(linesOf(buildSecurityPostureCsv({ timeline: {}, dwell: null })).length, 1);
  assert.equal(linesOf(buildSecurityPostureCsv({ timeline: [null, 3], dwell: [null, false] })).length, 1);
});
