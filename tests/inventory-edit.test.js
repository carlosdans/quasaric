import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const app = await readFile(new URL('../src/App.jsx', import.meta.url), 'utf8');

test('inventory components can be edited without changing identity or losing source metadata', () => {
  assert.match(app, /const openEdit = item =>/);
  assert.match(app, /setEditingComponentId\(item\.id\)/);
  assert.match(app, /const updated = itemsRef\.current\.map\(item => item\.id === editingComponentId \? \{ \.\.\.item, \.\.\.form, id: item\.id, createdAt: item\.createdAt \} : item\)/);
  assert.match(app, /onClick=\{\(\) => openEdit\(item\)\}/);
  assert.match(app, /Editar componente|Edit component/);
  assert.match(app, /Guardar cambios|Save changes/);
});

test('editing validates PURLs and preserves the original component if persistence fails', () => {
  const editStart = app.indexOf('if (editingComponentId) {', app.indexOf('const addItem'));
  const editEnd = app.indexOf('} else {', editStart);
  const editBranch = app.slice(editStart, editEnd);
  assert.match(app.slice(app.indexOf('const addItem'), editStart), /parsePackageUrl\(form\.purl\)/); // Validation runs before either write path.
  assert.match(editBranch, /if \(!persist\(updated\)\)/);
  assert.match(editBranch, /original component has been preserved|componente original se ha conservado/);
});


test('removing a component requires confirmation and announces its identity accessibly', () => {
  assert.match(app, /const removeItem = item =>/);
  assert.match(app, /if \(!window\.confirm\(message\)\) return/);
  assert.match(app, /persist\(itemsRef\.current\.filter\(component => component\.id !== item\.id\)\)/);
  assert.match(app, /onClick=\{\(\) => removeItem\(item\)\}/);
  assert.match(app, /'Eliminar ' : 'Remove '\)/);
  assert.match(app, /lang === 'es' \? 'Eliminar componente' : 'Remove component'/);
});


test('backup comparison bounds rendered change previews while preserving full counts', () => {
  const comparisonStart = app.indexOf('{inventoryComparison && <section');
  const comparisonEnd = app.indexOf('</section>}', comparisonStart);
  const comparison = app.slice(comparisonStart, comparisonEnd);
  assert.match(comparison, /inventoryComparison\.added\.slice\(0,20\)\.map/);
  assert.match(comparison, /inventoryComparison\.removed\.slice\(0,20\)\.map/);
  assert.match(comparison, /inventoryComparison\.added\.length-20/);
  assert.match(comparison, /inventoryComparison\.removed\.length-20/);
  assert.match(comparison, /inventoryComparison\.added\.length/);
  assert.match(comparison, /inventoryComparison\.removed\.length/);
});
