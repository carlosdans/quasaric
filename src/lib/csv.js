function csvCell(value) {
  let text = String(value ?? '');
  // Quoting alone does not stop spreadsheet formula execution.
  const formulaPrefix = /^[\s\u0000-\u001f\u007f-\u009f\ufeff]*[=+@-]/u.test(text);
  const first = text.charCodeAt(0);
  if (formulaPrefix || first === 9 || first === 10 || first === 13) {
    text = "'" + text;
  }
  return '"' + text.replaceAll('"', '""') + '"';
}

export function toCsv(rows) {
  const lines = rows.map(row => row.map(csvCell).join(','));
  return '\uFEFF' + lines.join('\r\n');
}
