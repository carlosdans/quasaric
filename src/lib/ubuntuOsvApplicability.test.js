import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyUbuntuOsvSourceVersion } from './ubuntuOsvApplicability.js';

const base = {
  package: { name: 'openssl', ecosystem: 'Ubuntu:24.04:LTS' },
  versions: ['3.0.13-0ubuntu3'],
  ranges: [{ type: 'ECOSYSTEM', events: [{ introduced: '0' }, { fixed: '3.0.13-0ubuntu3.1' }] }]
};

test('classifies an explicitly listed source version as affected', () => {
  assert.equal(classifyUbuntuOsvSourceVersion(base, '3.0.13-0ubuntu3').status, 'affected');
});

test('classifies source versions before fixed boundary as affected', () => {
  assert.equal(classifyUbuntuOsvSourceVersion(base, '3.0.13-0ubuntu3').status, 'affected');
  assert.equal(classifyUbuntuOsvSourceVersion(base, '3.0.13-0ubuntu3.0').status, 'affected');
});

test('marks source versions at or beyond fixed boundary as patched candidates', () => {
  assert.equal(classifyUbuntuOsvSourceVersion(base, '3.0.13-0ubuntu3.1').status, 'patched_candidate');
  assert.equal(classifyUbuntuOsvSourceVersion(base, '3.0.13-0ubuntu3.2').status, 'patched_candidate');
});

test('honours explicit not-affected status only on the exact affected entry', () => {
  assert.equal(classifyUbuntuOsvSourceVersion({ ...base, ecosystem_specific: { status: 'not-affected' } }, '3.0.13-0ubuntu3').status, 'unaffected');
});

test('keeps pending and needs-triage records under review', () => {
  for (const status of ['pending', 'needs-triage', 'ignored', 'deferred']) {
    assert.equal(classifyUbuntuOsvSourceVersion({ package: base.package, ecosystem_specific: { status } }, '3.0.13-0ubuntu3').status, 'needs_review');
  }
});

test('does not infer unaffected when the package or release entry is absent', () => {
  assert.equal(classifyUbuntuOsvSourceVersion(null, '3.0.13-0ubuntu3').status, 'needs_review');
  assert.equal(classifyUbuntuOsvSourceVersion({ package: base.package }, '3.0.13-0ubuntu3').status, 'needs_review');
});

test('requires a non-empty source version from the caller', () => {
  assert.equal(classifyUbuntuOsvSourceVersion(base, '').status, 'needs_review');
});


test('does not treat a version between disjoint affected ranges as patched', () => {
  const disjoint = {
    package: base.package,
    ranges: [{
      type: 'ECOSYSTEM',
      events: [
        { introduced: '0' }, { fixed: '1.0-1' },
        { introduced: '2.0-1' }, { fixed: '3.0-1' }
      ]
    }]
  };
  assert.equal(classifyUbuntuOsvSourceVersion(disjoint, '1.5-1').status, 'needs_review');
  assert.equal(classifyUbuntuOsvSourceVersion(disjoint, '2.5-1').status, 'affected');
  assert.equal(classifyUbuntuOsvSourceVersion(disjoint, '3.5-1').status, 'patched_candidate');
});
