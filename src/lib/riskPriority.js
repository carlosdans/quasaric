const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const APPLICABILITY_POINTS = {
  affected: 10,
  possible: 6,
  needs_review: 3,
  version_missing: 0,
  conflicting: 0,
  patched_candidate: 0,
  unaffected: 0
};

const PRIORITY_BANDS = [
  { min: 80, key: 'critical' },
  { min: 60, key: 'high' },
  { min: 35, key: 'moderate' },
  { min: 0, key: 'low' }
];

/**
 * Explainable triage score (0–100), not a probability of exploitation.
 * KEV contributes 40 points, EPSS up to 30, CVSS up to 20, and
 * applicability evidence up to 10. Missing signals contribute zero.
 */
export function calculateRiskPriority(finding = {}) {
  const reasons = [];
  const missing = [];
  const kevPoints = finding.kev ? 40 : 0;
  if (finding.kev) reasons.push('Listed in CISA KEV (+40)');
  else reasons.push('Not listed in CISA KEV (+0)');

  let epssPoints = 0;
  const epss = Number(finding.epss);
  if (finding.epss !== null && finding.epss !== undefined &&
      finding.epss !== '' && Number.isFinite(epss)) {
    const probability = clamp(epss > 1 ? epss / 100 : epss, 0, 1);
    epssPoints = Math.round(probability * 30);
    reasons.push(`EPSS ${(probability * 100).toFixed(1)}% (+${epssPoints})`);
  } else {
    missing.push('EPSS');
    reasons.push('EPSS unavailable (+0)');
  }

  let cvssPoints = 0;
  const cvss = Number(finding.cvss);
  if (finding.cvss !== null && finding.cvss !== undefined &&
      finding.cvss !== '' && Number.isFinite(cvss)) {
    cvssPoints = Math.round(clamp(cvss, 0, 10) * 2);
    reasons.push(`CVSS ${clamp(cvss, 0, 10).toFixed(1)}/10 (+${cvssPoints})`);
  } else {
    missing.push('CVSS');
    reasons.push('CVSS unavailable (+0)');
  }

  const applicability = String(finding.applicabilityStatus || 'needs_review');
  const applicabilityPoints = APPLICABILITY_POINTS[applicability] ?? 0;
  reasons.push(`Applicability ${applicability} (+${applicabilityPoints})`);
  if (!finding.applicabilityStatus || applicability === 'needs_review' ||
      applicability === 'version_missing' || applicability === 'conflicting') {
    missing.push('applicability confirmation');
  }

  const score = clamp(kevPoints + epssPoints + cvssPoints + applicabilityPoints, 0, 100);
  const band = PRIORITY_BANDS.find(item => score >= item.min) || PRIORITY_BANDS.at(-1);
  return {
    score,
    band: band.key,
    kevPoints,
    epssPoints,
    cvssPoints,
    applicabilityPoints,
    missing,
    reasons,
    isConfirmed: false,
    label: 'candidate_triage'
  };
}

export function rankFindingsByRisk(findings = []) {
  return findings
    .map(finding => ({ ...finding, riskPriority: calculateRiskPriority(finding) }))
    .sort((a, b) =>
      b.riskPriority.score - a.riskPriority.score ||
      String(a.id).localeCompare(String(b.id))
    );
}
