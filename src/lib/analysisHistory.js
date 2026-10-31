const HISTORY_KEY = 'quasaric-analysis-history';
const HISTORY_LIMIT = 10;

function componentKey(component) {
  return String(component?.id || [
    component?.name, component?.version, component?.vendor,
    component?.sourcePackage, component?.sourceVersion,
    component?.architecture, component?.ecosystem
  ].filter(Boolean).join('|'));
}

function findingComponentKey(finding, match) {
  return finding.id + '::' + componentKey(match.component);
}

export function createAnalysisSnapshot(analysis, inventory = []) {
  if (!analysis || !Array.isArray(analysis.findings)) {
    throw new TypeError('A completed analysis with findings is required.');
  }
  return {
    id: analysis.analyzedAt || new Date().toISOString(),
    analyzedAt: analysis.analyzedAt || new Date().toISOString(),
    inventory: inventory.map(item => ({ ...item })),
    findings: analysis.findings.map(finding => ({
      id: finding.id,
      description: finding.description || '',
      severity: finding.severity || 'Unknown',
      cvss: finding.cvss ?? null,
      epss: finding.epss ?? null,
      kev: Boolean(finding.kev),
      applicabilityStatus: finding.applicabilityStatus || 'needs_review',
      components: (finding.components || []).map(match => ({
        component: { ...match.component },
        applicability: match.applicability ? { ...match.applicability } : null,
        ubuntuOsv: match.ubuntuOsv ? { ...match.ubuntuOsv } : null,
        ubuntuVex: match.ubuntuVex ? { ...match.ubuntuVex } : null,
        evidence: (match.evidence || []).map(item => ({
          ...item,
          ...(item.product ? { product: { ...item.product } } : {}),
          ...(Array.isArray(item.references) ? { references: [...item.references] } : {})
        }))
      }))
    }))
  };
}

export function compareAnalysisSnapshots(previous, current) {
  if (!previous || !current) throw new TypeError('Two analysis snapshots are required.');
  const flatten = snapshot => {
    const map = new Map();
    for (const finding of snapshot.findings || []) {
      for (const match of finding.components || []) {
        const key = findingComponentKey(finding, match);
        map.set(key, {
          key, cve: finding.id, description: finding.description,
          severity: finding.severity, cvss: finding.cvss, epss: finding.epss,
          kev: finding.kev, applicabilityStatus: finding.applicabilityStatus,
          component: match.component
        });
      }
    }
    return map;
  };
  const before = flatten(previous);
  const after = flatten(current);
  const added = [], resolved = [], retained = [], changed = [];
  for (const [key, item] of after) {
    const old = before.get(key);
    if (!old) { added.push(item); continue; }
    retained.push(item);
    const differences = ['severity', 'cvss', 'epss', 'kev', 'applicabilityStatus']
      .filter(field => old[field] !== item[field])
      .map(field => ({ field, before: old[field] ?? null, after: item[field] ?? null }));
    for (const field of ['name', 'version', 'vendor', 'sourcePackage', 'sourceVersion', 'architecture', 'ecosystem']) {
      if ((old.component?.[field] ?? null) !== (item.component?.[field] ?? null)) {
        differences.push({
          field: 'component.' + field,
          before: old.component?.[field] ?? null,
          after: item.component?.[field] ?? null
        });
      }
    }
    if (differences.length) changed.push({ ...item, differences });
  }
  for (const [key, item] of before) if (!after.has(key)) resolved.push(item);
  const uniqueCount = list => new Set(list.map(item => item.cve)).size;
  return {
    previousAnalyzedAt: previous.analyzedAt,
    currentAnalyzedAt: current.analyzedAt,
    added, resolved, retained, changed,
    counts: {
      added: added.length, resolved: resolved.length,
      retained: retained.length, changed: changed.length,
      addedCves: uniqueCount(added), resolvedCves: uniqueCount(resolved)
    }
  };
}

export function loadAnalysisHistory(storage) {
  try {
    const target = storage === undefined ? globalThis.localStorage : storage;
    const parsed = JSON.parse(target?.getItem(HISTORY_KEY) || '[]');
    return Array.isArray(parsed)
      ? parsed.filter(snapshot =>
        snapshot && typeof snapshot === 'object' && Array.isArray(snapshot.findings) &&
        snapshot.findings.every(finding =>
          finding && typeof finding === 'object' && Array.isArray(finding.components) &&
          finding.components.every(match =>
            match && typeof match === 'object' &&
            match.component && typeof match.component === 'object'
          )
        )
      ).slice(0, HISTORY_LIMIT)
      : [];
  } catch { return []; }
}

export function saveAnalysisHistory(history, storage) {
  const next = (Array.isArray(history) ? history : []).slice(0, HISTORY_LIMIT);
  try {
    const target = storage === undefined ? globalThis.localStorage : storage;
    target?.setItem(HISTORY_KEY, JSON.stringify(next));
    return true;
  }
  catch { return false; }
}

export const ANALYSIS_HISTORY_LIMIT = HISTORY_LIMIT;
