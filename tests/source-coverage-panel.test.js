import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('dashboard and vulnerability workspace expose incomplete source coverage', async () => {
  const source = await readFile(new URL('../src/App.jsx', import.meta.url), 'utf8');
  assert.match(source, /function SourceCoveragePanel/);
  assert.match(source, /status !== 'queried'/);
  assert.match(source, /analysis\.errors/);
  assert.match(source, /analysis\.limits/);
  assert.match(source, /SourceCoveragePanel analysis=\{analysis\}/);
  assert.match(source, /Cobertura de las fuentes/);
  assert.match(source, /Source coverage/);
  assert.match(source, /missing results do not mean that vulnerabilities are absent/i);
  assert.match(source, /la ausencia de resultados no equivale a ausencia de vulnerabilidades/i);
  assert.match(source, /Se muestran hasta cinco detalles por categoría/);
});
