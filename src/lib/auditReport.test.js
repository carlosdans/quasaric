import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createAuditReport, parseAuditReport, MAX_AUDIT_REPORT_BYTES } from './auditReport.js';

test('exports source coverage, errors, limits and full component evidence with verified integrity', async () => {
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
  const serialized = await createAuditReport({
    analysis, inventory: [{ id: 'component-1', name: 'openssl', version: '3.0.2' }],
    prioritizedFindings: [{ id: 'CVE-2026-1', riskPriority: { score: 50 } }],
    posture: { snapshotCount: 2 }, comparison: { counts: { added: 1 } },
    exportedAt: '2026-11-03T11:00:00.000Z'
  });
  const { report, integrity } = await parseAuditReport(serialized);
  assert.equal(report.format, 'quasaric-security-audit');
  assert.equal(report.version, 2);
  assert.equal(report.scope.inventoryComponents, 1);
  assert.equal(report.analysis.sources.epss, 'unavailable');
  assert.equal(report.analysis.errors[0].source, 'FIRST EPSS');
  assert.equal(report.analysis.limits[0].truncated, true);
  assert.deepEqual(report.findings[0].components[0].evidence, evidence);
  assert.deepEqual(report.analysis.purlAdvisories, [{ id: 'GHSA-1' }]);
  assert.equal(report.posture.snapshotCount, 2);
  assert.equal(report.comparison.counts.added, 1);
  assert.match(report.methodology.absence, /does not prove/);
  assert.equal(integrity.verified, true);
  assert.match(integrity.digest, /^[a-f0-9]{64}$/);
});

test('exports a zero-findings analysis with explicit queried source coverage', async () => {
  const serialized = await createAuditReport({
    analysis: { findings: [], sources: { nvd: 'queried', kev: 'queried' }, errors: [], limits: [] }
  });
  const { report } = await parseAuditReport(serialized);
  assert.equal(report.scope.findings, 0);
  assert.equal(report.analysis.sources.nvd, 'queried');
  assert.deepEqual(report.findings, []);
});

test('rejects missing analysis and malformed collection inputs', async () => {
  await assert.rejects(() => createAuditReport(), TypeError);
  await assert.rejects(() => createAuditReport({ analysis: { findings: {} } }), TypeError);
  await assert.rejects(() => createAuditReport({ analysis: { findings: [] }, inventory: {} }), TypeError);
});

test('rejects circular and oversized reports instead of creating a partial export', async () => {
  const circular = {}; circular.self = circular;
  await assert.rejects(() => createAuditReport({ analysis: { findings: [circular] } }), /cannot be exported/);
  const huge = 'x'.repeat(MAX_AUDIT_REPORT_BYTES);
  await assert.rejects(() => createAuditReport({ analysis: { findings: [{ huge }] } }), RangeError);
});

test('includes deterministic severity, applicability, priority and source coverage summaries', async () => {
  const serialized = await createAuditReport({
    analysis: {
      findings: [
        { id: 'CVE-1', severity: 'Critical', kev: true, components: [{ applicabilityStatus: 'affected' }, { applicabilityStatus: 'needs_review' }] },
        { id: 'CVE-2', severity: 'High', kev: 'true', components: [{ applicabilityStatus: 'affected' }] },
        { id: 'CVE-3', components: [] }
      ],
      sources: { nvd: 'queried', epss: 'unavailable', kev: 'queried' },
      errors: [{ source: 'NVD' }], limits: [{ source: 'NVD' }]
    },
    prioritizedFindings: [
      { id: 'CVE-1', riskPriority: { band: 'critical' } },
      { id: 'CVE-2', riskPriority: { band: 'high' } },
      { id: 'CVE-3', riskPriority: { band: 'high' } }
    ]
  });
  const { report } = await parseAuditReport(serialized);
  assert.deepEqual(report.summary, {
    candidateFindings: 3,
    componentAssessments: 3,
    kevFindings: 1,
    severity: { critical: 1, high: 1, unknown: 1 },
    applicability: { affected: 2, needs_review: 1 },
    priorityBands: { critical: 1, high: 2 },
    sourceStatuses: { queried: 2, unavailable: 1 },
    sourceCount: 3,
    queryErrors: 1,
    queryLimits: 1
  });
});

