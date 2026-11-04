import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('large vulnerability result sets are paginated and filters return to the first page', async () => {
  const source = await readFile(new URL('../src/App.jsx', import.meta.url), 'utf8');
  assert.match(source, /const FINDING_PAGE_SIZE = 25/);
  assert.match(source, /const findingPageCount = Math\.max\(1, Math\.ceil\(filtered\.length \/ FINDING_PAGE_SIZE\)\)/);
  assert.match(source, /const visibleFindings = filtered\.slice\(/);
  assert.match(source, /visibleFindings\.map\(f => <tr key=\{f\.id\}>/);
  assert.match(source, /useEffect\(\(\) => \{ setFindingPage\(1\); \}, \[query, severityFilter, applicabilityFilter\]\)/);
  assert.match(source, /onChange=\{event => setApplicabilityFilter\(event\.target\.value\)\}/);
  assert.match(source, /aria-label=\{lang === 'es' \? 'Paginación de vulnerabilidades' : 'Vulnerability pagination'\}/);
  assert.match(source, /disabled=\{currentFindingPage <= 1\}/);
  assert.match(source, /disabled=\{currentFindingPage >= findingPageCount\}/);
});
