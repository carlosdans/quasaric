import { normalizeComponentType } from './componentTypes.js';
import { classifyUbuntuOsvSourceVersion } from './ubuntuOsvApplicability.js';
import { compareDebianVersions } from './debianVersions.js';
import { fetchNvdByKeyword, fetchEpssScores, fetchKevCatalog, fetchUbuntuOsvForSourcePackage, matchUbuntuOsvBinary, matchCanonicalUbuntuVexProduct, fetchCanonicalUbuntuVex, extractCveSummary, isSupportedUbuntuOsvEcosystem } from './vulnerabilitySources.js';

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

export function classifyCpeApplicability(cpeItems, component) {
  const version = String(component.version || '').trim();
  if (!version) return { status: 'version_missing', confidence: 'low', reason: 'No exact version was supplied.' };
  const relevant = cpeItems.filter(item => cpeMatchesComponent(item.criteria, component));
  if (!relevant.length) return { status: 'needs_review', confidence: 'low', reason: 'No matching product CPE was found; product-text matches remain unverified candidates.' };

  const affected = relevant.some(item => {
    if (item.vulnerable === false) return false;
    const cpe = cpeProduct(item.criteria);
    if (cpe.version !== '*' && cpe.version !== version) return false;
    if (item.versionStartIncluding && compareVersions(version, item.versionStartIncluding) < 0) return false;
    if (item.versionStartExcluding && compareVersions(version, item.versionStartExcluding) <= 0) return false;
    if (item.versionEndIncluding && compareVersions(version, item.versionEndIncluding) > 0) return false;
    if (item.versionEndExcluding && compareVersions(version, item.versionEndExcluding) >= 0) return false;
    return true;
  });
  if (affected) return { status: 'possible', confidence: 'medium', reason: 'The supplied version falls within an NVD CPE match/range. Confirm against the vendor advisory and distribution build before treating as affected.' };
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
    fetchNvdByKeyword, fetchEpssScores, fetchKevCatalog,
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
        const records = await sourceApi.fetchNvdByKeyword(query, { signal, maxResults: 400 });
        if (records.truncated) limits.push({ source: 'NVD', component: component.name, maxResults: 400, totalResults: records.totalResults });
        for (const cve of records) {
          if (!matchesProductText(cve, component)) continue;
          const current = allCandidates.get(cve.id) || { cve, components: [] };
          current.components.push({ component, applicability: applicability(cve, component) });
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
        if (!current.components.some(item => item.component.id === component.id)) {
          current.components.push({ component, applicability });
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

  const ids = [...allCandidates.keys()];
  let epss = new Map();
  let kev = new Map();
  try { epss = await sourceApi.fetchEpssScores(ids, { signal }); }
  catch (error) { if (error.name === 'AbortError') throw error; errors.push({ source: 'FIRST EPSS', message: error.message }); }
  try { kev = await sourceApi.fetchKevCatalog({ signal }); }
  catch (error) { if (error.name === 'AbortError') throw error; errors.push({ source: 'CISA KEV', message: error.message }); }

  const findings = [...allCandidates.values()].map(({ cve, components: matched }) => {
    const summary = extractCveSummary(cve);
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