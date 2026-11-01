const ALLOWED_TYPES = new Set(['os', 'web', 'runtime', 'cms', 'database', 'library', 'other']);
const FIELDS = ['name', 'type', 'version', 'vendor', 'sourcePackage', 'sourceVersion', 'architecture'];

/**
 * Parse the inventory CSV exported by Quasaric. Parsing is local and deliberately
 * limited to the documented comma-separated schema.
 */
export function parseInventoryCsv(input) {
  if (typeof input !== 'string') throw new TypeError('CSV content must be text.');
  const source = input.replace(/^\uFEFF/, '');
  const rows = [];
  let row = [], cell = '', quoted = false, afterQuote = false;
  for (let i = 0; i < source.length; i += 1) {
    const char = source[i];
    if (quoted) {
      if (char === '"') {
        if (source[i + 1] === '"') { cell += '"'; i += 1; }
        else { quoted = false; afterQuote = true; }
      } else cell += char;
      continue;
    }
    if (afterQuote && char !== ',' && char !== '\r' && char !== '\n' && char !== ' ' && char !== '\t') {
      throw new Error('Unexpected character after a quoted CSV field.');
    }
    if (char === '"' && cell.length === 0 && !afterQuote) quoted = true;
    else if (char === ',') { row.push(cell); cell = ''; afterQuote = false; }
    else if (char === '\r' || char === '\n') {
      if (char === '\r' && source[i + 1] === '\n') i += 1;
      row.push(cell); rows.push(row); row = []; cell = ''; afterQuote = false;
    } else if (!afterQuote || char === ' ' || char === '\t') {
      if (!afterQuote) cell += char;
    }
  }
  if (quoted) throw new Error('CSV contains an unterminated quoted field.');
  if (cell.length || row.length || afterQuote) { row.push(cell); rows.push(row); }
  while (rows.length && rows[rows.length - 1].every(value => value.trim() === '')) rows.pop();
  if (!rows.length) throw new Error('CSV is empty.');
  const headers = rows.shift().map(value => value.trim());
  if (new Set(headers).size !== headers.length) throw new Error('CSV contains duplicate column names.');
  if (!headers.includes('name')) throw new Error('CSV must include a name column.');
  const unknown = headers.filter(header => !FIELDS.includes(header));
  if (unknown.length) throw new Error('CSV contains unsupported columns: ' + unknown.join(', '));
  const components = [], errors = [];
  rows.forEach((values, index) => {
    const rowNumber = index + 2;
    if (values.every(value => value.trim() === '')) return;
    if (values.length !== headers.length) {
      errors.push({ row: rowNumber, message: 'Column count does not match the header.' });
      return;
    }
    const record = Object.fromEntries(headers.map((header, i) => [header, values[i].trim()]));
    if (!record.name) {
      errors.push({ row: rowNumber, message: 'Component name is required.' });
      return;
    }
    const type = record.type || 'other';
    if (!ALLOWED_TYPES.has(type)) {
      errors.push({ row: rowNumber, message: 'Unsupported component type: ' + type });
      return;
    }
    components.push(Object.fromEntries(FIELDS.map(field => [
      field, field === 'type' ? type : (record[field] || '')
    ])));
  });
  return { components, errors };
}
