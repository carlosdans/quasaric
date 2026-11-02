import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const workflow = await readFile(
  new URL('../.github/workflows/azure-static-web-apps-orange-meadow-04bd1081e.yml', import.meta.url),
  'utf8'
);

test('production deployments are serialized and manually retryable', () => {
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /group: quasaric-production-static-web-apps/);
  assert.match(workflow, /cancel-in-progress: false/);
  assert.match(workflow, /github\.event_name == 'push' \|\| github\.event_name == 'workflow_dispatch'/);
  assert.match(workflow, /timeout-minutes: 15/);
});
