const unique = values => [...new Set(values.filter(Boolean))];

/**
 * Build conservative, component-scoped remediation guidance.
 * A concrete Ubuntu target is shown only when the Ubuntu OSV classifier
 * matched the installed binary and exposed exactly one advisory binary build.
 */
export function buildRemediationGuidance(finding = {}, assessment = {}) {
  const component = assessment.component || {};
  const osv = assessment.ubuntuOsv || null;
  const binaryEvidence = osv?.ubuntuBinaryEvidence || [];
  const exactMatches = binaryEvidence.filter(item =>
    item.binaryName === component.name &&
    item.installedBinaryVersion === component.version &&
    item.sourcePackage === component.sourcePackage &&
    item.ecosystem === (component.ecosystem || component.vendor)
  );
  const targets = unique(exactMatches.map(item => item.advisoryBinaryVersion));
  const references = unique([
    ...(assessment.evidence || []).flatMap(item => item.references || []),
    ...(assessment.evidence || []).map(item => item.url),
    ...((finding.references || []).map(item => typeof item === 'string' ? item : item.url))
  ]).filter(url => /^https:\/\//i.test(url));

  if (osv?.status === 'affected' && exactMatches.length && targets.length === 1) {
    return {
      status: 'update_candidate',
      currentVersion: component.version || null,
      targetVersion: targets[0],
      packageName: component.name || null,
      sourcePackage: component.sourcePackage || null,
      ecosystem: component.ecosystem || component.vendor || null,
      reason: 'Ubuntu OSV classifies the exact source package as affected and maps this installed binary to one published fixed build. Verify the matching Ubuntu Security Notice before changing production.',
      references,
      confirmed: false
    };
  }

  if (osv?.status === 'patched_candidate') {
    return {
      status: 'fix_candidate_present',
      currentVersion: component.version || null,
      targetVersion: null,
      reason: 'Ubuntu OSV indicates a patched candidate for this exact package context. Confirm the installed build and official Ubuntu notice; this is not proof of remediation.',
      references,
      confirmed: false
    };
  }

  return {
    status: 'manual_review',
    currentVersion: component.version || null,
    targetVersion: null,
    reason: exactMatches.length > 0
      ? 'The advisory does not provide one unambiguous fixed binary build for this exact installed package.'
      : 'No exact, source-backed fixed version is available for this component. Review the vendor advisory and verify product, release, architecture and installed build.',
    references,
    confirmed: false
  };
}

export function buildFindingRemediation(finding = {}) {
  return (finding.components || []).map(assessment => ({
    component: assessment.component,
    guidance: buildRemediationGuidance(finding, assessment)
  }));
}
