import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const app = await readFile(new URL('../src/App.jsx', import.meta.url), 'utf8');

test('the printable report distinguishes no analysis from a completed analysis with no candidates', () => {
  assert.match(app, /analysis \? t\.reportNoFindings : t\.reportNoAnalysis/);
  assert.match(app, /El análisis terminó sin candidatos CVE en las fuentes consultadas/);
  assert.match(app, /The analysis completed without CVE candidates in the queried sources/);
  assert.match(app, /Todavía no hay resultados\. Ejecuta un análisis/);
});

test('the printable report localizes applicability and evidence source labels', () => {
  assert.match(app, /applicabilityLabel\(finding\.applicabilityStatus\)/);
  assert.match(app, /sources\.map\(sourceNameLabel\)\.join\(', '\)/);
});
