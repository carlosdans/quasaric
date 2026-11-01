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

test('uses the precise PHP CPE query instead of broad keyword search in production mode', async () => {
  let requestedCpe = null;
  const result = await analyzeInventory([
    { id: 'php-runtime', name: 'php', type: 'runtime', version: '7.2.0' }
  ], {
    sources: {
      fetchNvdByVirtualMatchString: async criteria => {
        requestedCpe = criteria;
        return [];
      },
      fetchEpssScores: async () => new Map(),
      fetchKevCatalog: async () => new Map()
    }
  });
  assert.equal(requestedCpe, 'cpe:2.3:a:php:php');
  assert.deepEqual(result.findings, []);
});

test('analyses inventories containing more than ten components', async () => {
  let queries = 0;
  const components = Array.from({ length: 12 }, (_, index) => ({ id: `item-${index}`, name: `unknown-${index}`, type: 'other', version: '1.0' }));
  const result = await analyzeInventory(components, {
    sources: {
      fetchNvdByKeyword: async () => { queries += 1; return []; },
      fetchEpssScores: async () => new Map(),
      fetchKevCatalog: async () => new Map()
    }
  });
  assert.equal(queries, 12);
  assert.deepEqual(result.findings, []);
});

test('reuses one NVD response for repeated products in a large inventory', async () => {
  let queries = 0;
  const components = Array.from({ length: 20 }, (_, index) => ({
    id: `php-${index}`, name: 'PHP', type: 'runtime', version: index % 2 ? '8.2.1' : '8.3.1'
  }));
  const result = await analyzeInventory(components, {
    sources: {
      fetchNvdByKeyword: async () => { queries += 1; return []; },
      fetchEpssScores: async () => new Map(),
      fetchKevCatalog: async () => new Map()
    }
  });
  assert.equal(queries, 1);
  assert.deepEqual(result.findings, []);
});
