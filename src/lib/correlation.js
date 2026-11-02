import { normalizeComponentType } from './componentTypes.js';
import { parsePackageUrl } from './packageUrl.js';
import { classifyUbuntuOsvSourceVersion } from './ubuntuOsvApplicability.js';
import { compareDebianVersions } from './debianVersions.js';
import { fetchNvdByKeyword, fetchNvdByVirtualMatchString, fetchEpssScores, fetchKevCatalog, fetchUbuntuOsvForSourcePackage, matchUbuntuOsvBinary, matchCanonicalUbuntuVexProduct, fetchCanonicalUbuntuVex, fetchOsvForPurl, fetchOsvForDistroPackage, resolveOsvDistroEcosystem, fetchRedHatCve, matchRedHatCveComponent, fetchSuseCsafVex, matchSuseCsafVexComponent, extractCveSummary, isSupportedUbuntuOsvEcosystem } from './vulnerabilitySources.js';

const NVD_MAX_RESULTS = 6000;

const normalize = value => String(value || '').toLowerCase().replace(/[^a-z0-9.+_-]/g, ' ').trim();

const unique = values => [...new Set(values)];

function componentQueries(component) {
  const aliases = { apache: 'apache http server', 'apache http server': 'apache http server', apache2: 'apache http server', httpd: 'apache http server', node: 'node.js', nodejs: 'node.js', 'node js': 'node.js', 'php-fpm': 'php', iis: 'internet information services', 'microsoft iis': 'internet information services' };
  const name = normalize(component.name);
  return [aliases[name] || name].filter(Boolean);
}
function splitCpe23(criteria) {
  const fields = [];
  let field = '';
  let escaped = false;
  for (const character of String(criteria || '')) {
    if (escaped) {
      field += character === '*' ? '\uE000' : character === '-' ? '\uE001' : character === '?' ? '\uE002' : character === '_' ? '\uE003' : character;
      escaped = false;
    } else if (character === '\\') {
      escaped = true;
    } else if (character === ':') {
      fields.push(field);
      field = '';
    } else {
      field += character;
    }
  }
  if (escaped) field += '\\';
  fields.push(field);
  return fields;
}
function cpeProduct(criteria) {
  const parts = splitCpe23(criteria);
  return {
    part: parts[2] || '*',
    vendor: (parts[3] || '').replaceAll('\uE000', '*').replaceAll('\uE001', '-').replaceAll('\uE003', '\uE004').replaceAll('_', ' ').replaceAll('\uE004', '_'),
    product: (parts[4] || '').replaceAll('\uE000', '*').replaceAll('\uE001', '-').replaceAll('\uE003', '\uE004').replaceAll('_', ' ').replaceAll('\uE004', '_'),
    version: (parts[5] || '*').replaceAll('\uE000', '*').replaceAll('\uE001', '-').replaceAll('\uE002', '?'),
    versionWildcard: (parts[5] || '*') === '*',
    versionPattern: /[*?]/.test(parts[5] || '*'),
    versionNotApplicable: (parts[5] || '*') === '-'
  };
}

export function summarizeApplicabilityStatus(matchedComponents) {
  const statuses = unique((matchedComponents || [])
    .map(item => item?.applicability?.status)
    .filter(Boolean));
  // A single CVE can map to several installed components. Never let the
  // first match hide contradictory or incomplete per-component assessments.
  return statuses.length === 1 ? statuses[0] : 'needs_review';
}

/**
 * Keep Canonical OpenVEX as independent, exact-product evidence. The OSV
 * affected entry supplies the source PURL (arch=source); OpenVEX is matched
 * against the installed binary's exact name/version/architecture/distro.
 */
export function classifyCanonicalUbuntuVexComponent(vexRecord, record, component) {
  const sourcePackage = String(component?.sourcePackage || '').trim();
  const ecosystem = String(component?.ecosystem || component?.vendor || '').trim();
  const affectedEntry = (record?.affected || []).find(entry =>
    entry.package?.name === sourcePackage &&
    entry.package?.ecosystem === ecosystem
  );
  const result = matchCanonicalUbuntuVexProduct(
    vexRecord,
    component,
    affectedEntry?.package?.purl
  );
  return {
    ...result,
    source: 'Canonical OpenVEX',
    documentTimestamp: vexRecord?.timestamp || null,
    documentVersion: vexRecord?.version ?? null,
    documentUrl: vexRecord?.sourceUrl || vexRecord?.['@id'] || null
  };
}

function compareUbuntuOsvAndVex(osv, vex) {
  const osvStatus = osv?.status;
  const vexStatus = vex?.status;
  if (!['affected', 'patched_candidate', 'unaffected'].includes(osvStatus) ||
      !['affected', 'fixed', 'not_affected'].includes(vexStatus)) {
    return { status: 'not_comparable', reason: 'One or both sources do not provide a directly comparable product status.' };
  }

  const conflict =
    (osvStatus === 'affected' && ['fixed', 'not_affected'].includes(vexStatus)) ||
    (osvStatus === 'patched_candidate' && vexStatus === 'affected') ||
    (osvStatus === 'unaffected' && vexStatus === 'affected');

  return conflict
    ? { status: 'conflicting', reason: `Ubuntu OSV reports ${osvStatus}, while exact-product OpenVEX reports ${vexStatus}; review both advisories.` }
    : { status: 'aligned', reason: 'Ubuntu OSV and exact-product OpenVEX do not show a direct status contradiction.' };
}

