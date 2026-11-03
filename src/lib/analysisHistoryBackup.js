import {
  ANALYSIS_HISTORY_LIMIT,
  ANALYSIS_HISTORY_MAX_BYTES,
  isValidAnalysisSnapshot
} from './analysisHistory.js';

const FORMAT = 'quasaric-analysis-history';

function withinByteLimit(value) {
  return new TextEncoder().encode(value).byteLength <= ANALYSIS_HISTORY_MAX_BYTES;
}

function snapshotKey(snapshot) {
  return String(snapshot?.id || snapshot?.analyzedAt || '');
}

/** Create a portable, versioned backup of the local analysis history. */
export function createAnalysisHistoryBackup(history) {
  if (!Array.isArray(history) || history.length > ANALYSIS_HISTORY_LIMIT ||
      !history.every(isValidAnalysisSnapshot)) {
    throw new TypeError('A valid analysis history with at most ten snapshots is required.');
  }
  const backup = {
    format: FORMAT,
    version: 1,
    exportedAt: new Date().toISOString(),
    snapshots: history
  };
  const serialized = JSON.stringify(backup, null, 2);
  if (!withinByteLimit(serialized)) {
    throw new Error('Analysis history backup exceeds the 10 MB limit.');
  }
  return serialized;
}

/** Parse atomically: one malformed snapshot rejects the entire backup. */
export function parseAnalysisHistoryBackup(input) {
  if (typeof input !== 'string' || !input.trim()) {
    throw new TypeError('Analysis history backup must be non-empty JSON text.');
  }
  if (!withinByteLimit(input)) {
    throw new Error('Analysis history backup exceeds the 10 MB limit.');
  }
  let parsed;
  try { parsed = JSON.parse(input); }
  catch { throw new TypeError('Analysis history backup is not valid JSON.'); }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed) ||
      parsed.format !== FORMAT || parsed.version !== 1 ||
      !Array.isArray(parsed.snapshots) ||
      parsed.snapshots.length > ANALYSIS_HISTORY_LIMIT ||
      !parsed.snapshots.every(isValidAnalysisSnapshot) ||
      parsed.snapshots.some(snapshot => !snapshotKey(snapshot))) {
    throw new TypeError('Analysis history backup has an unsupported format or invalid snapshots.');
  }
  const keys = parsed.snapshots.map(snapshotKey);
  if (new Set(keys).size !== keys.length) {
    throw new TypeError('Analysis history backup contains duplicate snapshots.');
  }
  return parsed.snapshots;
}

/** Merge imported snapshots without replacing local history or duplicating IDs. */
export function mergeAnalysisHistory(current = [], imported = []) {
  if (!Array.isArray(current) || !Array.isArray(imported) ||
      !current.every(isValidAnalysisSnapshot) || !imported.every(isValidAnalysisSnapshot)) {
    throw new TypeError('Both local and imported histories must contain valid snapshots.');
  }
  const merged = new Map();
  for (const snapshot of [...imported, ...current]) {
    const key = snapshotKey(snapshot);
    if (key && !merged.has(key)) merged.set(key, snapshot);
  }
  return [...merged.values()].sort((a, b) => {
    const aTime = Date.parse(a.analyzedAt || a.id || '');
    const bTime = Date.parse(b.analyzedAt || b.id || '');
    if (Number.isFinite(aTime) && Number.isFinite(bTime)) return bTime - aTime;
    if (Number.isFinite(aTime)) return -1;
    if (Number.isFinite(bTime)) return 1;
    return 0;
  }).slice(0, ANALYSIS_HISTORY_LIMIT);
}
