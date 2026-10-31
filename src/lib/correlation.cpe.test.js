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
