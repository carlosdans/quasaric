import { normalizeComponentType } from './componentTypes.js';
import { classifyUbuntuOsvSourceVersion } from './ubuntuOsvApplicability.js';
import { compareDebianVersions } from './debianVersions.js';
import { fetchNvdByKeyword, fetchNvdByVirtualMatchString, fetchEpssScores, fetchKevCatalog, fetchUbuntuOsvForSourcePackage, matchUbuntuOsvBinary, matchCanonicalUbuntuVexProduct, fetchCanonicalUbuntuVex, extractCveSummary, isSupportedUbuntuOsvEcosystem } from './vulnerabilitySources.js';

const NVD_MAX_RESULTS = 6000;

const normalize = value => String(value || '').toLowerCase().replace(/[^a-z0-9.+_-]/g, ' ').trim();

const unique = values => [...new Set(values)];

function componentQueries(component) {
  const aliases = { apache: 'apache http server', 'apache http server': 'apache http server', node: 'node.js', nodejs: 'node.js', 'php-fpm': 'php', iis: 'internet information services', 'microsoft iis': 'internet information services' };
  const name = normalize(component.name);
  return [aliases[name] || name].filter(Boolean);
}
function cpeProduct(criteria) {
  const parts = String(criteria || '').split(':');
  return { vendor: (parts[3] || '').replaceAll('_', ' '), product: (parts[4] || '').replaceAll('_', ' '), version: parts[5] || '*' };
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

function compareVersions(a, b) {
  const left = String(a).match(/\d+|[a-z]+/gi) || [];
  const right = String(b).match(/\d+|[a-z]+/gi) || [];
  const length = Math.max(left.length, right.length);
  for (let i = 0; i < length; i++) {
    const x = left[i] ?? '0', y = right[i] ?? '0';
    if (x === y) continue;
    if (/^\d+$/.test(x) && /^\d+$/.test(y)) return Number(x) < Number(y) ? -1 : 1;
    return x.localeCompare(y, undefined, { numeric: true, sensitivity: 'base' });
  }
  return 0;
}

export function cpeMatchesComponent(criteria, component) {
  const cpe = cpeProduct(criteria);
  const vendor = normalize(cpe.vendor);
  const product = normalize(cpe.product);
  const name = normalize(component.name);
  // Match the vendor/product pair, not a loose product-name fragment.
  // This avoids confusing Apache HTTP Server with Tomcat or other Apache projects.
  const productPairs = {
    nginx: [['nginx', 'nginx']],
    apache: [['apache', 'http server']],
    'apache http server': [['apache', 'http server']],
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
    'windows server': [['microsoft', 'windows server']],
    node: [['nodejs', 'node.js'], ['node.js', 'node.js']],
    'node.js': [['nodejs', 'node.js'], ['node.js', 'node.js']]
  };
  const accepted = productPairs[name] || [[name, name]];
  return accepted.some(([expectedVendor, expectedProduct]) =>
    vendor === expectedVendor && product === expectedProduct
  );
}

function matchesProductText(cve, component) {
  const cpes = (cve.configurations || []).flatMap(config => collectCpeMatches(config.nodes || []));
  return cpes.some(item => cpeMatchesComponent(item.criteria, component));
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
  const applies = clauses.some(({ family, operator, boundary }) => {
    const parts = installed.match(/^\d+(?:\.\d+){0,2}/)?.[0];
    if (!parts) return false;
    const [major, minor] = parts.split('.').map(Number);
    if (major !== family.major || (family.minor !== null && minor !== family.minor)) return false;
    const order = compareVersions(installed, boundary);
    return ['before', 'prior to', 'below', 'less than', 'earlier than'].includes(operator)
      ? order < 0
      : order <= 0;
  });

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

  const affected = relevant.some(item => {
    if (item.vulnerable === false) return false;
    const cpe = cpeProduct(item.criteria);
    const bounded = Boolean(item.versionStartIncluding || item.versionStartExcluding || item.versionEndIncluding || item.versionEndExcluding);
    if (cpe.version === '*' && !bounded) return false;
    if (cpe.version !== '*' && cpe.version !== version) return false;
    if (item.versionStartIncluding && compareVersions(version, item.versionStartIncluding) < 0) return false;
    if (item.versionStartExcluding && compareVersions(version, item.versionStartExcluding) <= 0) return false;
    if (item.versionEndIncluding && compareVersions(version, item.versionEndIncluding) > 0) return false;
    if (item.versionEndExcluding && compareVersions(version, item.versionEndExcluding) >= 0) return false;
    return true;
  });
  if (affected) return { status: 'possible', confidence: 'medium', reason: 'The supplied version falls within an NVD CPE match/range. Confirm against the vendor advisory and distribution build before treating as affected.' };

  // When NVD enumerates only concrete versions for this exact product, an
  // installed version outside that list is not an applicable candidate. Do
  // not turn historical product-name matches into findings for newer releases.
  const vulnerableCpes = relevant.filter(item => item.vulnerable !== false);
  const explicitlyScoped = vulnerableCpes.length > 0 && vulnerableCpes.every(item => {
    const cpe = cpeProduct(item.criteria);
    const hasConcreteVersion = cpe.version !== '*' && cpe.version !== '-';
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

function applicability(cve, component) {
  const cpes = (cve.configurations || []).flatMap(config => collectCpeMatches(config.nodes || []));
  return classifyCpeApplicability(cpes, component);
}

export async function analyzeInventory(components, { signal, onProgress, sources: sourceOverrides = {} } = {}) {
  // Dependency overrides keep integration tests deterministic without changing
  // the production source defaults or sending local inventory to test services.
  const sourceApi = {
    fetchNvdByKeyword, fetchNvdByVirtualMatchString, fetchEpssScores, fetchKevCatalog,
    fetchUbuntuOsvForSourcePackage, fetchCanonicalUbuntuVex,
    ...sourceOverrides
  };
  if (!Array.isArray(components) || components.length === 0) throw new Error('Add at least one component before analysis.');
  if (components.length > 10) throw new Error('An analysis supports up to 10 components.');
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
  let done = 0;
  for (const component of components) {
    const queries = componentQueries(component);
    for (const query of queries) {
      try {
        // PHP's keyword search is extremely broad (mentions in unrelated
        // advisories routinely hit the 6,000-record ceiling). Its NVD CPE
        // match string is the precise product identity already required by
        // matchesProductText, so use that complete, paginated result set.
        const records = normalize(component.name) === 'php' && !sourceOverrides.fetchNvdByKeyword
          ? await sourceApi.fetchNvdByVirtualMatchString('cpe:2.3:a:php:php', { signal })
          : await sourceApi.fetchNvdByKeyword(query, { signal, maxResults: NVD_MAX_RESULTS });
        if (records.truncated) limits.push({ source: 'NVD', component: component.name, maxResults: NVD_MAX_RESULTS, totalResults: records.totalResults });
        for (const cve of records) {
          if (!matchesProductText(cve, component)) continue;
          let nvdApplicability = applicability(cve, component);
          // Descriptions are a fallback only: never let prose override a
          // structured CPE range that already includes or excludes this version.
          const descriptionApplicability = nvdApplicability.status === 'needs_review'
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
      if (item.ubuntuVex) {
        item.ubuntuVex.consistency = compareUbuntuOsvAndVex(item.ubuntuOsv, item.ubuntuVex);
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
      for (const osv of item.ubuntuOsvEvidence || []) {
        evidence.push({
          source: 'Ubuntu OSV',
          ...osv,
          product
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

  return {
    findings,
    sources: {
      nvd: errors.some(x => x.source === 'NVD') ? 'partial_or_unavailable' : (limits.length ? 'limited' : 'queried'),
      epss: errors.some(x => x.source === 'FIRST EPSS') ? 'unavailable' : 'queried',
      kev: errors.some(x => x.source === 'CISA KEV') ? 'unavailable' : 'queried',
      ubuntuOsv: ubuntuComponents.length ? (errors.some(x => x.source === 'Ubuntu OSV') ? 'partial_or_unavailable' : (ubuntuGroups.size ? 'queried' : 'needs_source_package')) : 'not_configured',
      ubuntuVex: ubuntuOsv.size ? (vexErrors.length ? (vexDocuments.size ? 'partial_or_unavailable' : 'unavailable') : (vexDocuments.size ? 'queried' : 'needs_review')) : 'not_configured'
    },
    errors: [...errors, ...vexErrors.map(error => ({ source: 'Canonical OpenVEX', component: error.cveId, message: error.message }))],
    limits,
    analyzedAt: new Date().toISOString(),
    disclaimer: 'Candidate correlation only. Verify applicability against the exact vendor advisory, distribution package revision, edition, build and installed updates before treating a finding as confirmed.'
  };
}