export function classifyUbuntuOsvComponent(record, component) {
  const sourcePackage = String(component?.sourcePackage || '').trim();
  const ecosystem = String(component?.ecosystem || component?.vendor || '').trim();
  const binaryVersion = String(component?.version || '').trim();
  const binaryMatch = matchUbuntuOsvBinary(record, component?.name, binaryVersion, ecosystem, sourcePackage);
  const affectedEntry = (record?.affected || []).find(entry =>
    entry.package?.name === sourcePackage && entry.package?.ecosystem === ecosystem
  );
  const sourceClassification = classifyUbuntuOsvSourceVersion(
    affectedEntry && affectedEntry.package?.name === record.package ? affectedEntry : null,
    component?.sourceVersion
  );

  let status = 'needs_review';
  let reason = sourceClassification.reason;
  const advisoryBinaryVersions = [...new Set(
    (binaryMatch.evidence || []).map(item => item.advisoryBinaryVersion).filter(Boolean)
  )];
  const hasFixedSourceBoundary = (affectedEntry?.ranges || []).some(range =>
    range.type === 'ECOSYSTEM' && (range.events || []).some(event => event.fixed !== undefined)
  );

  if (binaryMatch.status !== 'matched') {
    reason = `Ubuntu binary-to-source mapping is unconfirmed: ${binaryMatch.reason} Source-version assessment: ${sourceClassification.reason}`;
  } else if (hasFixedSourceBoundary && advisoryBinaryVersions.length > 1) {
    reason = 'The advisory lists multiple fixed binary versions for this binary package; manual review is required.';
  } else if (sourceClassification.status === 'affected') {
    if (!hasFixedSourceBoundary || !advisoryBinaryVersions.length) {
      // A binary list can exist even when Ubuntu has not published a fixed
      // source boundary. In that case its version is not a fixed boundary.
      // The exact source version must be explicitly listed as affected.
      status = 'affected';
      reason = 'The exact source version is listed as affected and the binary package is listed under the matching Ubuntu source package.';
    } else {
      const binaryOrder = compareDebianVersions(binaryVersion, advisoryBinaryVersions[0]);
      if (binaryOrder !== null && binaryOrder < 0) {
        status = 'affected';
        reason = 'The source version is affected and the installed binary version is below the advisory fixed binary build.';
      } else {
        reason = 'The source version is classified as affected, but the installed binary version is at or beyond the published fixed build (or cannot be compared); evidence conflicts and requires review.';
      }
    }
  } else if (sourceClassification.status === 'patched_candidate') {
    if (hasFixedSourceBoundary && advisoryBinaryVersions.length === 1) {
      const binaryOrder = compareDebianVersions(binaryVersion, advisoryBinaryVersions[0]);
      if (binaryOrder !== null && binaryOrder >= 0) {
        status = 'patched_candidate';
        reason = 'The source version is at or beyond the fixed boundary and the installed binary version is at or beyond the published fixed binary build; verify the official Ubuntu notice before confirming remediation.';
      } else {
        reason = 'The source version is at or beyond the fixed boundary, but the installed binary version is below the published fixed build or cannot be compared.';
      }
    } else {
      reason = 'The source version is at or beyond the fixed boundary, but the advisory provides no fixed binary build for this package.';
    }
  } else if (sourceClassification.status === 'unaffected') {
    status = 'unaffected';
    reason = sourceClassification.reason;
  }

  const binaryEvidence = binaryMatch.status === 'matched'
    ? binaryMatch.evidence.map(item => ({ ...item, installedBinaryVersion: binaryVersion }))
    : [];
  return {
    status,
    confidence: status === 'affected' ? 'high' : 'medium',
    reason,
    ubuntuSourceEvidence: {
      sourcePackage: sourcePackage || null,
      sourceVersion: component?.sourceVersion || null,
      ecosystem: ecosystem || null,
      classification: sourceClassification.status
    },
    ubuntuBinaryEvidence: binaryEvidence
  };
}

import { compareVersionForComponent } from './universalVersions.js';

function compareVersions(a, b, component) {
  return compareVersionForComponent(a, b, component);
}

export function cpeMatchesComponent(criteria, component) {
  const cpe = cpeProduct(criteria);
  const vendor = normalize(cpe.vendor);
  const product = normalize(cpe.product);
  const name = normalize(component.name);
  const expectedPart = component.type === 'os' || ['ubuntu', 'debian', 'windows server', 'windows server 2019', 'windows server 2022', 'windows server 2025', 'red hat enterprise linux', 'rhel', 'fedora', 'alpine linux', 'almalinux', 'rocky linux', 'suse linux enterprise server', 'sles'].includes(name) ? 'o' : 'a';
  if (cpe.part !== '*' && cpe.part !== expectedPart) return false;
  // A user-supplied CPE is an explicit product identity for otherwise
  // unsupported labels. It is only an identity hint: NVD version ranges
  // remain authoritative, and malformed/incomplete CPEs fail closed.
  const declaredCpe = String(component.cpe || '').trim();
  if (declaredCpe) {
    const declaredFields = splitCpe23(declaredCpe);
    if (declaredFields.length !== 13 || declaredFields[0] !== 'cpe' || declaredFields[1] !== '2.3') return false;
    const declaredPart = declaredFields[2];
    const declaredVendor = normalize(declaredFields[3].replaceAll('\\_', '_'));
    const declaredProduct = normalize(declaredFields[4].replaceAll('\\_', '_'));
    return (declaredPart === '*' || declaredPart === cpe.part) &&
      declaredVendor !== '' && declaredProduct !== '' &&
      declaredVendor === vendor && declaredProduct === product;
  }
  // Match the vendor/product pair, not a loose product-name fragment.
  // This avoids confusing Apache HTTP Server with Tomcat or other Apache projects.
  const productPairs = {
    nginx: [['nginx', 'nginx']],
    openssl: [['openssl', 'openssl']],
    apache: [['apache', 'http server']],
    'apache http server': [['apache', 'http server']],
    httpd: [['apache', 'http server']],
    apache2: [['apache', 'http server']],
    php: [['php', 'php']],
    'php-fpm': [['php', 'php']],
    python: [['python', 'python']],
    postgresql: [['postgresql', 'postgresql']],
    mongodb: [['mongodb', 'mongodb']],
    iis: [['microsoft', 'internet information services'], ['microsoft', 'internet_information_services']],
    'microsoft iis': [['microsoft', 'internet information services'], ['microsoft', 'internet_information_services']],
    wordpress: [['wordpress', 'wordpress']],
    joomla: [['joomla', 'joomla']],
    drupal: [['drupal', 'drupal']],
    mysql: [['oracle', 'mysql'], ['mysql', 'mysql']],
    mariadb: [['mariadb', 'mariadb']],
    ubuntu: [['canonical', 'ubuntu linux'], ['canonical', 'ubuntu']],
    debian: [['debian', 'debian linux'], ['debian', 'debian']],
    'red hat enterprise linux': [['redhat', 'enterprise linux']],
    rhel: [['redhat', 'enterprise linux']],
    fedora: [['fedoraproject', 'fedora']],
    'alpine linux': [['alpinelinux', 'alpine linux']],
    almalinux: [['almalinux', 'almalinux']],
    'rocky linux': [['resf', 'rocky linux']],
    'suse linux enterprise server': [['suse', 'linux enterprise server']],
    sles: [['suse', 'linux enterprise server']],
    'windows server': [['microsoft', 'windows server']],
    'windows server 2019': [['microsoft', 'windows server 2019']],
    'windows server 2022': [['microsoft', 'windows server 2022']],
    'windows server 2025': [['microsoft', 'windows server 2025']],
    node: [['nodejs', 'node.js'], ['node.js', 'node.js']],
    nodejs: [['nodejs', 'node.js'], ['node.js', 'node.js']],
    'node.js': [['nodejs', 'node.js'], ['node.js', 'node.js']],
    'node js': [['nodejs', 'node.js'], ['node.js', 'node.js']]
  };
  // Unknown inventory labels do not establish a trustworthy CPE vendor/product identity.
  // Fail closed instead of assuming that the component name is both fields.
  const accepted = productPairs[name];
  if (!accepted) return false;
  return accepted.some(([expectedVendor, expectedProduct]) =>
    vendor === expectedVendor && product === expectedProduct
  );
}

