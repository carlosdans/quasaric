import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('large exposure dwell tables are paginated and reset when analysis history changes', async () => {
  const source = await readFile(new URL('../src/App.jsx', import.meta.url), 'utf8');
  assert.match(source, /const POSTURE_DWELL_PAGE_SIZE = 25/);
  assert.match(source, /const postureDwellPageCount = Math\.max\(1, Math\.ceil\(posture\.dwell\.length \/ POSTURE_DWELL_PAGE_SIZE\)\)/);
  assert.match(source, /const visiblePostureDwell = posture\.dwell\.slice\(/);
  assert.match(source, /visiblePostureDwell\.map\(item => <tr key=\{item\.key\}>/);
  assert.match(source, /useEffect\(\(\) => \{ setPostureDwellPage\(1\); \}, \[analysisHistory\]\)/);
  assert.match(source, /aria-label=\{lang === 'es' \? 'Paginación de permanencia' : 'Exposure history pagination'\}/);
  assert.match(source, /disabled=\{postureDwellPage <= 1\}/);
  assert.match(source, /disabled=\{postureDwellPage >= postureDwellPageCount\}/);
});
