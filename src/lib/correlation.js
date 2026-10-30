import { fetchNvdByKeyword, fetchEpssScores, fetchKevCatalog, extractCveSummary } from './vulnerabilitySources.js';

const normalize = value => String(value || '').toLowerCase().replace(/[^a-z0-9.+_-]/g, ' ').trim();
const tokens = value => normalize(value).split(/[\s_-]+/).filter(x => x.length > 2);
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

function matchesProductText(cve, component) {
  const haystack = normalize([
    ...(cve.descriptions || []).map(x => x.value),
    ...(cve.configurations || []).flatMap(c => JSON.stringify(c))
  ].join(' '));
  const product = normalize(component.name);
  if (!product || !haystack.includes(product)) return false;
  const version = normalize(component.version);
  // This is only a candidate filter, never proof that a release is affected.
  return !version || haystack.includes(version) || haystack.includes(product);
}

function applicability(cve, component) {
  const version = String(component.version || '').trim();
  if (!version) return { status: 'version_missing', confidence: 'low', reason: 'No exact version was supplied.' };
  const configurations = cve.configurations || [];
  const cpes = configurations.flatMap(c => c.nodes || []).flatMap(n => n.cpeMatch || []);
  const relevant = cpes.filter(item => {
    const criteria = normalize(item.criteria);
    return criteria.includes(normalize(component.name).replaceAll(' ', '_'))
      || criteria.includes(normalize(component.name));
  });
  if (!relevant.length) return { status: 'needs_review', confidence: 'low', reason: 'Product text matched, but no reliable CPE/version range was matched.' };
  const exact = relevant.some(item => {
    const cpeVersion = item.versionStartIncluding || item.versionStartExcluding || item.versionEndIncluding || item.versionEndExcluding;
    return cpeVersion && (version === cpeVersion || item.versionStartIncluding === version || item.versionEndIncluding === version);
  });
  if (exact) return { status: 'possible', confidence: 'medium', reason: 'Version boundary appears in the NVD CPE range; vendor advisory verification is still required.' };
  return { status: 'needs_review', confidence: 'low', reason: 'NVD CPE data exists, but the supplied version could not be safely classified.' };
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