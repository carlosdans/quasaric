import test from 'node:test';
import assert from 'node:assert/strict';
import { getTranslations, normalizeLanguage, resolveLanguage } from './i18n.js';

test('Spanish browser preference is detected', () => {
  assert.equal(resolveLanguage(null, ['es-ES', 'en-US']), 'es');
});

test('English browser preference is detected', () => {
  assert.equal(resolveLanguage(null, ['en-US']), 'en');
});

test('a saved supported language takes priority over browser preferences', () => {
  assert.equal(resolveLanguage('en', ['es-ES']), 'en');
  assert.equal(resolveLanguage('es', ['en-US']), 'es');
});

test('unsupported and regional language values fall back safely', () => {
  assert.equal(normalizeLanguage('es-MX'), 'es');
  assert.equal(normalizeLanguage('fr-FR'), 'en');
  assert.equal(resolveLanguage('fr', ['fr-FR']), 'en');
});

test('both language dictionaries contain the same essential page sections', () => {
  const english = getTranslations('en');
  const spanish = getTranslations('es');
  for (const key of Object.keys(english)) assert.ok(key in spanish, `Missing Spanish key: ${key}`);
  assert.equal(english.ideas.length, 3);
  assert.equal(spanish.ideas.length, 3);
});
