export const INVENTORY_BACKUP_FORMAT = 'quasaric-inventory';
export const INVENTORY_BACKUP_VERSION = 1;
const allowedTypes = new Set(['os', 'web', 'runtime', 'cms', 'database', 'library', 'other']);
const MAX_IDENTIFIER_LENGTH = 2048;

export function createInventoryBackup(items, createdAt = new Date().toISOString()) {
  if (!Array.isArray(items)) throw new Error('Inventory must be an array.');
  return { format: INVENTORY_BACKUP_FORMAT, version: INVENTORY_BACKUP_VERSION, createdAt, components: items };
}

export function parseInventoryBackup(input) {
  let data;
  try { data = typeof input === 'string' ? JSON.parse(input) : input; }
  catch { throw new Error('Invalid JSON backup.'); }
  if (!data || data.format !== INVENTORY_BACKUP_FORMAT || data.version !== INVENTORY_BACKUP_VERSION || !Array.isArray(data.components)) {
    throw new Error('Unsupported or invalid Quasaric backup.');
  }
  const components = data.components.map((item, index) => {
    const validIdentifier = field => item[field] == null ||
      (typeof item[field] === 'string' && item[field].length <= MAX_IDENTIFIER_LENGTH);
    if (!item || typeof item !== 'object' || Array.isArray(item) || typeof item.name !== 'string' || !item.name.trim() ||
        (item.version != null && typeof item.version !== 'string') ||
        (item.vendor != null && typeof item.vendor !== 'string') ||
        (item.type != null && !allowedTypes.has(item.type)) ||
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
