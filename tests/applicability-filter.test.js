import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');

test('vulnerability list supports applicability filtering in both languages', () => {
  assert.match(app, /const \[applicabilityFilter, setApplicabilityFilter\] = useState\('all'\)/);
  assert.match(app, /applicabilityFilter === 'all' \|\| String\(x\.applicabilityStatus \|\| 'unknown'\)\.toLowerCase\(\) === applicabilityFilter/);
  assert.match(app, /value=\{applicabilityFilter\} onChange=\{event => setApplicabilityFilter\(event\.target\.value\)\}/);
  for (const status of ['affected', 'patched_candidate', 'possible', 'needs_review', 'unaffected', 'unknown']) {
    assert.ok(app.includes(`<option value="${status}">`), `missing applicability option: ${status}`);
  }
  assert.match(app, /Filter by applicability/);
  assert.match(app, /Filtrar por aplicabilidad/);
});
