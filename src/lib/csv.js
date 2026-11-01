export function toCsv(rows) {
  const lines = rows.map(row =>
    row.map(value => '"' + String(value ?? '').replaceAll('"', '""') + '"').join(',')
  );
  return '\uFEFF' + lines.join('\r\n');
}