function matchesProductText(cve, component) {
  const cpes = (cve.configurations || []).flatMap(config => collectCpeMatches(config.nodes || []));
  return cpes.some(item => item.vulnerable !== false && cpeMatchesComponent(item.criteria, component));
}

export function classifyPhpDescriptionApplicability(cve, component) {
  if (normalize(component.name) !== 'php') return null;
  const descriptions = (cve.descriptions || [])
    .filter(item => !item.lang || item.lang === 'en')
    .map(item => String(item.value || ''))
    .join(' ');
  if (!/\bPHP\b/i.test(descriptions)) return null;

  // NVD descriptions often contain branch-specific ranges while the CPE
  // entry is an unbounded wildcard. Parse only explicit bounds and scope an
  // unqualified boundary to its own major.minor branch (e.g. "before 8.1.29"
  // means the 8.1 branch, never every PHP release below 8.1.29).
  const clauses = [];
  const pattern = /(?:(\d+)\.(\d+|x)\.(?:x|\*)\s+)?(before|prior to|below|less than|through|up to and including|earlier than)\s+(?:version\s+)?(\d+\.\d+(?:\.\d+)?)/gi;
  for (const match of descriptions.matchAll(pattern)) {
    const [, familyMajor, familyMinor, operator, boundary] = match;
    const boundaryParts = boundary.split('.').map(Number);
    const family = {
      major: familyMajor ? Number(familyMajor) : boundaryParts[0],
      minor: familyMajor && familyMinor.toLowerCase() === 'x' ? null
        : familyMajor ? Number(familyMinor) : boundaryParts[1]
    };
    clauses.push({ family, operator: operator.toLowerCase(), boundary });
  }
  if (!clauses.length) return null;

  const installed = String(component.version || '').trim();
  let uncertainRange = false;
  const applies = clauses.some(({ family, operator, boundary }) => {
    const parts = installed.match(/^\d+(?:\.\d+){0,2}/)?.[0];
    if (!parts) { uncertainRange = true; return false; }
    const [major, minor] = parts.split('.').map(Number);
    if (major !== family.major || (family.minor !== null && minor !== family.minor)) return false;
    const order = compareVersions(installed, boundary, component);
    if (order === null) { uncertainRange = true; return false; }
    return ['before', 'prior to', 'below', 'less than', 'earlier than'].includes(operator)
      ? order < 0
      : order <= 0;
  });

  if (!applies && uncertainRange) {
    return { status: 'needs_review', confidence: 'low', reason: 'The installed PHP version contains a suffix or format that cannot be safely ordered against the NVD release boundary.' };
  }
  if (!applies) {
    return { status: 'not_affected', confidence: 'medium', reason: 'The explicit PHP release ranges in the NVD description do not include the installed version.' };
  }
  if (descriptions.includes('GD Graphics Library') || /\bGD\b/i.test(descriptions)) {
    return { status: 'needs_review', confidence: 'medium', reason: 'This PHP issue depends on the GD graphics library/extension being present and affected; verify the installed GD build.' };
  }
  return { status: 'possible', confidence: 'medium', reason: 'The NVD description explicitly places this PHP version within an affected release range; confirm extensions, runtime mode and vendor build details.' };
}

export function classifyCpeApplicability(cpeItems, component) {
  const version = String(component.version || '').trim();
  if (!version) return { status: 'version_missing', confidence: 'low', reason: 'No exact version was supplied.' };
  const relevant = cpeItems.filter(item => cpeMatchesComponent(item.criteria, component));
  if (!relevant.length) return { status: 'needs_review', confidence: 'low', reason: 'No matching product CPE was found; product-text matches remain unverified candidates.' };

  const affected = relevant.map(item => {
    if (item.vulnerable === false) return false;
    const cpe = cpeProduct(item.criteria);
    const bounded = Boolean(item.versionStartIncluding || item.versionStartExcluding || item.versionEndIncluding || item.versionEndExcluding);
    if (cpe.versionNotApplicable) return false;
    if (cpe.versionPattern && !cpe.versionWildcard) return null;
    if (cpe.versionWildcard && !bounded) return false;
    if (!cpe.versionWildcard && cpe.version !== version) return false;
    let uncertain = false;
    const checks = [
      [item.versionStartIncluding, order => order >= 0],
      [item.versionStartExcluding, order => order > 0],
      [item.versionEndIncluding, order => order <= 0],
      [item.versionEndExcluding, order => order < 0]
    ];
    for (const [boundary, accepts] of checks) {
      // NVD uses an inclusive lower boundary of 0 to mean all released versions.
      // It is a sentinel, not a version that can be ordered against distro revisions.
      if (!boundary || (boundary === '0' && item.versionStartIncluding === '0')) continue;
      const order = compareVersions(version, boundary, component);
      if (order === null) { uncertain = true; continue; }
      if (!accepts(order)) return false;
    }
    return uncertain ? null : true;
  });
  if (affected.includes(true)) return { status: 'possible', confidence: 'medium', reason: 'The supplied version falls within an NVD CPE match/range. Confirm against the vendor advisory and distribution build before treating as affected.' };
  if (affected.includes(null)) return { status: 'needs_review', confidence: 'low', reason: 'The NVD CPE range uses a version format or suffix that cannot be safely ordered against the installed version.' };

  // When NVD enumerates only concrete versions for this exact product, an
  // installed version outside that list is not an applicable candidate. Do
  // not turn historical product-name matches into findings for newer releases.
  const vulnerableCpes = relevant.filter(item => item.vulnerable !== false);
  const explicitlyScoped = vulnerableCpes.length > 0 && vulnerableCpes.every(item => {
    const cpe = cpeProduct(item.criteria);
    const hasConcreteVersion = !cpe.versionWildcard && !cpe.versionPattern && !cpe.versionNotApplicable;
    const hasVersionBoundary = Boolean(
      item.versionStartIncluding || item.versionStartExcluding ||
      item.versionEndIncluding || item.versionEndExcluding
    );
    return hasConcreteVersion || hasVersionBoundary;
  });
  if (explicitlyScoped) {
    return { status: 'not_affected', confidence: 'high', reason: 'The installed version is outside the concrete versions and explicit affected ranges enumerated by NVD.' };
  }
  return { status: 'needs_review', confidence: 'low', reason: 'A product CPE exists, but the supplied version was not proven to fall in its affected range.' };
}

