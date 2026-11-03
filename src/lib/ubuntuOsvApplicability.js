import { compareDebianVersions } from './debianVersions.js';

const normalizeStatus = value => String(value || '').trim().toLowerCase().replaceAll('_', '-');

/**
 * Classify an Ubuntu OSV affected entry against the exact source-package
 * version reported by dpkg. This never compares a binary version to source
 * package ranges and never treats missing evidence as unaffected.
 */
export function classifyUbuntuOsvSourceVersion(affectedEntry, sourceVersion) {
  const version = String(sourceVersion || '').trim();
  if (!affectedEntry?.package?.name || !affectedEntry?.package?.ecosystem || !version) {
    return { status: 'needs_review', reason: 'Exact source package, Ubuntu release and source version are required.' };
  }

  const ecosystemSpecific = affectedEntry.ecosystem_specific || {};
  const status = normalizeStatus(ecosystemSpecific.status || affectedEntry.status);
  if (status === 'dne' || status === 'not-affected') {
    return { status: 'unaffected', confidence: 'high', reason: 'The exact Ubuntu OSV entry explicitly marks this package as not affected.' };
  }

  const listedVersions = Array.isArray(affectedEntry.versions) ? affectedEntry.versions : [];
  if (listedVersions.includes(version)) {
    return { status: 'affected', confidence: 'high', reason: 'The exact source-package version is explicitly listed in Ubuntu OSV affected versions.' };
  }

  let sawComparableRange = false;
  let insideAffectedRange = false;
  let versionInRangeGap = false;
  let fixedVersions = [];
  for (const range of affectedEntry.ranges || []) {
    if (range.type !== 'ECOSYSTEM') continue;
    let introduced = null;
    let rangeIsOpen = false;
    let closedRangeBeforeVersion = false;
    for (const event of range.events || []) {
      if (event.introduced !== undefined) {
        introduced = event.introduced;
        rangeIsOpen = true;
        const afterIntroduction = introduced === '0'
          ? true
          : compareDebianVersions(version, String(introduced));
        if (closedRangeBeforeVersion && afterIntroduction !== null && afterIntroduction < 0) {
          versionInRangeGap = true;
        }
      }
      if (event.fixed !== undefined) {
        const fixed = String(event.fixed);
        const beforeFixed = compareDebianVersions(version, fixed);
        rangeIsOpen = false;
        if (beforeFixed === null) continue;
        sawComparableRange = true;
        fixedVersions.push(fixed);
        const afterIntroduced = introduced === null || introduced === '0'
          ? true
          : (() => {
              const order = compareDebianVersions(version, String(introduced));
              return order !== null && order >= 0;
            })();
        if (beforeFixed < 0 && afterIntroduced) insideAffectedRange = true;
        if (beforeFixed >= 0) closedRangeBeforeVersion = true;
      }
      if (event.last_affected !== undefined) {
        const last = String(event.last_affected);
        const lastAffected = compareDebianVersions(version, last);
        rangeIsOpen = false;
        if (lastAffected !== null) {
          sawComparableRange = true;
          const afterIntroduced = introduced === null || introduced === '0'
            ? true
            : (() => {
                const order = compareDebianVersions(version, String(introduced));
                return order !== null && order >= 0;
              })();
          if (lastAffected <= 0 && afterIntroduced) insideAffectedRange = true;
          if (lastAffected > 0) closedRangeBeforeVersion = true;
        }
      }
    }
    // OSV ranges ending with an introduced event are open-ended until a
    // fixed or last_affected event closes the interval.
    if (rangeIsOpen) {
      const afterIntroduction = introduced === '0'
        ? 1
        : compareDebianVersions(version, String(introduced));
      if (afterIntroduction !== null) {
        sawComparableRange = true;
        if (afterIntroduction >= 0) insideAffectedRange = true;
      }
    }
  }

  if (insideAffectedRange) {
    return { status: 'affected', confidence: 'high', reason: 'The source-package version falls inside the Ubuntu OSV source-version range.' };
  }
  if (sawComparableRange && !versionInRangeGap && fixedVersions.length && fixedVersions.some(fixed => {
    const order = compareDebianVersions(version, fixed);
    return order !== null && order >= 0;
  })) {
    return { status: 'patched_candidate', confidence: 'medium', reason: 'The source-package version is at or beyond the OSV fixed boundary; verify the exact binary build and official Ubuntu notice before confirming remediation.' };
  }

  if (['needs-triage', 'needed', 'ignored', 'pending', 'deferred', 'in-progress'].includes(status)) {
    return { status: 'needs_review', reason: 'Ubuntu OSV records this advisory without a confirmed fixed source-package version.' };
  }
  return {
    status: 'needs_review',
    reason: sawComparableRange
      ? 'The source version was not proven affected or fixed by the available OSV range.'
      : 'The advisory has no usable source-version evidence for this package and release.'
  };
}
