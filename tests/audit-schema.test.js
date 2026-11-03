import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createAuditReport, parseAuditReport } from '../src/lib/auditReport.js';

const schema = JSON.parse(await readFile(new URL('../docs/quasaric-security-audit.schema.json', import.meta.url), 'utf8'));

test('published audit schema targets JSON Schema 2020-12 and pins package v2', () => {
  assert.equal(schema.$schema, 'https://json-schema.org/draft/2020-12/schema');
  assert.equal(schema.properties.format.const, 'quasaric-security-audit');
  assert.equal(schema.properties.version.const, 2);
  assert.deepEqual([...schema.required].sort(), [
    'format', 'version', 'exportedAt', 'summary', 'scope', 'methodology',
    'analysis', 'inventory', 'findings', 'prioritizedFindings', 'posture',
    'comparison', 'integrity'
  ].sort());
  assert.equal(schema.properties.integrity.properties.algorithm.const, 'SHA-256');
  assert.equal(schema.properties.integrity.properties.digest.pattern, '^[a-f0-9]{64}$');
});

test('published schema required fields stay aligned with actual v2 exports', async () => {
  const serialized = await createAuditReport({
    analysis: {
      analyzedAt: '2026-11-03T12:00:00.000Z',
      sources: { nvd: 'queried', epss: 'unavailable' },
      errors: [],
      limits: [],
      findings: [{ id: 'CVE-2026-1234', severity: 'High', kev: false, components: [{ applicabilityStatus: 'needs_review' }] }]
    },
    inventory: [{ id: 'component-1', name: 'example', version: '1.0' }],
    prioritizedFindings: [{ id: 'CVE-2026-1234', riskPriority: { band: 'high' } }]
  });
  const parsed = await parseAuditReport(serialized);
  const report = parsed.report;
  assert.deepEqual(Object.keys(report).sort(), [...schema.required].sort());
  assert.deepEqual(Object.keys(report.summary).sort(), [...schema.properties.summary.required].sort());
  assert.deepEqual(Object.keys(report.scope).sort(), [...schema.properties.scope.required].sort());
  assert.deepEqual(Object.keys(report.analysis).sort(), [...schema.properties.analysis.required].sort());
  assert.equal(parsed.integrity.verified, true);
  assert.match(report.integrity.digest, new RegExp(schema.properties.integrity.properties.digest.pattern));
  assert.equal(report.scope.inventoryComponents, report.inventory.length);
  assert.equal(report.scope.findings, report.findings.length);
});

test('schema documents the digest as integrity detection rather than sender authentication', () => {
  assert.match(schema.description, /does not authenticate the sender/i);
  assert.match(schema.description, /integrity property omitted/i);
});
