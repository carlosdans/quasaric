import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const app = await readFile(new URL('../src/App.jsx', import.meta.url), 'utf8');
const styles = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8');

test('the application never presents hard-coded CVEs as inventory findings', () => {
  assert.doesNotMatch(app, /sampleFindings/);
  assert.doesNotMatch(app, /CVE-2024-21762|CVE-2023-44487|CVE-2021-44228/);
  assert.match(app, /const rows = live \|\| \[\]/);
  assert.doesNotMatch(app, /demo-banner|Datos de demostración|Demonstration data/);
});

test('the overview distinguishes an unanalysed inventory from an empty analysis', () => {
  assert.match(app, /analysis\?\.findings\?\.length \?/);
  assert.match(app, /Todavía no hay resultados de análisis/);
  assert.match(app, /El análisis no devolvió candidatos CVE/);
  assert.match(app, /No results do not prove that components are vulnerability-free/);
});

test('the vulnerability page provides a clear first action before analysis', () => {
  assert.match(app, /There are no live results yet/);
  assert.match(app, /No mostramos CVE de ejemplo como si fueran resultados de tu inventario/);
  assert.match(app, /setActive\('inventory'\); openAdd\(\)/);
  assert.match(styles, /\.vulnerability-empty-state\{min-height:320px/);
});
