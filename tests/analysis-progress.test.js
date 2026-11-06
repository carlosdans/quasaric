import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const app = await readFile(new URL('../src/App.jsx', import.meta.url), 'utf8');
const correlation = await readFile(new URL('../src/lib/correlation.js', import.meta.url), 'utf8');
const styles = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8');

test('analysis progress distinguishes NVD product queries from later evidence enrichment', () => {
  assert.match(app, /phase: 'nvd'/);
  assert.match(correlation, /onProgress\?\.\(\{ completed: components\.length, total: components\.length, phase: 'enrichment' \}\)/);
  assert.match(app, /Consultando NVD/);
  assert.match(app, /Contrastando evidencias complementarias/);
  assert.match(app, /NVD completado · OSV, VEX y fuentes de distribución en curso/);
  assert.match(app, /is-enriching/);
});

test('the enrichment indicator respects reduced-motion preferences', () => {
  assert.match(styles, /\.progress-track\.is-enriching i/);
  assert.match(styles, /prefers-reduced-motion:reduce\)\{\.progress-track\.is-enriching i\{animation:none/);
});


test('cancelling an analysis immediately releases the UI lock and invalidates stale results', () => {
  assert.match(app, /const cancelActiveAnalysis = \(\) => \{/);
  const cancel = app.slice(app.indexOf('const cancelActiveAnalysis'), app.indexOf('const persist =', app.indexOf('const cancelActiveAnalysis')));
  assert.match(cancel, /analysisAbortRef\.current = null/);
  assert.match(cancel, /controller\.abort\(\)/);
  assert.match(cancel, /setAnalyzing\(false\)/);
  assert.match(app, /onClick=\{cancelActiveAnalysis\}/);
  assert.match(app, /cancelActiveAnalysis\(\);\s*itemsRef\.current = next/);
  assert.match(app, /analysisAbortRef\.current !== controller/);
});


test('leaving the workspace aborts an active analysis request', () => {
  const marker = 'const analysisAbortRef = useRef(null);';
  const start = app.indexOf(marker);
  const cleanup = app.indexOf('controller.abort();', start);
  const effectEnd = app.indexOf('}, []);', cleanup);
  assert.ok(start >= 0 && cleanup > start && effectEnd > cleanup);
  assert.match(app.slice(start, effectEnd + 6), /analysisAbortRef\.current = null/);
});
