const MAX_AUDIT_REPORT_BYTES = 20 * 1024 * 1024;

function countBy(values) {
  const counts = new Map();
  for (const value of values) {
    const key = String(value || 'unknown').trim().toLowerCase() || 'unknown';
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return Object.fromEntries([...counts.entries()].sort(([a], [b]) => a.localeCompare(b)));
}

function buildAuditSummary(analysis, prioritizedFindings) {
  const findings = analysis.findings;
  const assessments = findings.flatMap(finding =>
    Array.isArray(finding?.components) ? finding.components : []
  );
  const priority = Array.isArray(prioritizedFindings) ? prioritizedFindings : [];
  const sources = analysis.sources && typeof analysis.sources === 'object' && !Array.isArray(analysis.sources)
    ? analysis.sources : {};
  return {
    candidateFindings: findings.length,
    componentAssessments: assessments.length,
    kevFindings: findings.filter(finding => finding?.kev === true).length,
    severity: countBy(findings.map(finding => finding?.severity)),
    applicability: countBy(assessments.map(item => item?.applicabilityStatus)),
    priorityBands: countBy(priority.map(finding => finding?.riskPriority?.band)),
    sourceStatuses: countBy(Object.values(sources)),
    sourceCount: Object.keys(sources).length,
    queryErrors: Array.isArray(analysis.errors) ? analysis.errors.length : 0,
    queryLimits: Array.isArray(analysis.limits) ? analysis.limits.length : 0
  };
}

async function sha256(value) {
  if (!globalThis.crypto?.subtle || typeof TextEncoder === 'undefined') {
    throw new Error('SHA-256 verification is not supported in this browser context.');
  }
  const digest = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

function stableJson(value) {
  if (Array.isArray(value)) return '[' + value.map(stableJson).join(',') + ']';
  if (value && typeof value === 'object') {
    return '{' + Object.keys(value).sort().map(key => JSON.stringify(key) + ':' + stableJson(value[key])).join(',') + '}';
  }
  return JSON.stringify(value);
}

function validateAuditPayload(report) {
  if (!report || typeof report !== 'object' || Array.isArray(report) ||
      report.format !== 'quasaric-security-audit' ||
      ![1, 2].includes(report.version) ||
      typeof report.exportedAt !== 'string' || !Number.isFinite(Date.parse(report.exportedAt)) ||
      !report.analysis || typeof report.analysis !== 'object' || Array.isArray(report.analysis) ||
      !report.summary || typeof report.summary !== 'object' || Array.isArray(report.summary) ||
      !report.scope || typeof report.scope !== 'object' || Array.isArray(report.scope) ||
      !Array.isArray(report.inventory) || !Array.isArray(report.findings) ||
      !Array.isArray(report.prioritizedFindings) ||
      !report.analysis.sources || typeof report.analysis.sources !== 'object' || Array.isArray(report.analysis.sources) ||
      !Array.isArray(report.analysis.errors) || !Array.isArray(report.analysis.limits) ||
      !Array.isArray(report.analysis.purlAdvisories) ||
      report.scope.inventoryComponents !== report.inventory.length ||
      report.scope.findings !== report.findings.length ||
      report.summary.candidateFindings !== report.findings.length ||
      report.summary.queryErrors !== report.analysis.errors.length ||
      report.summary.queryLimits !== report.analysis.limits.length ||
      (report.version === 2 && report.scope.analysisTimestamp !== (report.analysis.analyzedAt || null)) ||
      report.inventory.some(item => !item || typeof item !== 'object' || Array.isArray(item)) ||
      report.findings.some(item => !item || typeof item !== 'object' || Array.isArray(item)) ||
      report.prioritizedFindings.some(item => !item || typeof item !== 'object' || Array.isArray(item))) {
    throw new TypeError('The audit package has an invalid or inconsistent structure.');
  }
}

export async function createAuditReport({
  analysis,
  inventory = [],
  prioritizedFindings = [],
  posture = null,
  comparison = null,
  exportedAt = new Date().toISOString()
} = {}) {
  if (!analysis || typeof analysis !== 'object' || Array.isArray(analysis)) {
    throw new TypeError('A completed analysis is required to create an audit report.');
  }
  if (!Array.isArray(analysis.findings) || !Array.isArray(inventory) || !Array.isArray(prioritizedFindings)) {
    throw new TypeError('Analysis findings, inventory and prioritized findings must be arrays.');
  }
  const report = {
    format: 'quasaric-security-audit',
    version: 2,
    exportedAt,
    summary: buildAuditSummary(analysis, prioritizedFindings),
    scope: {
      inventoryComponents: inventory.length,
      findings: analysis.findings.length,
      analysisTimestamp: analysis.analyzedAt || null
    },
    methodology: {
      resultType: 'candidate_correlation',
      riskScore: 'KEV 40 + EPSS 30 + CVSS 20 + applicability 10; triage score, not exploitation probability.',
      applicability: 'Candidate status requires verification against exact vendor advisory, release, package revision, architecture and installed build.',
      absence: 'No candidate in queried sources does not prove that a component is vulnerability-free.',
      history: 'Posture and comparison reflect only snapshots retained in this browser; absence does not prove remediation.',
      integrity: 'SHA-256 detects accidental changes after export; it is not a digital signature and does not prove who created the package.'
    },
    analysis: {
      analyzedAt: analysis.analyzedAt || null,
      sources: analysis.sources || {},
      errors: Array.isArray(analysis.errors) ? analysis.errors : [],
      limits: Array.isArray(analysis.limits) ? analysis.limits : [],
      disclaimer: analysis.disclaimer || null,
      purlAdvisories: Array.isArray(analysis.purlAdvisories) ? analysis.purlAdvisories : []
    },
    inventory,
    findings: analysis.findings,
    prioritizedFindings,
    posture,
    comparison
  };
  let canonical;
  try {
    canonical = JSON.stringify(report);
  } catch {
    throw new TypeError('The assessment contains data that cannot be exported as JSON.');
  }
  const serialized = JSON.stringify({
    ...report,
    integrity: { algorithm: 'SHA-256', digest: await sha256(canonical) }
  }, null, 2);
  if (new TextEncoder().encode(serialized).byteLength > MAX_AUDIT_REPORT_BYTES) {
    throw new RangeError('The audit report exceeds the 20 MB export limit.');
  }
  return serialized;
}

export async function parseAuditReport(input) {
  if (typeof input !== 'string') throw new TypeError('The audit package must be JSON text.');
  if (new TextEncoder().encode(input).byteLength > MAX_AUDIT_REPORT_BYTES) {
    throw new RangeError('The audit report exceeds the 20 MB limit.');
  }
  let report;
  try { report = JSON.parse(input); }
  catch { throw new TypeError('The audit package is not valid JSON.'); }
  validateAuditPayload(report);
  if (report.version === 1) {
    return { report, integrity: { verified: false, legacy: true } };
  }
  const expectedSummary = buildAuditSummary({
    findings: report.findings,
    sources: report.analysis.sources,
    errors: report.analysis.errors,
    limits: report.analysis.limits
  }, report.prioritizedFindings);
  if (stableJson(report.summary) !== stableJson(expectedSummary)) {
    throw new TypeError('The audit package summary does not match its detailed findings and source data.');
  }
  if (!report.integrity || report.integrity.algorithm !== 'SHA-256' ||
      typeof report.integrity.digest !== 'string' || !/^[a-f0-9]{64}$/.test(report.integrity.digest)) {
    throw new TypeError('The audit package has no valid SHA-256 integrity record.');
  }
  const { integrity, ...payload } = report;
  const actual = await sha256(JSON.stringify(payload));
  if (actual !== integrity.digest) {
    throw new Error('The audit package failed SHA-256 verification; its contents may have changed or been corrupted.');
  }
  return { report, integrity: { verified: true, legacy: false, algorithm: integrity.algorithm, digest: integrity.digest } };
}

export { MAX_AUDIT_REPORT_BYTES };
