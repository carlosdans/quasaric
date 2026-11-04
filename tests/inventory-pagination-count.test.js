import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');

test('inventory pagination counts the filtered collection in Spanish and English', () => {
  assert.match(app, /Mostrando \$\{\(inventoryPage - 1\) \* INVENTORY_PAGE_SIZE \+ 1\}–\$\{Math\.min\(inventoryPage \* INVENTORY_PAGE_SIZE, filteredInventoryItems\.length\)\} de \$\{filteredInventoryItems\.length\}/);
  assert.match(app, /Showing \$\{\(inventoryPage - 1\) \* INVENTORY_PAGE_SIZE \+ 1\}–\$\{Math\.min\(inventoryPage \* INVENTORY_PAGE_SIZE, filteredInventoryItems\.length\)\} of \$\{filteredInventoryItems\.length\}/);
});
