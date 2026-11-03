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

/**
 * Build a portable audit package from the latest local assessment.
 * Source outcomes, errors, limits and raw per-component evidence are retained
 * so an empty result can be distinguished from incomplete source coverage.
 */
export function createAuditReport({
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
    version: 1,
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
      history: 'Posture and comparison reflect only snapshots retained in this browser; absence does not prove remediation.'
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
  let serialized;
  try {
    serialized = JSON.stringify(report, null, 2);
  } catch {
    throw new TypeError('The assessment contains data that cannot be exported as JSON.');
  }
  if (new TextEncoder().encode(serialized).byteLength > MAX_AUDIT_REPORT_BYTES) {
    throw new RangeError('The audit report exceeds the 20 MB export limit.');
  }
  return serialized;
}

export { MAX_AUDIT_REPORT_BYTES };
