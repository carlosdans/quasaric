import { fetchNvdByKeyword, fetchEpssScores, fetchKevCatalog, fetchUbuntuOsvForPackage, extractCveSummary } from './vulnerabilitySources.js';

const normalize = value => String(value || '').toLowerCase().replace(/[^a-z0-9.+_-]/g, ' ').trim();

const unique = values => [...new Set(values)];

function componentQueries(component) {
  const aliases = {
    nginx: ['nginx'], 'apache http server': ['apache http server', 'http server apache'],
    apache: ['apache http server'], php: ['php'], wordpress: ['wordpress'],
    joomla: ['joomla'], drupal: ['drupal'], mysql: ['mysql'], mariadb: ['mariadb'],
    'windows server': ['windows server'], ubuntu: ['ubuntu'], node: ['node.js'],
    'node.js': ['node.js']
  };
  const name = normalize(component.name);
  return unique([...(aliases[name] || []), name].filter(Boolean));
}

function cpeProduct(criteria) {
  const parts = String(criteria || '').split(':');
  return { vendor: (parts[3] || '').replaceAll('_', ' '), product: (parts[4] || '').replaceAll('_', ' '), version: parts[5] || '*' };
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

function cpeMatchesComponent(criteria, component) {
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
  const configurations = JSON.stringify(cve.configurations || []).toLowerCase();
  const description = (cve.descriptions || []).map(x => x.value).join(' ').toLowerCase();
  const name = normalize(component.name);
  return Boolean(name && (configurations.includes(name.replaceAll(' ', '_')) || description.includes(name)));
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

export async function analyzeInventory(components, { signal, onProgress } = {}) {
  if (!Array.isArray(components) || components.length === 0) throw new Error('Add at least one component before analysis.');
  if (components.length > 10) throw new Error('An analysis supports up to 10 components.');

  const errors = [];
  const ubuntuOsv = new Map();
  const ubuntuComponents = components.filter(component => /^Ubuntu:(?:Pro:)?\d{2}\.\d{2}(?::LTS)?$/.test(String(component.ecosystem || component.vendor || '').trim()));
  for (const component of ubuntuComponents) {
    try {
      const ecosystem = String(component.ecosystem || component.vendor || '').trim();
      const records = await fetchUbuntuOsvForPackage(component.sourcePackage || component.name, component.version, ecosystem, { signal });
      for (const record of records) {
        if (!/^CVE-\d{4}-\d+$/.test(record.id)) continue;
        const existing = ubuntuOsv.get(record.id) || [];
        existing.push(record);
        ubuntuOsv.set(record.id, existing);
      }
    } catch (error) {
      if (error.name === 'AbortError') throw error;
      errors.push({ source: 'Ubuntu OSV', component: component.name, message: error.message });
    }
  }
  const allCandidates = new Map();
  let done = 0;
  for (const component of components) {
    const queries = componentQueries(component);
    for (const query of queries) {
      try {
        const records = await fetchNvdByKeyword(query, { signal });
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

  // Preserve Ubuntu-only advisories even when NVD keyword search has no matching record.
  for (const [cveId, records] of ubuntuOsv) {
    const record = records[0];
    const component = components.find(item =>
      ubuntuComponents.includes(item) &&
      String(item.sourcePackage || item.name).trim() === record.package &&
      String(item.version || '').trim() === record.packageVersion &&
      String(item.ecosystem || item.vendor || '').trim() === record.ecosystem
    );
    if (!component) continue;
    const existing = allCandidates.get(cveId);
    if (existing) {
      if (!existing.components.some(match => match.component.name === component.name && match.component.version === component.version)) {
        existing.components.push({
          component,
          applicability: {
            status: 'needs_review',
            confidence: 'medium',
            reason: 'Ubuntu OSV returned a package/release match. Verify the complete Ubuntu package revision and release status before treating this as confirmed.'
          }
        });
      }
    } else {
      allCandidates.set(cveId, {
        cve: {
          id: cveId,
          descriptions: [{ lang: 'en', value: record.summary || 'Ubuntu OSV advisory; consult the upstream record for technical details.' }],
          published: record.published,
          lastModified: record.modified,
          references: record.references || [],
          metrics: {},
          weaknesses: []
        },
        components: [{
          component,
          applicability: {
            status: 'needs_review',
            confidence: 'medium',
            reason: 'Ubuntu OSV returned a package/release match. Verify the complete Ubuntu package revision and release status before treating this as confirmed.'
          }
        }]
      });
    }
  }

  const ids = [...allCandidates.keys()];
  let epss = new Map();
  let kev = new Map();
  try { epss = await fetchEpssScores(ids, { signal }); }
  catch (error) { if (error.name === 'AbortError') throw error; errors.push({ source: 'FIRST EPSS', message: error.message }); }
  try { kev = await fetchKevCatalog({ signal }); }
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
      applicabilityStatus: matched.some(x => x.applicability.status === 'possible') ? 'possible' : 'needs_review'
    };
  }).sort((a, b) => Number(b.kev) - Number(a.kev) || (b.epss ?? -1) - (a.epss ?? -1) || (b.cvss ?? -1) - (a.cvss ?? -1));

  return {
    findings,
    sources: {
      nvd: errors.some(x => x.source === 'NVD') ? 'partial_or_unavailable' : 'queried',
      epss: errors.some(x => x.source === 'FIRST EPSS') ? 'unavailable' : 'queried',
      kev: errors.some(x => x.source === 'CISA KEV') ? 'unavailable' : 'queried',
      ubuntuOsv: ubuntuComponents.length ? (errors.some(x => x.source === 'Ubuntu OSV') ? 'partial_or_unavailable' : 'queried') : 'not_configured'
    },
    errors,
    analyzedAt: new Date().toISOString(),
    disclaimer: 'Candidate correlation only. Verify applicability against the exact vendor advisory, distribution package revision, edition, build and installed updates before treating a finding as confirmed.'
  };
}