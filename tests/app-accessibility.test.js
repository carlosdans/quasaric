import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const app = await readFile(new URL('../src/App.jsx', import.meta.url), 'utf8');

test('vulnerability detail dialog traps focus and closes with Escape', () => {
  assert.match(app, /selectedFindingDialogRef/);
  assert.match(app, /openFindingDetails\s*=\s*finding\s*=>/);
  assert.match(app, /event\.key === 'Escape'[\s\S]*?setSelectedFinding\(null\)/);
  assert.match(app, /event\.key !== 'Tab'[\s\S]*?focusableElements/);
  assert.match(app, /finding-detail-close/);
  assert.match(app, /aria-modal="true" aria-labelledby="finding-detail-title"/);
  assert.match(app, /selectedFindingTriggerRef\.current\.focus\(\)/);
});

test('vulnerability search input has an accessible name', () => {
  assert.match(app, /<input aria-label=\{t\.search\} value=\{query\}/);
});
