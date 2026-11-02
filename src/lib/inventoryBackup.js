import { parsePackageUrl } from './packageUrl.js';

export const INVENTORY_BACKUP_FORMAT = 'quasaric-inventory';
export const INVENTORY_BACKUP_VERSION = 1;
const allowedTypes = new Set(['os', 'web', 'runtime', 'cms', 'database', 'library', 'other']);
const MAX_IDENTIFIER_LENGTH = 2048;
const MAX_FIELD_LENGTH = 16384;
const STRING_FIELDS = ['name', 'version', 'vendor', 'sourcePackage', 'sourceVersion', 'architecture', 'sourceRelationship'];
const MAX_BACKUP_BYTES = 10 * 1024 * 1024;
const MAX_COMPONENTS = 50000;

function assertBackupSize(value) {
  let serialized;
  try { serialized = typeof value === 'string' ? value : JSON.stringify(value); }
  catch { throw new Error('Backup must contain serializable JSON data.'); }
  if (typeof serialized !== 'string' || new TextEncoder().encode(serialized).byteLength > MAX_BACKUP_BYTES) {
    throw new Error('Backup exceeds the 10 MB limit.');
  }
  return serialized;
}

export function createInventoryBackup(items, createdAt = new Date().toISOString()) {
  if (!Array.isArray(items)) throw new Error('Inventory must be an array.');
  if (items.length > MAX_COMPONENTS) throw new Error('Backup exceeds the 50000 component limit.');
  const backup = { format: INVENTORY_BACKUP_FORMAT, version: INVENTORY_BACKUP_VERSION, createdAt, components: items };
  assertBackupSize(backup);
  return backup;
}

export function parseInventoryBackup(input) {
  const serialized = assertBackupSize(input);
  let data;
  try { data = typeof input === 'string' ? JSON.parse(serialized) : input; }
  catch { throw new Error('Invalid JSON backup.'); }
  if (!data || typeof data !== 'object' || Array.isArray(data) || data.format !== INVENTORY_BACKUP_FORMAT || data.version !== INVENTORY_BACKUP_VERSION || !Array.isArray(data.components)) {
    throw new Error('Unsupported or invalid Quasaric backup.');
  }
  if (data.components.length > MAX_COMPONENTS) throw new Error('Backup exceeds the 50000 component limit.');
  const components = data.components.map((item, index) => {
    const validIdentifier = field => item[field] == null ||
      (typeof item[field] === 'string' && item[field].length <= MAX_IDENTIFIER_LENGTH);
    if (!item || typeof item !== 'object' || Array.isArray(item) || typeof item.name !== 'string' || !item.name.trim() ||
        !STRING_FIELDS.every(field => item[field] == null || (typeof item[field] === 'string' && item[field].length <= MAX_FIELD_LENGTH)) ||
        (item.type != null && (typeof item.type !== 'string' || !allowedTypes.has(item.type))) ||
        !validIdentifier('purl') || !validIdentifier('cpe') || !validIdentifier('sourceRef') || !validIdentifier('sourcePurl') ||
        (item.purl && !parsePackageUrl(item.purl)) || (item.sourcePurl && !parsePackageUrl(item.sourcePurl))) {
      throw new Error('Invalid component at position ' + (index + 1) + '.');
    }
    return {
      id: typeof item.id === 'string' && item.id ? item.id : 'restored-' + (index + 1),
      name: item.name.trim(), type: allowedTypes.has(item.type) ? item.type : 'other',
      version: item.version || '', vendor: item.vendor || '',
      sourcePackage: typeof item.sourcePackage === 'string' ? item.sourcePackage : '',
      sourceVersion: typeof item.sourceVersion === 'string' ? item.sourceVersion : '',
      sourceRelationship: typeof item.sourceRelationship === 'string' ? item.sourceRelationship : '',
      sourceRef: typeof item.sourceRef === 'string' ? item.sourceRef : '',
      sourcePurl: typeof item.sourcePurl === 'string' ? item.sourcePurl : '',
      architecture: typeof item.architecture === 'string' ? item.architecture : '',
      purl: item.purl || '', cpe: item.cpe || '',
      createdAt: typeof item.createdAt === 'string' ? item.createdAt : null
    };
  });
  return { createdAt: data.createdAt || null, components };
}

export function compareInventories(previous = [], current = []) {
  // Use a structured key and queues rather than Maps of single records:
  // inventories may legitimately contain duplicate package rows.
  const key = item => JSON.stringify([
    item.name, item.type, item.vendor, item.version, item.sourcePackage,
    item.sourceVersion, item.architecture, item.sourceRelationship, item.sourceRef, item.sourcePurl, item.purl, item.cpe
  ].map(value => String(value || '').trim().toLowerCase()));
  const available = new Map();
  current.forEach((item, index) => {
    const identity = key(item);
    if (!available.has(identity)) available.set(identity, []);
    available.get(identity).push(index);
  });
  const matchedCurrent = new Set();
  const removed = [];
  const unchanged = [];
  previous.forEach(item => {
    const matches = available.get(key(item));
    if (matches?.length) {
      matchedCurrent.add(matches.shift());
      unchanged.push(item);
    } else {
      removed.push(item);
    }
  });
  return {
    added: current.filter((item, index) => !matchedCurrent.has(index)),
    removed,
    unchanged
  };
}
