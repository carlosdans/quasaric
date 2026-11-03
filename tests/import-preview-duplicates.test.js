import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const app = await readFile(new URL('../src/App.jsx', import.meta.url), 'utf8');
const styles = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8');

test('import review estimates possible duplicates before applying CSV or SBOM data', () => {
  assert.match(app, /const pendingImportDuplicateCount = useMemo\(\(\) => \{/);
  assert.match(app, /inspectInventory\(\[\.\.\.items, \.\.\.pendingInventoryImport\.components\]\)/);
  assert.match(app, /Possible duplicates detected: /);
  assert.match(app, /Posibles duplicados detectados: /);
  assert.match(app, /pendingImportDuplicateCount/);
  assert.match(styles, /\.import-duplicate-preview/);
  assert.ok(app.includes('className="import-duplicate-preview"'));
  assert.ok(app.includes('const confirmInventoryImport'));
});