export function collectCpeMatches(nodes = []) {
  return nodes.flatMap(node => [
    ...(node.cpeMatch || []),
    ...collectCpeMatches(node.children || [])
  ]);
}

export function hasUnsupportedCpeLogic(configurations = []) {
  const hasAndOrNegation = node =>
    String(node?.operator || '').toUpperCase() === 'AND' ||
    node?.negate === true ||
    (node?.children || []).some(hasAndOrNegation);

  return configurations.some(configuration =>
    String(configuration?.operator || '').toUpperCase() === 'AND' ||
    configuration?.negate === true ||
    (configuration?.nodes || []).some(hasAndOrNegation)
  );
}

// Tri-state CPE evaluation: true = proven present, false = proven absent,
// null = inventory does not contain enough information. Environmental CPEs
// (vulnerable:false) participate in the logic just like vulnerable products.
function cpeConditionInInventory(item, inventory) {
  const matching = inventory.filter(component => cpeMatchesComponent(item.criteria, component));
  if (!matching.length) return null;
  const cpe = cpeProduct(item.criteria);
  const results = matching.map(component => {
    const version = String(component.version || '').trim();
    if (!version) return null;
    if (cpe.versionNotApplicable) return false;
    if (cpe.versionPattern && !cpe.versionWildcard) return null;
    if (!cpe.versionWildcard && cpe.version !== version) return false;
    const checks = [
      [item.versionStartIncluding, order => order >= 0],
      [item.versionStartExcluding, order => order > 0],
      [item.versionEndIncluding, order => order <= 0],
      [item.versionEndExcluding, order => order < 0]
    ];
    for (const [boundary, accepts] of checks) {
      // NVD uses an inclusive lower boundary of 0 to mean all released versions.
      // It is a sentinel, not a version that can be ordered against distro revisions.
      if (!boundary || (boundary === '0' && item.versionStartIncluding === '0')) continue;
      const order = compareVersions(version, boundary, component);
      if (order === null) return null;
      if (!accepts(order)) return false;
    }
    // A wildcard CPE still proves product presence for configuration logic;
    // vulnerability range classification is performed separately per product.
    return !cpe.versionNotApplicable;
  });
  if (results.includes(true)) return true;
  return results.includes(null) ? null : false;
}

function combineCpeResults(results, operator) {
  if (!results.length) return null;
  if (operator === 'AND') {
    if (results.includes(false)) return false;
    return results.every(result => result === true) ? true : null;
  }
  if (results.includes(true)) return true;
  return results.every(result => result === false) ? false : null;
}

function evaluateCpeNode(node, inventory) {
  const own = (node.cpeMatch || []).map(item => cpeConditionInInventory(item, inventory));
  const children = (node.children || []).map(child => evaluateCpeNode(child, inventory));
  const result = combineCpeResults([...own, ...children], String(node.operator || 'OR').toUpperCase());
  return node.negate ? (result === null ? null : !result) : result;
}

export function evaluateCpeConfigurations(configurations = [], inventory = []) {
  const results = configurations.map(configuration => {
    const nodes = (configuration.nodes || []).map(node => evaluateCpeNode(node, inventory));
    const result = combineCpeResults(nodes, String(configuration.operator || 'OR').toUpperCase());
    return configuration.negate ? (result === null ? null : !result) : result;
  });
  return combineCpeResults(results, 'OR');
}

function applicability(cve, component, inventory = [component]) {
  const configurations = cve.configurations || [];
  if (hasUnsupportedCpeLogic(configurations)) {
    const wholeInventory = evaluateCpeConfigurations(configurations, inventory);
    if (wholeInventory === false) {
      return {
        status: 'not_affected',
        confidence: 'medium',
        reason: 'The complete installed inventory does not satisfy the NVD AND/negated CPE configuration.'
      };
    }
    if (wholeInventory !== true) {
      return {
        status: 'needs_review',
        confidence: 'low',
        reason: 'The NVD CPE configuration contains AND/negated conditions and the inventory does not prove that every required product and version is present.'
      };
    }
    const cpes = configurations.flatMap(config => collectCpeMatches(config.nodes || []));
    return classifyCpeApplicability(cpes, component);
  }
  const cpes = configurations.flatMap(config => collectCpeMatches(config.nodes || []));
  return classifyCpeApplicability(cpes, component);
}

