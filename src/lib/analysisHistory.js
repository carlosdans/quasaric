const HISTORY_KEY = 'quasaric-analysis-history';
const HISTORY_LIMIT = 10;
const MAX_HISTORY_BYTES = 10 * 1024 * 1024;
const MAX_FINDINGS_PER_SNAPSHOT = 50000;
const MAX_INVENTORY_COMPONENTS = 50000;
const HISTORY_RECOVERY_KEY = 'quasaric-analysis-history-recovery';

function withinByteLimit(value) {
  return new TextEncoder().encode(value).byteLength <= MAX_HISTORY_BYTES;
}

function hasComponentIdentity(component) {
  return isRecord(component) &&
    ((typeof component.id === 'string' && component.id.trim().length > 0) ||
     (typeof component.name === 'string' && component.name.trim().length > 0));
}

function isValidSnapshot(snapshot) {
  return isRecord(snapshot) &&
    (snapshot.inventory === undefined || (Array.isArray(snapshot.inventory) &&
      snapshot.inventory.length <= MAX_INVENTORY_COMPONENTS && snapshot.inventory.every(isRecord))) &&
    Array.isArray(snapshot.findings) &&
    snapshot.findings.length <= MAX_FINDINGS_PER_SNAPSHOT &&
    snapshot.findings.every(finding => isRecord(finding) &&
      typeof finding.id === 'string' && finding.id.trim().length > 0 &&
      Array.isArray(finding.components) &&
      finding.components.every(match => isRecord(match) && hasComponentIdentity(match.component)));
}

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function componentKey(component) {
  // Keep fallback identity collision-safe when package metadata contains separators.
  return component?.id
    ? JSON.stringify(['id', String(component.id)])
    : JSON.stringify([
      component?.name ?? null, component?.version ?? null, component?.vendor ?? null,
      component?.sourcePackage ?? null, component?.sourceVersion ?? null,
      component?.architecture ?? null, component?.ecosystem ?? null,
      component?.purl ?? null, component?.cpe ?? null, component?.sourcePurl ?? null
    ]);
}

function findingComponentKey(finding, match) {
  return JSON.stringify([finding.id, componentKey(match.component)]);
}

export function createAnalysisSnapshot(analysis, inventory = []) {
  if (!analysis || !Array.isArray(analysis.findings) || !Array.isArray(inventory)) {
    throw new TypeError('A completed analysis with findings and an inventory array is required.');
  }
  if (analysis.findings.length > MAX_FINDINGS_PER_SNAPSHOT || inventory.length > MAX_INVENTORY_COMPONENTS) {
    throw new Error('Analysis snapshot exceeds the 50000 findings or components limit.');
  }
  if (!inventory.every(isRecord) || !analysis.findings.every(finding =>
    isRecord(finding) && typeof finding.id === 'string' && finding.id.trim().length > 0 &&
    Array.isArray(finding.components) &&
    finding.components.every(match => isRecord(match) && hasComponentIdentity(match.component)))) {
    throw new TypeError('Analysis snapshot contains malformed inventory, findings or component matches.');
  }
  const analyzedAt = analysis.analyzedAt || new Date().toISOString();
  const snapshot = {
    id: analyzedAt,
    analyzedAt,
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
  if (!withinByteLimit(JSON.stringify(snapshot))) throw new Error('Analysis snapshot exceeds the 10 MB storage limit.');
  return snapshot;
}

export function compareAnalysisSnapshots(previous, current) {
  if (!isValidSnapshot(previous) || !isValidSnapshot(current)) {
    throw new TypeError('Two valid analysis snapshots with complete component matches are required.');
  }
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
    for (const field of ['name', 'version', 'vendor', 'sourcePackage', 'sourceVersion', 'architecture', 'ecosystem', 'purl', 'cpe', 'sourcePurl']) {
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
    const raw = target?.getItem(HISTORY_KEY);
    if (!raw) return [];
    if (!withinByteLimit(raw)) {
      try { target?.setItem(HISTORY_RECOVERY_KEY, raw); } catch { /* best effort */ }
      return [];
    }
    let parsed;
    try { parsed = JSON.parse(raw); }
    catch {
      try { target?.setItem(HISTORY_RECOVERY_KEY, raw); } catch { /* best effort */ }
      return [];
    }
    const valid = Array.isArray(parsed) ? parsed.filter(isValidSnapshot).slice(0, HISTORY_LIMIT) : [];
    if (!Array.isArray(parsed) || valid.length !== parsed.length) {
      try { target?.setItem(HISTORY_RECOVERY_KEY, raw); } catch { /* best effort */ }
    }
    return valid;
  } catch { return []; }
}

export function saveAnalysisHistory(history, storage) {
  if (!Array.isArray(history)) return false;
  const next = history.slice(0, HISTORY_LIMIT);
  if (!next.every(isValidSnapshot)) return false;
  try {
    const serialized = JSON.stringify(next);
    if (!withinByteLimit(serialized)) return false;
    const target = storage === undefined ? globalThis.localStorage : storage;
    if (!target) return false;
    target.setItem(HISTORY_KEY, serialized);
    return true;
  }
  catch { return false; }
}

export const ANALYSIS_HISTORY_LIMIT = HISTORY_LIMIT;
