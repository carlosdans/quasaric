import test from 'node:test';
import assert from 'node:assert/strict';
import { inventoryCommands } from './inventoryCommands.js';

test('Ubuntu inventory command collects exact binary and source package metadata including architecture', () => {
  const command = inventoryCommands.ubuntu.commands.find(value => value.startsWith('dpkg-query'));
  assert.ok(command);
  for (const field of ['${binary:Package}', '${Version}', '${Architecture}', '${source:Package}', '${source:Version}']) {
    assert.ok(command.includes(field), `missing dpkg-query field ${field}`);
  }
});

test('Ubuntu inventory command remains local and read-only', () => {
  const command = inventoryCommands.ubuntu.commands.find(value => value.startsWith('dpkg-query'));
  assert.match(command, /^dpkg-query -W -f=/);
  assert.doesNotMatch(command, /sudo|apt |curl|wget|https?:\/\//i);
});
