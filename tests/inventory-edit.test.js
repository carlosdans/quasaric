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
  assert.match(editBranch, /parsePackageUrl/); // Validation remains before either write path.
  assert.match(editBranch, /if \(!persist\(updated\)\)/);
  assert.match(editBranch, /original component has been preserved|componente original se ha conservado/);
});
