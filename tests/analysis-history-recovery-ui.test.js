import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const app = await readFile(new URL('../src/App.jsx', import.meta.url), 'utf8');

test('shows a visible alert when a completed analysis cannot be persisted', () => {
  assert.match(app, /analysisHistoryWarning && <div className="error-banner" role="alert"/);
  assert.match(app, /could not be saved to local history/);
  assert.match(app, /no se pudo guardar en el historial local/);
});

test('explains why a preserved history recovery copy is available', () => {
  assert.match(app, /historyRecoveryAvailable && <div className="notice import-feedback" role="status"/);
  assert.match(app, /original analysis history recovery copy is preserved/);
  assert.match(app, /copia original de recuperación del historial/);
  assert.match(app, /exportAnalysisHistoryRecovery/);
});

test('does not clear an unsaved-history warning when a new analysis starts', () => {
  const runStart = app.slice(app.indexOf('const runAnalysis = async () => {'), app.indexOf('const handleInventoryImport = async'));
  assert.doesNotMatch(runStart, /setAnalysisHistoryWarning\(false\)/);
  assert.match(runStart, /setAnalysisHistoryWarning\(!historySaved\)/);
});
