import { fetchNvdByKeyword, fetchEpssScores, fetchKevCatalog, extractCveSummary } from './vulnerabilitySources.js';

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
  const name = normalize(component.name).replaceAll('_', ' ');
  const aliases = {
    apache: ['apache', 'http server'],
    'apache http server': ['apache', 'http server'],
    nginx: ['nginx'],
    'node.js': ['node', 'node.js'],
    node: ['node', 'node.js'],
    wordpress: ['wordpress'], joomla: ['joomla'], drupal: ['drupal'],
    php: ['php'], mysql: ['mysql'], mariadb: ['mariadb'], ubuntu: ['ubuntu']
  };
  const accepted = aliases[name] || [name];
  return accepted.some(alias => cpe.product === alias) || (name.startsWith('apache') && cpe.vendor === 'apache' && cpe.product === 'http server');
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
    if (cpe.version !== '*' && cpe.version !== '-' && cpe.version !== version) return false;
    if (item.versionStartIncluding && compareVersions(version, item.versionStartIncluding) < 0) return false;
    if (item.versionStartExcluding && compareVersions(version, item.versionStartExcluding) <= 0) return false;
    if (item.versionEndIncluding && compareVersions(version, item.versionEndIncluding) > 0) return false;
    if (item.versionEndExcluding && compareVersions(version, item.versionEndExcluding) >= 0) return false;
    return true;
  });
  if (affected) return { status: 'possible', confidence: 'medium', reason: 'The supplied version falls within an NVD CPE match/range. Confirm against the vendor advisory and distribution build before treating as affected.' };
  return { status: 'needs_review', confidence: 'low', reason: 'A product CPE exists, but the supplied version was not proven to fall in its affected range.' };
}

function applicability(cve, component) {
  const cpes = (cve.configurations || []).flatMap(config => (config.nodes || []).flatMap(node => [...(node.cpeMatch || []), ...(node.children || []).flatMap(child => child.cpeMatch || [])]));
  return classifyCpeApplicability(cpes, component);
}

export async function analyzeInventory(components, { signal, onProgress } = {}) {
  if (!Array.isArray(components) || components.length === 0) throw new Error('Add at least one component before analysis.');
  if (components.length > 10) throw new Error('An analysis supports up to 10 components.');

  const errors = [];
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
      components: matched,
      applicabilityStatus: matched.some(x => x.applicability.status === 'possible') ? 'possible' : 'needs_review'
    };
  }).sort((a, b) => Number(b.kev) - Number(a.kev) || (b.epss ?? -1) - (a.epss ?? -1) || (b.cvss ?? -1) - (a.cvss ?? -1));

  return {
    findings,
    sources: {
      nvd: errors.some(x => x.source === 'NVD') ? 'partial_or_unavailable' : 'queried',
      epss: errors.some(x => x.source === 'FIRST EPSS') ? 'unavailable' : 'queried',
      kev: errors.some(x => x.source === 'CISA KEV') ? 'unavailable' : 'queried'
    },
    errors,
    analyzedAt: new Date().toISOString(),
    disclaimer: 'Candidate correlation only. Verify applicability against the exact vendor advisory, distribution package revision, edition, build and installed updates before treating a finding as confirmed.'
  };
}