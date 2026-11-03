import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const app = await readFile(new URL('../src/App.jsx', import.meta.url), 'utf8');

test('Ubuntu remediation commands are visible and copyable in vulnerability results', () => {
  assert.match(app, /const command = buildRemediationCommand\(item\.guidance\)/);
  assert.match(app, /className="finding-remediation-command"/);
  assert.match(app, /navigator\.clipboard\?\.writeText\(command\)/);
  assert.match(app, /review the official notice|revisa el aviso oficial/i);
});
