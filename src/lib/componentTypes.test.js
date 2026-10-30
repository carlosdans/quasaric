import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeComponentType, suggestedComponentType } from './componentTypes.js';

test('known technologies receive their expected component type', () => {
  assert.equal(suggestedComponentType('PHP'), 'runtime');
  assert.equal(suggestedComponentType('PHP-FPM'), 'runtime');
  assert.equal(suggestedComponentType('Apache HTTP Server'), 'web');
  assert.equal(suggestedComponentType('NGINX'), 'web');
  assert.equal(suggestedComponentType('MySQL'), 'database');
  assert.equal(suggestedComponentType('Ubuntu'), 'os');
});

test('legacy misclassified inventory entries are corrected without mutating input', () => {
  const legacy = { id: '1', name: 'PHP', type: 'web', version: '8.2' };
  const normalized = normalizeComponentType(legacy);
  assert.equal(normalized.type, 'runtime');
  assert.equal(legacy.type, 'web');
});

test('unknown technology keeps user-selected type', () => {
  const item = { name: 'Internal Service', type: 'other' };
  assert.equal(normalizeComponentType(item), item);
});
