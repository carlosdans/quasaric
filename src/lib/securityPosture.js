import { calculateRiskPriority } from './riskPriority.js';

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function exposureEntries(snapshot = {}) {
  const entries = new Map();
  for (const finding of snapshot.findings || []) {
    for (const match of finding.components || []) {
      const component = match.component || {};
      const componentId = component.id
        ? JSON.stringify(['id', String(component.id)])
        : JSON.stringify([
          component.name ?? null, component.version ?? null, component.vendor ?? null,
          component.sourcePackage ?? null, component.sourceVersion ?? null,
          component.architecture ?? null, component.ecosystem ?? null,
          component.purl ?? null, component.cpe ?? null, component.sourcePurl ?? null
        ]);
      const cve = String(finding.id).trim();
      const key = JSON.stringify([cve, componentId]);
      const candidate = {
        key,
        cve,
        severity: finding.severity || 'Unknown',
        kev: Boolean(finding.kev),
        riskScore: calculateRiskPriority(finding).score,
        componentId,
        componentName: component.name || componentId
      };
      const existing = entries.get(key);
      if (!existing) {
        entries.set(key, candidate);
        continue;
      }

      // A CVE/component pair is one exposure even if malformed or legacy
      // input repeats the same match. Preserve the strongest available signals.
      existing.kev ||= candidate.kev;
      existing.riskScore = Math.max(existing.riskScore, candidate.riskScore);
      if (severityRank(candidate.severity) > severityRank(existing.severity)) {
        existing.severity = candidate.severity;
      }
    }
  }
  return [...entries.values()];
}

/**
 * Summarize snapshots in chronological order. Input history is newest-first.
 * "First/last observed" are observations, never inferred remediation dates.
 */
export function buildSecurityPosture(history = []) {
  const chronological = (Array.isArray(history) ? history : [])
    .filter(snapshot => isRecord(snapshot) && Array.isArray(snapshot.findings) &&
      snapshot.findings.every(finding => isRecord(finding) &&
        typeof finding.id === 'string' && finding.id.trim().length > 0 &&
        Array.isArray(finding.components) &&
        finding.components.every(match => isRecord(match) && isRecord(match.component) &&
          ((typeof match.component.id === 'string' && match.component.id.trim().length > 0) ||
           (typeof match.component.name === 'string' && match.component.name.trim().length > 0)))))
    .slice(0, 10).reverse();
  const timeline = chronological.map(snapshot => {
    const entries = exposureEntries(snapshot);
    const cves = new Map();
    for (const item of entries) {
      const current = cves.get(item.cve) || {
        cve: item.cve, severity: item.severity, kev: false, riskScore: item.riskScore
      };
      current.kev ||= item.kev;
      current.riskScore = Math.max(current.riskScore, item.riskScore);
      if (severityRank(item.severity) > severityRank(current.severity)) current.severity = item.severity;
      cves.set(item.cve, current);
    }
    return {
      id: snapshot.id || snapshot.analyzedAt || '',
      analyzedAt: snapshot.analyzedAt || snapshot.id || '',
      exposures: entries.length,
      uniqueCves: cves.size,
      kevCves: [...cves.values()].filter(item => item.kev).length,
      criticalCves: [...cves.values()].filter(item => severityRank(item.severity) >= 4).length,
      highCves: [...cves.values()].filter(item => severityRank(item.severity) === 3).length,
      components: new Set(entries.map(item => item.componentId)).size,
      riskScore: [...cves.values()].reduce((sum, item) => sum + item.riskScore, 0)
    };
  });

  const observations = new Map();
  chronological.forEach((snapshot, index) => {
    for (const item of exposureEntries(snapshot)) {
      const record = observations.get(item.key) || {
        key: item.key, cve: item.cve, componentName: item.componentName,
        firstObservedAt: snapshot.analyzedAt || snapshot.id || '',
        lastObservedAt: snapshot.analyzedAt || snapshot.id || '',
        snapshotsSeen: 0, lastSeverity: item.severity, kev: item.kev,
        lastSeenIndex: index
      };
      record.lastObservedAt = snapshot.analyzedAt || snapshot.id || '';
      record.snapshotsSeen += 1;
      record.lastSeverity = item.severity;
      record.kev ||= item.kev;
      record.lastSeenIndex = index;
      observations.set(item.key, record);
    }
  });

  const latestKeys = new Set(chronological.length
    ? exposureEntries(chronological[chronological.length - 1]).map(item => item.key) : []);
  const dwell = [...observations.values()].map(({ lastSeenIndex, ...item }) => ({
    ...item, presentInLatest: latestKeys.has(item.key)
  })).sort((a, b) => Number(b.presentInLatest) - Number(a.presentInLatest) ||
    b.snapshotsSeen - a.snapshotsSeen || a.cve.localeCompare(b.cve));

  const first = timeline[0] || null;
  const latest = timeline[timeline.length - 1] || null;
  return {
    snapshotCount: chronological.length,
    windowStart: first?.analyzedAt || null,
    windowEnd: latest?.analyzedAt || null,
    timeline,
    latest,
    change: chronological.length >= 2 && first && latest ? {
      uniqueCves: latest.uniqueCves - first.uniqueCves,
      kevCves: latest.kevCves - first.kevCves,
      exposures: latest.exposures - first.exposures,
      riskScore: latest.riskScore - first.riskScore
    } : null,
    dwell
  };
}

function severityRank(value) {
  return ({ critical: 4, high: 3, medium: 2, moderate: 2, low: 1 })[
    String(value || '').toLowerCase()
  ] || 0;
}
