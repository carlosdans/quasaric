const ATTRIBUTE_NAMES = [
  'part', 'vendor', 'product', 'version', 'update', 'edition',
  'language', 'swEdition', 'targetSw', 'targetHw', 'other'
];

function splitFormattedString(value) {
  const fields = [];
  let field = '';
  let escaped = false;
  for (const character of value) {
    if (escaped) {
      if (character.charCodeAt(0) < 0x20 || character.charCodeAt(0) > 0x7e) return null;
      field += character;
      escaped = false;
    } else if (character === '\\') {
      escaped = true;
    } else if (character === ':') {
      fields.push(field);
      field = '';
    } else {
      if (character.charCodeAt(0) < 0x20 || character.charCodeAt(0) > 0x7e || /\\s/.test(character)) return null;
      field += character;
    }
  }
  if (escaped) return null;
  fields.push(field);
  return fields;
}

/**
 * Parse the CPE 2.3 formatted-string binding. This validates structure only;
 * it does not infer products, expand wildcards, or claim a CPE match.
 */
export function parseCpe23(value) {
  if (typeof value !== 'string') return null;
  const input = value.trim();
  if (!input || input.length > 2048 || !input.startsWith('cpe:2.3:')) return null;
  const fields = splitFormattedString(input);
  if (!fields || fields.length !== 13 || fields[0] !== 'cpe' || fields[1] !== '2.3') return null;
  const attributes = fields.slice(2);
  if (attributes.some(attribute => attribute.length === 0)) return null;
  if (!['a', 'o', 'h', '*', '-'].includes(attributes[0])) return null;
  if (attributes.some(attribute => /[\s]/.test(attribute))) return null;
  return Object.fromEntries(ATTRIBUTE_NAMES.map((name, index) => [name, attributes[index]]));
}
