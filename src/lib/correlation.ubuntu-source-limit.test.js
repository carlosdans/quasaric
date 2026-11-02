import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeInventory } from './correlation.js';

test('bounds Ubuntu OSV source-package lookups and reports partial coverage', async () => {
  let calls = 0;
  let active = 0;
  let maxActive = 0;
  const components = Array.from({ length: 105 }, (_, index) => ({
    id: 'ubuntu-package-' + index,
    name: 'nginx',
    type: 'library',
    version: '1.24.0-1',
    vendor: 'Ubuntu:24.04:LTS',
    ecosystem: 'Ubuntu:24.04:LTS',
    sourcePackage: 'nginx-source-' + index,
    sourceVersion: '1.24.0-1',
    architecture: 'amd64'
  }));
  const result = await analyzeInventory(components, {
    sources: {
      fetchNvdByKeyword: async () => [],
      fetchNvdByVirtualMatchString: async () => [],
      fetchUbuntuOsvForSourcePackage: async () => {
        calls += 1;
        active += 1;
        maxActive = Math.max(maxActive, active);
        await Promise.resolve();
        active -= 1;
        return [];
      },
      fetchEpssScores: async () => new Map(),
      fetchKevCatalog: async () => new Map()
    }
  });
  assert.equal(calls, 100);
  assert.ok(maxActive > 1);
  assert.ok(maxActive <= 3);
  assert.equal(result.sources.ubuntuOsv, 'partial_or_unavailable');
  assert.ok(result.errors.some(error =>
    error.source === 'Ubuntu OSV' && /límite de 100/.test(error.message)
  ));
});