test('detects tampering and rejects inconsistent package structures', async () => {
  const original = await createAuditReport({ analysis: { findings: [], sources: {}, errors: [], limits: [] } });
  const changed = JSON.parse(original);
  changed.methodology.absence = 'tampered';
  await assert.rejects(() => parseAuditReport(JSON.stringify(changed)), /SHA-256 verification/);
  const malformed = JSON.parse(original);
  malformed.scope.findings = 1;
  await assert.rejects(() => parseAuditReport(JSON.stringify(malformed)), /invalid or inconsistent structure/);
});

test('accepts structurally valid legacy v1 packages but marks them unverified', async () => {
  const legacy = {
    format: 'quasaric-security-audit', version: 1, exportedAt: '2026-11-03T11:00:00.000Z',
    summary: { candidateFindings: 0, queryErrors: 0, queryLimits: 0 },
    scope: { inventoryComponents: 0, findings: 0 },
    analysis: { sources: {}, errors: [], limits: [], purlAdvisories: [] },
    inventory: [], findings: [], prioritizedFindings: []
  };
  const parsed = await parseAuditReport(JSON.stringify(legacy));
  assert.equal(parsed.integrity.verified, false);
  assert.equal(parsed.integrity.legacy, true);
});

test('rejects a re-hashed package whose summary was edited independently of its evidence', async () => {
  const original = await createAuditReport({
    analysis: {
      findings: [{ id: 'CVE-2026-9', severity: 'High', kev: true, components: [{ applicabilityStatus: 'affected' }] }],
      sources: { nvd: 'queried', kev: 'queried' }, errors: [], limits: []
    },
    prioritizedFindings: [{ id: 'CVE-2026-9', riskPriority: { band: 'critical' } }]
  });
  const changed = JSON.parse(original);
  changed.summary.kevFindings = 0;
  const { integrity, ...payload } = changed;
  const bytes = new TextEncoder().encode(JSON.stringify(payload));
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  changed.integrity.digest = [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
  await assert.rejects(() => parseAuditReport(JSON.stringify(changed)), /summary does not match/);
});

test('rejects scope timestamps and malformed collection entries that contradict the package', async () => {
  const original = await createAuditReport({
    analysis: { analyzedAt: '2026-11-03T10:00:00.000Z', findings: [], sources: {}, errors: [], limits: [] }
  });
  const changed = JSON.parse(original);
  changed.scope.analysisTimestamp = '2026-11-02T10:00:00.000Z';
  await assert.rejects(() => parseAuditReport(JSON.stringify(changed)), /invalid or inconsistent structure/);
  const malformed = JSON.parse(original);
  malformed.inventory.push(null);
  malformed.scope.inventoryComponents = malformed.inventory.length;
  const { integrity, ...payload } = malformed;
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(payload)));
  malformed.integrity.digest = [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
  await assert.rejects(() => parseAuditReport(JSON.stringify(malformed)), /invalid or inconsistent structure/);
});

test('publishes a JSON Schema contract for v2 audit package integrations', async () => {
  const schemaText = await readFile(new URL('../../docs/quasaric-security-audit.schema.json', import.meta.url), 'utf8');
  const schema = JSON.parse(schemaText);
  assert.equal(schema.$schema, 'https://json-schema.org/draft/2020-12/schema');
  assert.equal(schema.properties.format.const, 'quasaric-security-audit');
  assert.equal(schema.properties.version.const, 2);
  for (const field of ['format', 'version', 'exportedAt', 'summary', 'scope', 'methodology', 'analysis', 'inventory', 'findings', 'prioritizedFindings', 'posture', 'comparison', 'integrity']) {
    assert.ok(schema.required.includes(field), 'schema must require ' + field);
  }
  assert.deepEqual(schema.properties.integrity.properties.algorithm, { const: 'SHA-256' });
  assert.match(schema.properties.integrity.properties.digest.pattern, /64/);
  for (const field of ['candidateFindings', 'componentAssessments', 'kevFindings', 'severity', 'applicability', 'priorityBands', 'sourceStatuses', 'sourceCount', 'queryErrors', 'queryLimits']) {
    assert.ok(schema.properties.summary.required.includes(field), 'summary schema must require ' + field);
  }
});