export async function analyzeInventory(components, { signal, onProgress, sources: sourceOverrides = {} } = {}) {
  // Dependency overrides keep integration tests deterministic without changing
  // the production source defaults or sending local inventory to test services.
  const sourceApi = {
    fetchNvdByKeyword, fetchNvdByVirtualMatchString, fetchEpssScores, fetchKevCatalog,
    fetchUbuntuOsvForSourcePackage, fetchCanonicalUbuntuVex, fetchOsvForPurl, fetchRedHatCve, fetchSuseCsafVex,
    ...sourceOverrides
  };
  if (!Array.isArray(components) || components.length === 0) throw new Error('Add at least one component before analysis.');
  components = components.map(normalizeComponentType);

  const errors = [];
  const ubuntuOsv = new Map();
  const ubuntuComponents = components.filter(component =>
    isSupportedUbuntuOsvEcosystem(component.ecosystem || component.vendor)
  );
  const ubuntuGroups = new Map();
  for (const component of ubuntuComponents) {
    const sourcePackage = String(component.sourcePackage || '').trim();
    const ecosystem = String(component.ecosystem || component.vendor || '').trim();
    if (!sourcePackage) {
      errors.push({ source: 'Ubuntu OSV', component: component.name,
        message: 'Falta el paquete fuente. Añádelo desde el inventario local; no se inferirá a partir del nombre binario.' });
      continue;
    }
    const key = ecosystem + '::' + sourcePackage;
    if (!ubuntuGroups.has(key)) ubuntuGroups.set(key, { ecosystem, sourcePackage });
  }
  for (const group of ubuntuGroups.values()) {
    try {
      const records = await sourceApi.fetchUbuntuOsvForSourcePackage(group.sourcePackage, group.ecosystem, { signal });
      for (const record of records) {
        const existing = ubuntuOsv.get(record.id) || [];
        existing.push(record);
        ubuntuOsv.set(record.id, existing);
      }
    } catch (error) {
      if (error.name === 'AbortError') throw error;
      errors.push({ source: 'Ubuntu OSV', component: group.sourcePackage, message: error.message });
    }
  }
  const allCandidates = new Map();
  const limits = [];
  // Components often repeat the same product (for example, several PHP
  // runtimes or identical libraries on different hosts). Fetch each distinct
  // NVD query once per analysis, then evaluate the shared records against
  // every component's own version and applicability evidence.
  const nvdQueryCache = new Map();
  const getNvdRecords = (component, query) => {
    const usePhpCpe = normalize(component.name) === 'php' && !sourceOverrides.fetchNvdByKeyword;
    const cacheKey = usePhpCpe ? 'cpe:cpe:2.3:a:php:php' : 'keyword:' + query;
    if (!nvdQueryCache.has(cacheKey)) {
      const request = usePhpCpe
        ? sourceApi.fetchNvdByVirtualMatchString('cpe:2.3:a:php:php', { signal })
        : sourceApi.fetchNvdByKeyword(query, { signal, maxResults: NVD_MAX_RESULTS });
      nvdQueryCache.set(cacheKey, request);
    }
    return nvdQueryCache.get(cacheKey);
  };
  let done = 0;
  for (const component of components) {
    const queries = componentQueries(component);
    for (const query of queries) {
      try {
        // PHP's keyword search is extremely broad (mentions in unrelated
        // advisories routinely hit the 6,000-record ceiling). Its NVD CPE
        // match string is the precise product identity already required by
        // matchesProductText, so use that complete, paginated result set.
        const records = await getNvdRecords(component, query);
        if (records.truncated) limits.push({ source: 'NVD', component: component.name, maxResults: NVD_MAX_RESULTS, totalResults: records.totalResults });
        for (const cve of records) {
          if (!matchesProductText(cve, component)) continue;
          let nvdApplicability = applicability(cve, component, components);
          // Descriptions are a fallback only: never let prose override a
          // structured CPE range that already includes or excludes this version.
          const descriptionApplicability = nvdApplicability.status === 'needs_review' &&
            !hasUnsupportedCpeLogic(cve.configurations || [])
            ? classifyPhpDescriptionApplicability(cve, component)
            : null;
          if (descriptionApplicability) nvdApplicability = descriptionApplicability;
          // Exclude a keyword/product match when the installed version is
          // outside explicit CPE or PHP-description affected ranges.
          if (nvdApplicability.status === 'not_affected') continue;
          const current = allCandidates.get(cve.id) || { cve, components: [] };
          const existingComponent = current.components.find(item => item.component.id === component.id);
          if (existingComponent) {
            existingComponent.nvdMatched = true;
            existingComponent.nvdApplicability = nvdApplicability;
          } else {
            current.components.push({
              component,
              applicability: nvdApplicability,
              nvdMatched: true
            });
          }
          allCandidates.set(cve.id, current);
        }
      } catch (error) {
        if (error.name === 'AbortError') throw error;
        errors.push({ source: 'NVD', component: component.name, message: error.message });
      }
    }
    done++;
    onProgress?.({ completed: done, total: components.length });
  }

  // Query OSV only for explicit PURLs supplied by the inventory/SBOM. Keep
  // requests deduplicated and bounded; generic OSV matches are review evidence,
  // never an automatic affected/not-affected decision.
  const purlGroups = new Map();
  for (const component of components) {
    const purl = String(component.purl || '').trim();
    if (!parsePackageUrl(purl)) continue;
    const version = String(component.version || '').trim();
    const key = `${purl}\u0000${version}`;
    if (!purlGroups.has(key)) purlGroups.set(key, { purl, version, components: [] });
    purlGroups.get(key).components.push(component);
  }
  const purlErrors = [];
  const purlAdvisories = [];
  const purlQueue = [...purlGroups.values()].slice(0, 100);
  if (purlGroups.size > 100) purlErrors.push({ source: 'OSV (PURL)', message: 'Se alcanzó el límite de 100 consultas PURL explícitas por análisis.' });
  let purlNext = 0;
  const purlWorker = async () => {
    while (purlNext < purlQueue.length) {
      const group = purlQueue[purlNext++];
      try {
        const records = await sourceApi.fetchOsvForPurl(group.purl, group.version, { signal });
        for (const record of records) {
          if (record.withdrawn) continue;
          const cveIds = [...new Set([...(record.aliases || []), ...(record.upstream || [])].filter(id => /^CVE-[0-9]{4}-[0-9]+$/.test(id)))];
          if (!cveIds.length) {
            for (const component of group.components) {
              purlAdvisories.push({
                id: record.id,
                summary: record.summary || record.details || '',
                published: record.published || null,
                modified: record.modified || null,
                url: record.id ? `https://osv.dev/vulnerability/${encodeURIComponent(record.id)}` : null,
                references: (record.references || []).map(reference => reference.url).filter(Boolean),
                component: { id: component.id, name: component.name, version: component.version || null, purl: group.purl },
                status: 'needs_review'
              });
            }
            continue;
          }
          for (const cveId of cveIds) {
            const current = allCandidates.get(cveId) || {
              cve: { id: cveId, descriptions: [{ lang: 'en', value: record.summary || record.details || 'OSV advisory; review the upstream record.' }],
                published: record.published, lastModified: record.modified, references: record.references || [], metrics: {}, weaknesses: [] },
              components: []
            };
            for (const component of group.components) {
              const existing = current.components.find(item => item.component.id === component.id);
              const evidence = {
                advisoryId: record.id,
                status: 'needs_review',
                reason: 'OSV matched the explicitly supplied PURL and version. Review the advisory affected ranges and ecosystem-specific guidance before deciding applicability.',
                publishedAt: record.published || null,
                updatedAt: record.modified || null,
                url: record.id ? `https://osv.dev/vulnerability/${encodeURIComponent(record.id)}` : null,
                references: (record.references || []).map(reference => reference.url).filter(Boolean),
                packageUrl: group.purl
              };
              if (existing) existing.osvPurlEvidence = [...(existing.osvPurlEvidence || []), evidence];
              else current.components.push({ component, applicability: { status: 'needs_review', confidence: 'low', reason: evidence.reason }, osvPurlEvidence: [evidence] });
            }
            allCandidates.set(cveId, current);
          }
        }
      } catch (error) {
        if (error.name === 'AbortError') throw error;
        purlErrors.push({ source: 'OSV (PURL)', component: group.purl, message: error.message });
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(3, purlQueue.length) }, () => purlWorker()));

  // Correlate Ubuntu advisories using two independent pieces of evidence:
  // source-package version ranges and the exact binary build mapping. A binary
  // match alone never proves the source version is affected or patched.
  for (const [cveId, records] of ubuntuOsv) {
    for (const record of records) {
      const related = ubuntuComponents.filter(component =>
        String(component.sourcePackage || '').trim() === record.package &&
        String(component.ecosystem || component.vendor || '').trim() === record.ecosystem
      );
      for (const component of related) {
        const applicability = classifyUbuntuOsvComponent(record, component);

        const current = allCandidates.get(cveId) || {
          cve: { id: cveId, descriptions: [{ lang: 'en', value: record.summary || 'Ubuntu OSV advisory; consult the upstream record for technical details.' }],
            published: record.published, lastModified: record.modified, references: record.references || [], metrics: {}, weaknesses: [] },
          components: []
        };
        const existingComponent = current.components.find(item => item.component.id === component.id);
        if (existingComponent) {
          // Keep NVD applicability intact, but retain the independent Ubuntu
          // OSV assessment so it can be compared with exact-product OpenVEX.
          const previousOsvStatus = existingComponent.ubuntuOsv?.status;
          existingComponent.ubuntuOsv = previousOsvStatus && previousOsvStatus !== applicability.status
            ? {
                status: 'needs_review',
                reason: 'Multiple Ubuntu OSV advisories linked to this CVE provide conflicting applicability assessments; review each advisory.'
              }
            : applicability;
          existingComponent.ubuntuOsvEvidence = [
            ...(existingComponent.ubuntuOsvEvidence || []),
            {
              advisoryId: record.osvId || null,
              status: applicability.status,
              reason: applicability.reason,
              publishedAt: record.published || null,
              updatedAt: record.modified || null,
              url: record.osvId ? `https://osv.dev/vulnerability/${encodeURIComponent(record.osvId)}` : null,
              references: (record.references || []).map(reference => reference.url).filter(Boolean)
            }
          ];
        } else {
          current.components.push({
            component,
            applicability,
            ubuntuOsv: applicability,
            ubuntuOsvEvidence: [{
              advisoryId: record.osvId || null,
              status: applicability.status,
              reason: applicability.reason,
              publishedAt: record.published || null,
              updatedAt: record.modified || null,
              url: record.osvId ? `https://osv.dev/vulnerability/${encodeURIComponent(record.osvId)}` : null,
              references: (record.references || []).map(reference => reference.url).filter(Boolean)
            }]
          });
        }
        allCandidates.set(cveId, current);
      }
    }
  }

  // Canonical OpenVEX is a second, independent signal. Fetch one public
  // document per CVE (bounded concurrency) and attach exact-product results
  // without changing the OSV/NVD applicability classification.
  const vexDocuments = new Map();
  const vexErrors = [];
  const eligibleVexIds = [...ubuntuOsv.entries()]
    .filter(([, records]) => records.some(record => ubuntuComponents.some(component =>
      String(component.sourcePackage || '').trim() === record.package &&
      String(component.ecosystem || component.vendor || '').trim() === record.ecosystem &&
      Boolean(String(component.architecture || '').trim()) &&
      (record.affected || []).some(entry =>
        entry.package?.name === record.package &&
        entry.package?.ecosystem === record.ecosystem &&
        Boolean(entry.package?.purl)
      )
    )))
    .map(([cveId]) => cveId);
  const vexQueue = eligibleVexIds.slice(0, 100);
  for (const cveId of eligibleVexIds.slice(100)) {
    vexErrors.push({ cveId, message: 'Se alcanzó el límite de 100 documentos OpenVEX por análisis; este CVE queda sin evidencia VEX.' });
  }
  const vexWorker = async () => {
    while (vexQueue.length) {
      const cveId = vexQueue.shift();
      try {
        vexDocuments.set(cveId, await sourceApi.fetchCanonicalUbuntuVex(cveId, { signal }));
      } catch (error) {
        if (error.name === 'AbortError') throw error;
        vexErrors.push({ cveId, message: error.message });
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(4, vexQueue.length) }, () => vexWorker()));

  for (const [cveId, records] of ubuntuOsv) {
    const vexRecord = vexDocuments.get(cveId);
    for (const record of records) {
      const related = ubuntuComponents.filter(component =>
        String(component.sourcePackage || '').trim() === record.package &&
        String(component.ecosystem || component.vendor || '').trim() === record.ecosystem
      );
      for (const component of related) {
        const current = allCandidates.get(cveId);
        const item = current?.components.find(entry => entry.component.id === component.id);
        if (!item) continue;
        const hasSourcePurl = (record.affected || []).some(entry =>
          entry.package?.name === record.package &&
          entry.package?.ecosystem === record.ecosystem &&
          Boolean(entry.package?.purl)
        );
        if (!component.architecture || !hasSourcePurl) {
          item.ubuntuVex = {
            status: 'needs_review',
            source: 'Canonical OpenVEX',
            reason: !component.architecture
              ? 'La arquitectura del paquete binario no está disponible; no se puede comparar el producto exacto.'
              : 'Ubuntu OSV no proporciona un PURL de paquete fuente para esta entrada; no se puede anclar la comparación OpenVEX.'
          };
        } else if (!vexRecord) {
          item.ubuntuVex = {
            status: 'unavailable',
            source: 'Canonical OpenVEX',
            reason: 'No se pudo recuperar el documento público de Canonical; la clasificación OSV/NVD se conserva sin cambios.'
          };
        } else {
          item.ubuntuVex = classifyCanonicalUbuntuVexComponent(vexRecord, record, component);
        }
      }
    }
  }

  // Compare source assessments only after exact-product VEX matching.
  // This is diagnostic metadata: it never overwrites NVD applicability,
  // Ubuntu OSV evidence, or the CVE-wide applicability summary.
  for (const { components: matched } of allCandidates.values()) {
    for (const item of matched) {
      if (item.suseCsafVex) {
        const cvePath = item.suseCsafVex.advisoryId.toLowerCase().replace(/^cve-/, 'cve-');
        evidence.push({
          source: 'SUSE CSAF VEX',
          status: item.suseCsafVex.status,
          reason: item.suseCsafVex.reason,
          productStatuses: item.suseCsafVex.productStatuses,
          products: item.suseCsafVex.products,
          remediations: item.suseCsafVex.remediations,
          advisoryId: item.suseCsafVex.advisoryId,
          url: `https://ftp.suse.com/pub/projects/security/csaf-vex/${item.suseCsafVex.advisoryId.slice(4, 8)}/${cvePath}.json`,
          confidence: item.suseCsafVex.confidence,
          product
        });
      }
      if (item.ubuntuVex) {
        item.ubuntuVex.consistency = compareUbuntuOsvAndVex(item.ubuntuOsv, item.ubuntuVex);
      }
    }
  }



  // Query official OSV distro ecosystems for exact installed package/version.
  // Advisory matches are attached as vendor evidence; they never override NVD.
  const distroGroups = new Map();
  for (const component of components) {
    const ecosystem = resolveOsvDistroEcosystem(component.ecosystem || component.vendor);
    const packageName = String(component.name || component.sourcePackage || '').trim();
    const version = String(component.version || '').trim();
    if (!ecosystem || !packageName || !version) continue;
    const key = `${ecosystem}\\u0000${packageName}\\u0000${version}`;
    if (!distroGroups.has(key)) distroGroups.set(key, { ecosystem, packageName, version, components: [] });
    distroGroups.get(key).components.push(component);
  }
  const distroErrors = [];
  const distroQueue = [...distroGroups.values()].slice(0, 100);
  if (distroGroups.size > 100) distroErrors.push({ source: 'OSV (Linux distributions)', message: 'Se alcanzó el límite de 100 consultas de paquetes de distribución por análisis.' });
  let distroNext = 0;
  const distroWorker = async () => {
    while (distroNext < distroQueue.length) {
      const group = distroQueue[distroNext++];
      try {
        const records = await sourceApi.fetchOsvForDistroPackage(group.packageName, group.ecosystem, group.version, { signal });
        for (const record of records) {
          const cveIds = [...new Set([...(record.aliases || []), ...(record.upstream || [])]
            .filter(id => /^CVE-[0-9]{4}-[0-9]+$/.test(id)))];
          if (!cveIds.length) continue;
          for (const cveId of cveIds) {
            const current = allCandidates.get(cveId) || {
              cve: { id: cveId, descriptions: [{ lang: 'en', value: record.summary || record.details || 'OSV distribution advisory; review vendor record.' }],
                published: record.published, lastModified: record.modified, references: record.references || [], metrics: {}, weaknesses: [] },
              components: []
            };
            for (const component of group.components) {
              const evidence = {
                advisoryId: record.id,
                status: 'needs_review',
                reason: `OSV encontró el paquete exacto en el ecosistema ${group.ecosystem} para la versión consultada. La evidencia del proveedor debe revisarse antes de concluir aplicabilidad o remediación.`,
                ecosystem: group.ecosystem,
                packageName: group.packageName,
                installedVersion: group.version,
                publishedAt: record.published || null,
                updatedAt: record.modified || null,
                url: `https://osv.dev/vulnerability/${encodeURIComponent(record.id)}`,
                references: (record.references || []).map(reference => reference.url).filter(Boolean)
              };
              const existing = current.components.find(item => item.component.id === component.id);
              if (existing) existing.distroOsvEvidence = [...(existing.distroOsvEvidence || []), evidence];
              else current.components.push({
                component,
                applicability: { status: 'needs_review', confidence: 'low', reason: evidence.reason },
                distroOsvEvidence: [evidence]
              });
            }
            allCandidates.set(cveId, current);
          }
        }
      } catch (error) {
        if (error.name === 'AbortError') throw error;
        distroErrors.push({ source: 'OSV (Linux distributions)', component: group.packageName, message: error.message });
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(3, distroQueue.length) }, () => distroWorker()));

  // Red Hat publishes package-level fix states and fixed errata independently
  // from NVD. Query candidate CVE IDs and attach exact product/package evidence.
  const redHatComponents = components.filter(component =>
    /^red hat enterprise linux\s+\d+/i.test(String(component.ecosystem || component.vendor || '').trim())
  );
  const redHatErrors = [];
  const redHatEvidence = new Map();
  const redHatQueue = [...allCandidates.keys()].slice(0, 100);
  if (redHatComponents.length && allCandidates.size > 100) {
    redHatErrors.push({ source: 'Red Hat Security Data', message: 'Se ha alcanzado el límite de 100 CVE por análisis; la evidencia Red Hat restante queda pendiente.' });
  }
  let redHatNext = 0;
  const redHatWorker = async () => {
    while (redHatNext < redHatQueue.length) {
      const cveId = redHatQueue[redHatNext++];
      try {
        redHatEvidence.set(cveId, await sourceApi.fetchRedHatCve(cveId, { signal }));
      } catch (error) {
        if (error.name === 'AbortError') throw error;
        redHatErrors.push({ source: 'Red Hat Security Data', component: cveId, message: error.message });
      }
    }
  };
  if (redHatComponents.length) {
    await Promise.all(Array.from({ length: Math.min(4, redHatQueue.length) }, () => redHatWorker()));
    for (const [cveId, record] of redHatEvidence) {
      const current = allCandidates.get(cveId);
      if (!current) continue;
      for (const component of redHatComponents) {
        const match = matchRedHatCveComponent(record, component);
        if (match.status === 'needs_review') continue;
        const item = current.components.find(entry => entry.component.id === component.id);
        if (item) item.redHat = { ...match, source: 'Red Hat Security Data', advisoryId: cveId };
      }
    }
  }

  // SUSE publishes CSAF 2.0 VEX documents indexed by CVE. Match only
  // explicit RPM PURLs; never infer package identity from a display name.
  const suseComponents = components.filter(component =>
    ['SUSE', 'openSUSE'].includes(resolveOsvDistroEcosystem(component.ecosystem || component.vendor)) &&
    Boolean(component.purl)
  );
  const suseErrors = [];
  const suseDocuments = new Map();
  const suseQueue = suseComponents.length ? [...allCandidates.keys()].slice(0, 100) : [];
  if (suseComponents.length && allCandidates.size > 100) {
    suseErrors.push({ source: 'SUSE CSAF VEX', message: 'Se alcanzó el límite de 100 CVE por análisis; el resto queda pendiente.' });
  }
  let suseNext = 0;
  const suseWorker = async () => {
    while (suseNext < suseQueue.length) {
      const cveId = suseQueue[suseNext++];
      try {
        suseDocuments.set(cveId, await sourceApi.fetchSuseCsafVex(cveId, { signal }));
      } catch (error) {
        if (error.name === 'AbortError') throw error;
        if (!String(error.message || '').includes('HTTP 404')) {
          suseErrors.push({ source: 'SUSE CSAF VEX', component: cveId, message: error.message });
        }
      }
    }
  };
  if (suseComponents.length) {
    await Promise.all(Array.from({ length: Math.min(3, suseQueue.length) }, () => suseWorker()));
    for (const [cveId, document] of suseDocuments) {
      const current = allCandidates.get(cveId);
      if (!current) continue;
      for (const component of suseComponents) {
        const match = matchSuseCsafVexComponent(document, component, cveId);
        if (match.status === 'needs_review') continue;
        const item = current.components.find(entry => entry.component.id === component.id);
        if (item) item.suseCsafVex = { ...match, source: 'SUSE CSAF VEX', advisoryId: cveId };
      }
    }
  }

  const ids = [...allCandidates.keys()];
  let epss = new Map();
  let kev = new Map();
  try { epss = await sourceApi.fetchEpssScores(ids, { signal }); }
  catch (error) { if (error.name === 'AbortError') throw error; errors.push({ source: 'FIRST EPSS', message: error.message }); }
  try { kev = await sourceApi.fetchKevCatalog({ signal }); }
  catch (error) { if (error.name === 'AbortError') throw error; errors.push({ source: 'CISA KEV', message: error.message }); }

  const findings = [...allCandidates.values()].map(({ cve, components: matched }) => {
    const summary = extractCveSummary(cve);
    for (const item of matched) {
      const product = {
        name: item.component.name || null,
        version: item.component.version || null,
        sourcePackage: item.component.sourcePackage || null,
        sourceVersion: item.component.sourceVersion || null,
        architecture: item.component.architecture || null,
        ecosystem: item.component.ecosystem || item.component.vendor || null
      };
      const evidence = [];
      if (item.nvdMatched) {
        const nvdApplicability = item.nvdApplicability || item.applicability;
        evidence.push({
          source: 'NVD',
          status: nvdApplicability.status,
          reason: nvdApplicability.reason,
          publishedAt: cve.published || null,
          updatedAt: cve.lastModified || null,
          advisoryId: cve.id,
          url: `https://nvd.nist.gov/vuln/detail/${encodeURIComponent(cve.id)}`,
          product,
          references: (cve.references || []).map(reference => reference.url).filter(Boolean)
        });
      }
      for (const osv of item.osvPurlEvidence || []) {
        evidence.push({ source: 'OSV (PURL)', ...osv, product });
      }
      for (const osv of item.ubuntuOsvEvidence || []) {
        evidence.push({
          source: 'Ubuntu OSV',
          ...osv,
          product
        });
      }
      for (const advisory of item.distroOsvEvidence || []) {
        evidence.push({ source: 'OSV (Linux distributions)', ...advisory, product });
      }
      if (item.redHat) {
        evidence.push({
          source: 'Red Hat Security Data',
          status: item.redHat.status,
          reason: item.redHat.reason,
          advisoryId: item.redHat.advisoryId,
          url: `https://access.redhat.com/security/cve/${encodeURIComponent(item.redHat.advisoryId)}`,
          packageStates: item.redHat.packageStates,
          affectedReleases: item.redHat.affectedReleases,
          product,
          confidence: item.redHat.confidence
        });
      }
      if (item.ubuntuVex) {
        evidence.push({
          source: 'Canonical OpenVEX',
          status: item.ubuntuVex.status,
          reason: item.ubuntuVex.reason,
          documentTimestamp: item.ubuntuVex.documentTimestamp || null,
          documentVersion: item.ubuntuVex.documentVersion ?? null,
          url: item.ubuntuVex.documentUrl || null,
          product
        });
      }
      item.evidence = evidence;
    }
    const kevEntry = kev.get(cve.id) || null;
    return {
      ...summary,
      epss: epss.has(cve.id) ? epss.get(cve.id) : null,
      kev: Boolean(kevEntry),
      kevDueDate: kevEntry?.dueDate || null,
      kevRequiredAction: kevEntry?.requiredAction || null,
      ubuntu: ubuntuOsv.get(cve.id) || [],
      components: matched,
      applicabilityStatus: summarizeApplicabilityStatus(matched)
    };
  }).sort((a, b) => Number(b.kev) - Number(a.kev) || (b.epss ?? -1) - (a.epss ?? -1) || (b.cvss ?? -1) - (a.cvss ?? -1));

  if (signal?.aborted) throw new DOMException('The operation was aborted.', 'AbortError');

  return {
    findings,
    purlAdvisories,
    sources: {
      nvd: errors.some(x => x.source === 'NVD') ? 'partial_or_unavailable' : (limits.length ? 'limited' : 'queried'),
      epss: errors.some(x => x.source === 'FIRST EPSS') ? 'unavailable' : 'queried',
      kev: errors.some(x => x.source === 'CISA KEV') ? 'unavailable' : 'queried',
      osvPurl: purlGroups.size ? (purlErrors.length ? (purlQueue.length ? 'partial_or_unavailable' : 'unavailable') : 'queried') : 'not_configured',
      ubuntuOsv: ubuntuComponents.length ? (errors.some(x => x.source === 'Ubuntu OSV') ? 'partial_or_unavailable' : (ubuntuGroups.size ? 'queried' : 'needs_source_package')) : 'not_configured',
      osvLinuxDistributions: distroGroups.size ? (distroErrors.length ? 'partial_or_unavailable' : 'queried') : 'not_configured',
      redHatSecurityData: redHatComponents.length ? (redHatErrors.length ? (redHatEvidence.size ? 'partial_or_unavailable' : 'unavailable') : (redHatEvidence.size ? 'queried' : 'needs_review')) : 'not_configured',
      ubuntuVex: ubuntuOsv.size ? (vexErrors.length ? (vexDocuments.size ? 'partial_or_unavailable' : 'unavailable') : (vexDocuments.size ? 'queried' : 'needs_review')) : 'not_configured',
      suseCsafVex: suseComponents.length ? (suseErrors.length ? (suseDocuments.size ? 'partial_or_unavailable' : 'unavailable') : (suseDocuments.size ? 'queried' : 'no_matching_documents')) : 'not_configured'
    },
    errors: [...errors, ...purlErrors, ...distroErrors, ...redHatErrors, ...suseErrors, ...vexErrors.map(error => ({ source: 'Canonical OpenVEX', component: error.cveId, message: error.message }))],
    limits,
    analyzedAt: new Date().toISOString(),
    disclaimer: 'Candidate correlation only. Verify applicability against the exact vendor advisory, distribution package revision, edition, build and installed updates before treating a finding as confirmed.'
  };
}