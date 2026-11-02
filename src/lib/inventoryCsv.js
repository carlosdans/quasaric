const ALLOWED_TYPES = new Set(['os', 'web', 'runtime', 'cms', 'database', 'library', 'other']);
const FIELDS = ['name', 'type', 'version', 'vendor', 'sourcePackage', 'sourceVersion', 'architecture', 'purl', 'cpe'];
const MAX_CSV_BYTES = 5 * 1024 * 1024;
const MAX_ROWS = 50000;
const MAX_COLUMNS = 32;
const MAX_CELL_CHARACTERS = 16384;

/**
 * Parse the inventory CSV exported by Quasaric. Parsing is local and deliberately
 * limited to the documented comma-separated schema.
 */
export function parseInventoryCsv(input) {
  if (typeof input !== 'string') throw new TypeError('CSV content must be text.');
  if (new TextEncoder().encode(input).byteLength > MAX_CSV_BYTES) throw new Error('CSV exceeds the 5 MB text limit.');
  const source = input.replace(/^\uFEFF/, '');
  const rows = [];
  let row = [], cell = '', quoted = false, afterQuote = false;
  for (let i = 0; i < source.length; i += 1) {
    const char = source[i];
    if (quoted) {
      if (char === '"') {
        if (source[i + 1] === '"') {
          cell += '"';
          if (cell.length > MAX_CELL_CHARACTERS) throw new Error('CSV contains a field longer than 16384 characters.');
          i += 1;
        }
        else { quoted = false; afterQuote = true; }
      } else {
        cell += char;
        if (cell.length > MAX_CELL_CHARACTERS) throw new Error('CSV contains a field longer than 16384 characters.');
      }
      continue;
    }
    if (afterQuote && char !== ',' && char !== '\r' && char !== '\n' && char !== ' ' && char !== '\t') {
      throw new Error('Unexpected character after a quoted CSV field.');
    }
    if (char === '"' && cell.length === 0 && !afterQuote) quoted = true;
    else if (char === '"') throw new Error('Unexpected quote in an unquoted CSV field.');
    else if (char === ',') { row.push(cell); cell = ''; afterQuote = false; }
    else if (char === '\r' || char === '\n') {
      if (char === '\r' && source[i + 1] === '\n') i += 1;
      row.push(cell); rows.push(row);
      if (rows.length > MAX_ROWS + 1) throw new Error('CSV exceeds the 50000 data-row limit.');
      row = []; cell = ''; afterQuote = false;
    } else if (!afterQuote || char === ' ' || char === '\t') {
      if (!afterQuote) {
        cell += char;
        if (cell.length > MAX_CELL_CHARACTERS) throw new Error('CSV contains a field longer than 16384 characters.');
      }
    }
  }
  if (quoted) throw new Error('CSV contains an unterminated quoted field.');
  if (cell.length || row.length || afterQuote) { row.push(cell); rows.push(row); }
  while (rows.length && rows[rows.length - 1].every(value => value.trim() === '')) rows.pop();
  if (!rows.length) throw new Error('CSV is empty.');
  const headers = rows.shift().map(value => value.trim());
  if (headers.length > MAX_COLUMNS) throw new Error('CSV exceeds the 32-column limit.');
  if (new Set(headers.map(value => value.toLowerCase())).size !== headers.length) throw new Error('CSV contains duplicate column names.');
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
    if ((record.purl || '').length > 2048 || (record.cpe || '').length > 2048) {
      errors.push({ row: rowNumber, message: 'PURL and CPE fields must not exceed 2048 characters.' });
      return;
    }
    components.push(Object.fromEntries(FIELDS.map(field => [
      field, field === 'type' ? type : (record[field] || '')
    ])));
  });
  return { components, errors };
}
