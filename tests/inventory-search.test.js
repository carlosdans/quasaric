import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const app = await readFile(new URL('../src/App.jsx', import.meta.url), 'utf8');

test('inventory search filters identifying metadata locally before pagination', () => {
  assert.match(app, /const filteredInventoryItems = useMemo\(\(\) =>/);
  assert.match(app, /item\.sourcePackage, item\.sourceVersion/);
  assert.match(app, /item\.purl, item\.cpe/);
  assert.match(app, /filteredInventoryItems\.slice\(start, start \+ INVENTORY_PAGE_SIZE\)/);
  assert.match(app, /Buscar en el inventario|Search inventory/);
  assert.match(app, /No hay componentes que coincidan con la búsqueda|No components match your search/);
});
