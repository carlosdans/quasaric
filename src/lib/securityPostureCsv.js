function csvCell(value) {
  const text = value == null ? '' : String(value);
  return '"' + text.replace(/"/g, '""') + '"';
}

/**
 * Export the local posture window as a spreadsheet-friendly CSV.
 * Timeline metrics and CVE/component observations share a stable schema.
 */
export function buildSecurityPostureCsv(posture) {
  const columns = [
    'record_type', 'snapshot_id', 'analyzed_at', 'exposures', 'unique_cves',
    'kev_cves', 'critical_cves', 'high_cves', 'components', 'aggregated_priority',
    'cve', 'component', 'first_observed_at', 'last_observed_at',
    'snapshots_seen', 'present_in_latest'
  ];
  const rows = [columns];
  for (const point of posture?.timeline || []) {
    rows.push([
      'snapshot', point.id, point.analyzedAt, point.exposures, point.uniqueCves,
      point.kevCves, point.criticalCves, point.highCves, point.components,
      point.riskScore, '', '', '', '', '', ''
    ]);
  }
  for (const item of posture?.dwell || []) {
    rows.push([
      'observation', '', '', '', '', '', '', '', '', '',
      item.cve, item.componentName, item.firstObservedAt, item.lastObservedAt,
      item.snapshotsSeen, item.presentInLatest
    ]);
  }
  return '\uFEFF' + rows.map(row => row.map(csvCell).join(',')).join('\r\n');
}
