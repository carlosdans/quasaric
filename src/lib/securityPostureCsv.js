import { toCsv } from './csv.js';

/**
 * Export the local posture window as a spreadsheet-friendly CSV.
 * Timeline metrics and CVE/component observations share a stable schema.
 */
export function buildSecurityPostureCsv(posture = {}) {
  const columns = [
    'record_type', 'snapshot_id', 'analyzed_at', 'exposures', 'unique_cves',
    'kev_cves', 'critical_cves', 'high_cves', 'components', 'aggregated_priority',
    'cve', 'component', 'first_observed_at', 'last_observed_at',
    'snapshots_seen', 'present_in_latest'
  ];
  const rows = [columns];
  const timeline = Array.isArray(posture?.timeline) ? posture.timeline : [];
  const dwell = Array.isArray(posture?.dwell) ? posture.dwell : [];
  for (const point of timeline) {
    if (!point || typeof point !== 'object') continue;
    rows.push([
      'snapshot', point.id, point.analyzedAt, point.exposures, point.uniqueCves,
      point.kevCves, point.criticalCves, point.highCves, point.components,
      point.riskScore, '', '', '', '', '', ''
    ]);
  }
  for (const item of dwell) {
    if (!item || typeof item !== 'object') continue;
    rows.push([
      'observation', '', '', '', '', '', '', '', '', '',
      item.cve, item.componentName, item.firstObservedAt, item.lastObservedAt,
      item.snapshotsSeen, item.presentInLatest
    ]);
  }
  return toCsv(rows);
}
