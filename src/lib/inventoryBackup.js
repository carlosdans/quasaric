export const INVENTORY_BACKUP_FORMAT = 'quasaric-inventory';
export const INVENTORY_BACKUP_VERSION = 1;
const allowedTypes = new Set(['os', 'web', 'runtime', 'cms', 'database', 'library', 'other']);
const MAX_IDENTIFIER_LENGTH = 2048;
const MAX_FIELD_LENGTH = 16384;
const STRING_FIELDS = ['name', 'version', 'vendor', 'sourcePackage', 'sourceVersion', 'architecture'];
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
        !validIdentifier('purl') || !validIdentifier('cpe')) {
      throw new Error('Invalid component at position ' + (index + 1) + '.');
    }
    return {
      id: typeof item.id === 'string' && item.id ? item.id : 'restored-' + (index + 1),
      name: item.name.trim(), type: allowedTypes.has(item.type) ? item.type : 'other',
      version: item.version || '', vendor: item.vendor || '',
      sourcePackage: typeof item.sourcePackage === 'string' ? item.sourcePackage : '',
      sourceVersion: typeof item.sourceVersion === 'string' ? item.sourceVersion : '',
      architecture: typeof item.architecture === 'string' ? item.architecture : '',
      purl: item.purl || '', cpe: item.cpe || '',
      createdAt: typeof item.createdAt === 'string' ? item.createdAt : null
    };
  });
  return { createdAt: data.createdAt || null, components };
}

export function compareInventories(previous = [], current = []) {
  const key = x => [x.name, x.type, x.vendor, x.version, x.sourcePackage, x.sourceVersion, x.architecture, x.purl, x.cpe]
    .map(v => String(v || '').trim().toLowerCase()).join('|');
  const old = new Map(previous.map(x => [key(x), x]));
  const now = new Map(current.map(x => [key(x), x]));
  return {
    added: current.filter(x => !old.has(key(x))),
    removed: previous.filter(x => !now.has(key(x))),
    unchanged: current.filter(x => old.has(key(x)))
  };
}
