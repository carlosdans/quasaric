import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeComponentType, suggestedComponentType } from './componentTypes.js';

test('known technologies receive their expected component type', () => {
  assert.equal(suggestedComponentType('PHP'), 'runtime');
  assert.equal(suggestedComponentType('OpenSSL'), 'library');
  for (const name of ['Go', 'Golang', 'Ruby', 'Rust', '.NET', 'dotnet', 'ASP.NET', 'PowerShell']) {
    assert.equal(suggestedComponentType(name), 'runtime', name);
  }
  assert.equal(suggestedComponentType('Caddy'), 'web');
  assert.equal(suggestedComponentType('Apache Tomcat'), 'web');
  assert.equal(suggestedComponentType('PHP-FPM'), 'runtime');
  assert.equal(suggestedComponentType('  Apache   HTTP Server  '), 'web');
  assert.equal(suggestedComponentType('Node JS'), 'runtime');
  assert.equal(suggestedComponentType('Apache HTTP Server'), 'web');
  assert.equal(suggestedComponentType('apache2'), 'web');
  assert.equal(suggestedComponentType('httpd'), 'web');
  assert.equal(suggestedComponentType('NGINX'), 'web');
  assert.equal(suggestedComponentType('MySQL'), 'database');
  assert.equal(suggestedComponentType('Ubuntu'), 'os');
  assert.equal(suggestedComponentType('Debian'), 'os');
  assert.equal(suggestedComponentType('Windows Server'), 'os');
  assert.equal(suggestedComponentType('Windows Server 2022'), 'os');
  assert.equal(suggestedComponentType('Red Hat Enterprise Linux'), 'os');
  assert.equal(suggestedComponentType('RHEL'), 'os');
  assert.equal(suggestedComponentType('Fedora'), 'os');
  assert.equal(suggestedComponentType('Alpine Linux'), 'os');
  assert.equal(suggestedComponentType('AlmaLinux'), 'os');
  assert.equal(suggestedComponentType('Rocky Linux'), 'os');
  assert.equal(suggestedComponentType('SUSE Linux Enterprise Server'), 'os');
  assert.equal(suggestedComponentType('SLES'), 'os');
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
