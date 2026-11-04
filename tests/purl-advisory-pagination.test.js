import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('OSV advisories without CVE are shown once and paginated without losing the full count', async () => {
  const source = await readFile(new URL('../src/App.jsx', import.meta.url), 'utf8');
  assert.match(source, /const PURL_ADVISORY_PAGE_SIZE = 25/);
  assert.match(source, /const visiblePurlAdvisories = \(analysis\?\.purlAdvisories \|\| \[\]\)\.slice\(/);
  assert.match(source, /visiblePurlAdvisories\.map\(\(advisory,index\)=>/);
  assert.match(source, /analysis\.purlAdvisories\.length > PURL_ADVISORY_PAGE_SIZE/);
  assert.match(source, /Paginación de avisos OSV/);
  assert.match(source, /OSV advisory pagination/);
  assert.match(source, /setPurlAdvisoryPage\(1\); \}, \[analysis\]\)/);
  assert.equal((source.match(/analysis\.purlAdvisories\.map\(/g) || []).length, 0);
  assert.equal((source.match(/visiblePurlAdvisories\.map\(/g) || []).length, 1);
  assert.equal((source.match(/className="source-advisory-list"/g) || []).length, 1);
});
