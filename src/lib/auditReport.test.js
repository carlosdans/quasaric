import test from 'node:test';
import assert from 'node:assert/strict';
import { createAuditReport, MAX_AUDIT_REPORT_BYTES } from './auditReport.js';

test('exports source coverage, errors, limits and full component evidence', () => {
  const evidence = [{ source: 'NVD', url: 'https://nvd.nist.gov/vuln/detail/CVE-2026-1', references: ['https://vendor.test/advisory'], detail: { status: 'candidate' } }];
  const analysis = {
    analyzedAt: '2026-11-03T10:00:00.000Z',
    sources: { nvd: 'queried', epss: 'unavailable', kev: 'queried', ubuntuOsv: 'not_configured' },
    errors: [{ source: 'FIRST EPSS', message: 'Request failed' }],
    limits: [{ source: 'NVD', reason: 'query cap', truncated: true }],
    disclaimer: 'Candidate only',
    findings: [{ id: 'CVE-2026-1', components: [{ component: { name: 'openssl', version: '3.0.2' }, evidence }] }],
    purlAdvisories: [{ id: 'GHSA-1' }]
  };
  const output = JSON.parse(createAuditReport({
    analysis, inventory: [{ id: 'component-1', name: 'openssl', version: '3.0.2' }],
    prioritizedFindings: [{ id: 'CVE-2026-1', riskPriority: { score: 50 } }],
    posture: { snapshotCount: 2 }, comparison: { counts: { added: 1 } },
    exportedAt: '2026-11-03T11:00:00.000Z'
  }));
  assert.equal(output.format, 'quasaric-security-audit');
  assert.equal(output.version, 1);
  assert.equal(output.scope.inventoryComponents, 1);
  assert.equal(output.analysis.sources.epss, 'unavailable');
  assert.equal(output.analysis.errors[0].source, 'FIRST EPSS');
  assert.equal(output.analysis.limits[0].truncated, true);
  assert.deepEqual(output.findings[0].components[0].evidence, evidence);
  assert.deepEqual(output.analysis.purlAdvisories, [{ id: 'GHSA-1' }]);
  assert.equal(output.posture.snapshotCount, 2);
  assert.equal(output.comparison.counts.added, 1);
  assert.match(output.methodology.absence, /does not prove/);
});

test('exports a zero-findings analysis with explicit queried source coverage', () => {
  const output = JSON.parse(createAuditReport({
    analysis: { findings: [], sources: { nvd: 'queried', kev: 'queried' }, errors: [], limits: [] }
  }));
  assert.equal(output.scope.findings, 0);
  assert.equal(output.analysis.sources.nvd, 'queried');
  assert.deepEqual(output.findings, []);
});

test('rejects missing analysis and malformed collection inputs', () => {
  assert.throws(() => createAuditReport(), TypeError);
  assert.throws(() => createAuditReport({ analysis: { findings: {} } }), TypeError);
  assert.throws(() => createAuditReport({ analysis: { findings: [] }, inventory: {} }), TypeError);
});

test('rejects circular and oversized reports instead of creating a partial export', () => {
  const circular = {}; circular.self = circular;
  assert.throws(() => createAuditReport({ analysis: { findings: [circular] } }), /cannot be exported/);
  const huge = 'x'.repeat(MAX_AUDIT_REPORT_BYTES);
  assert.throws(() => createAuditReport({ analysis: { findings: [{ huge }] } }), RangeError);
});
