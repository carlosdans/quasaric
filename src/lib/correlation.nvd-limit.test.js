import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeInventory } from './correlation.js';

test('queries NVD beyond the old 400-result ceiling', async () => {
  let requestedLimit = null;
  const result = await analyzeInventory([
    { id: 'php-runtime', name: 'php', type: 'runtime', version: '7.2' }
  ], {
    sources: {
      fetchNvdByKeyword: async (_keyword, options) => {
        requestedLimit = options.maxResults;
        return [];
      },
      fetchEpssScores: async () => new Map(),
      fetchKevCatalog: async () => new Map()
    }
  });
  assert.equal(requestedLimit, 6000);
  assert.deepEqual(result.findings, []);
});
