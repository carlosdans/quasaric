import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const app = await readFile(new URL('../src/App.jsx', import.meta.url), 'utf8');

test('every icon used by the version-guide copy action is imported', () => {
  assert.match(app, /import \{[\s\S]*?\bCopy\b[\s\S]*?\} from 'lucide-react'/);
  assert.match(app, /<Copy size=\{13\}\/>/);
});
