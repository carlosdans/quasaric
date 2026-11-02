import test from 'node:test';
import assert from 'node:assert/strict';
import { parsePackageUrl } from './packageUrl.js';

test('parses type, namespace, name, version, qualifiers and subpath', () => {
  assert.deepEqual(parsePackageUrl('pkg:npm/%40scope/package@1.2.3?arch=x64&os=linux#dist/index.js'), {
    type:'npm', namespace:'@scope', name:'package', version:'1.2.3',
    qualifiers:{arch:'x64',os:'linux'}, subpath:'dist/index.js', ecosystem:'npm'
  });
});

test('decodes escaped package coordinates but preserves the input outside the parser', () => {
  const parsed = parsePackageUrl('pkg:generic/acme%2Fagent@2.0');
  assert.equal(parsed.name,'acme/agent');
  assert.equal(parsed.version,'2.0');
});

test('rejects malformed, ambiguous, duplicate and oversized PURLs', () => {
  for (const value of ['', 'pkg:npm', 'pkg:1npm/a@1', 'pkg:npm/a@', 'pkg:npm/a?arch=x&arch=y', 'pkg:npm/a?arch', 'pkg:npm/a?arch=', 'pkg:npm/a?arch=x&ARCH=y', 'pkg:npm/%ZZ', 'pkg:npm/a/../b', 'pkg:npm/org%2Fteam/a@1', 'pkg:npm/a@1#dist/%2Ffile', 'pkg:npm/a@1#', 'pkg:npm/' + 'a'.repeat(2049)]) {
    assert.equal(parsePackageUrl(value), null, value);
  }
});

test('accepts equivalent pkg:// URLs and normalizes type and qualifier case', () => {
  const parsed = parsePackageUrl('pkg://NPM/%40Scope/package@1.2.3?ARCH=x64');
  assert.equal(parsed.type, 'npm');
  assert.equal(parsed.namespace, '@Scope');
  assert.equal(parsed.name, 'package');
  assert.deepEqual(parsed.qualifiers, { arch: 'x64' });
});

test('normalizes insignificant leading and trailing path slashes', () => {
  const parsed = parsePackageUrl('pkg:npm//scope/package@1.2.3#//dist/index.js/');
  assert.equal(parsed.namespace, 'scope');
  assert.equal(parsed.name, 'package');
  assert.equal(parsed.subpath, 'dist/index.js');
});

test('treats qualifier keys as case-insensitive when detecting duplicates', () => {
  assert.equal(parsePackageUrl('pkg:npm/package@1?ARCH=x&arch=y'), null);
});

test('does not infer CPE identity from a PURL', () => {
  const parsed = parsePackageUrl('pkg:pypi/requests@2.31.0');
  assert.equal(parsed.type,'pypi');
  assert.equal(Object.hasOwn(parsed,'cpe'),false);
});
