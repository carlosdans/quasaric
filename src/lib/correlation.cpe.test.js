import test from 'node:test';
import assert from 'node:assert/strict';
import { cpeMatchesComponent } from './correlation.js';

const component = name => ({ name });

test('matches exact CPE vendor/product pairs for supported technologies', () => {
  const cases = [
    ['cpe:2.3:a:php:php:8.2:*:*:*:*:*:*:*', 'PHP'],
    ['cpe:2.3:a:php:php:8.2:*:*:*:*:*:*:*', 'PHP-FPM'],
    ['cpe:2.3:a:python:python:3.12:*:*:*:*:*:*:*', 'Python'],
    ['cpe:2.3:a:postgresql:postgresql:16:*:*:*:*:*:*:*', 'PostgreSQL'],
    ['cpe:2.3:a:mongodb:mongodb:7.0:*:*:*:*:*:*:*', 'MongoDB'],
    ['cpe:2.3:a:microsoft:internet_information_services:10:*:*:*:*:*:*:*', 'IIS'],
    ['cpe:2.3:a:nodejs:node.js:22:*:*:*:*:*:*:*', 'Node.js']
  ];
  for (const [cpe, name] of cases) assert.equal(cpeMatchesComponent(cpe, component(name)), true, name);
});

test('does not confuse Apache HTTP Server with other Apache projects', () => {
  assert.equal(cpeMatchesComponent('cpe:2.3:a:apache:tomcat:10:*:*:*:*:*:*:*', component('Apache HTTP Server')), false);
  assert.equal(cpeMatchesComponent('cpe:2.3:a:apache:http_server:2.4:*:*:*:*:*:*:*', component('Apache HTTP Server')), true);
});

test('does not accept a matching product under an unexpected vendor', () => {
  assert.equal(cpeMatchesComponent('cpe:2.3:a:attacker:php:8.2:*:*:*:*:*:*:*', component('PHP')), false);
});

test('uses the OS CPE part for components explicitly classified as operating systems', () => {
  const os = { name: 'custom linux', type: 'os' };
  assert.equal(cpeMatchesComponent('cpe:2.3:o:custom_linux:custom_linux:1:*:*:*:*:*:*:*', os), true);
  assert.equal(cpeMatchesComponent('cpe:2.3:a:custom_linux:custom_linux:1:*:*:*:*:*:*:*', os), false);
});

test('Debian CPE matching is restricted to the operating-system part', () => {
  const debian = { name: 'Debian' };
  assert.equal(cpeMatchesComponent('cpe:2.3:o:debian:debian_linux:12:*:*:*:*:*:*:*', debian), true);
  assert.equal(cpeMatchesComponent('cpe:2.3:a:debian:debian_linux:12:*:*:*:*:*:*:*', debian), false);
});

test('matches verified operating-system CPE vendor/product pairs', () => {
  const cases = [
    ['cpe:2.3:o:redhat:enterprise_linux:9.0:*:*:*:*:*:*:*', 'Red Hat Enterprise Linux'],
    ['cpe:2.3:o:fedoraproject:fedora:40:*:*:*:*:*:*:*', 'Fedora'],
    ['cpe:2.3:o:alpinelinux:alpine_linux:3.20:*:*:*:*:*:*:*', 'Alpine Linux'],
    ['cpe:2.3:o:microsoft:windows_server_2022:10.0.20348.4467:*:*:*:datacenter:*:x64:*', 'Windows Server 2022']
  ];
  for (const [cpe, name] of cases) {
    assert.equal(cpeMatchesComponent(cpe, { name, type: 'os' }), true, name);
  }
});

test('does not match OS CPEs to similarly named application CPEs', () => {
  assert.equal(cpeMatchesComponent('cpe:2.3:a:alpinelinux:alpine_linux:3.20:*:*:*:*:*:*:*', { name: 'Alpine Linux', type: 'os' }), false);
  assert.equal(cpeMatchesComponent('cpe:2.3:a:redhat:enterprise_linux:9.0:*:*:*:*:*:*:*', { name: 'Red Hat Enterprise Linux', type: 'os' }), false);
  assert.equal(cpeMatchesComponent('cpe:2.3:o:microsoft:windows_server_2022:10.0.20348.4467:*:*:*:datacenter:*:x64:*', { name: 'Windows Server', type: 'os' }), false);
});
