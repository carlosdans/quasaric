import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyCpeApplicability, cpeMatchesComponent } from './correlation.js';

const component = name => ({ name });

test('matches exact CPE vendor/product pairs for supported technologies', () => {
  const cases = [
    ['cpe:2.3:a:php:php:8.2:*:*:*:*:*:*:*', 'PHP'],
    ['cpe:2.3:a:openssl:openssl:3.0.20:*:*:*:*:*:*:*', 'OpenSSL'],
    ['cpe:2.3:a:php:php:8.2:*:*:*:*:*:*:*', 'PHP-FPM'],
    ['cpe:2.3:a:python:python:3.12:*:*:*:*:*:*:*', 'Python'],
    ['cpe:2.3:a:postgresql:postgresql:16:*:*:*:*:*:*:*', 'PostgreSQL'],
    ['cpe:2.3:a:mongodb:mongodb:7.0:*:*:*:*:*:*:*', 'MongoDB'],
    ['cpe:2.3:a:microsoft:internet_information_services:10:*:*:*:*:*:*:*', 'IIS'],
    ['cpe:2.3:a:nodejs:node.js:22:*:*:*:*:*:*:*', 'Node.js'],
    ['cpe:2.3:a:nodejs:node.js:22:*:*:*:*:*:*:*', 'nodejs'],
    ['cpe:2.3:a:nodejs:node.js:22:*:*:*:*:*:*:*', 'Node JS']
  ];
  for (const [cpe, name] of cases) assert.equal(cpeMatchesComponent(cpe, component(name)), true, name);
});


test('nodejs inventory alias matches only the explicit Node.js CPE identity', () => {
  assert.equal(cpeMatchesComponent('cpe:2.3:a:nodejs:node.js:22:*:*:*:*:*:*:*', component('nodejs')), true);
  assert.equal(cpeMatchesComponent('cpe:2.3:a:attacker:node.js:22:*:*:*:*:*:*:*', component('nodejs')), false);
});

test('Node JS inventory alias matches only the explicit Node.js CPE identity', () => {
  assert.equal(cpeMatchesComponent('cpe:2.3:a:nodejs:node.js:22:*:*:*:*:*:*:*', component('Node JS')), true);
  assert.equal(cpeMatchesComponent('cpe:2.3:a:attacker:node.js:22:*:*:*:*:*:*:*', component('Node JS')), false);
});

test('apache2 package alias matches Apache HTTP Server but not other vendors or Apache projects', () => {
  assert.equal(cpeMatchesComponent('cpe:2.3:a:apache:http_server:2.4:*:*:*:*:*:*:*', component('apache2')), true);
  assert.equal(cpeMatchesComponent('cpe:2.3:a:attacker:http_server:2.4:*:*:*:*:*:*:*', component('apache2')), false);
  assert.equal(cpeMatchesComponent('cpe:2.3:a:apache:tomcat:10:*:*:*:*:*:*:*', component('apache2')), false);
});

test('httpd alias matches Apache HTTP Server but not other vendors or Apache projects', () => {
  assert.equal(cpeMatchesComponent('cpe:2.3:a:apache:http_server:2.4:*:*:*:*:*:*:*', component('httpd')), true);
  assert.equal(cpeMatchesComponent('cpe:2.3:a:attacker:http_server:2.4:*:*:*:*:*:*:*', component('httpd')), false);
  assert.equal(cpeMatchesComponent('cpe:2.3:a:apache:tomcat:10:*:*:*:*:*:*:*', component('httpd')), false);
});

test('does not confuse Apache HTTP Server with other Apache projects', () => {
  assert.equal(cpeMatchesComponent('cpe:2.3:a:apache:tomcat:10:*:*:*:*:*:*:*', component('Apache HTTP Server')), false);
  assert.equal(cpeMatchesComponent('cpe:2.3:a:apache:http_server:2.4:*:*:*:*:*:*:*', component('Apache HTTP Server')), true);
});

test('preserves escaped underscores as literal characters in CPE product fields', () => {
  const escaped = 'cpe:2.3:o:resf:rocky\\_linux:8.4:*:*:*:*:*:*:*';
  const unescaped = 'cpe:2.3:o:resf:rocky_linux:8.4:*:*:*:*:*:*:*';
  const rocky = { name: 'Rocky Linux', type: 'os' };
  assert.equal(cpeMatchesComponent(escaped, rocky), false);
  assert.equal(cpeMatchesComponent(unescaped, rocky), true);
});

test('OpenSSL matches only its explicit NVD vendor/product identity', () => {
  assert.equal(cpeMatchesComponent('cpe:2.3:a:openssl:openssl:3.0.20:*:*:*:*:*:*:*', component('OpenSSL')), true);
  assert.equal(cpeMatchesComponent('cpe:2.3:a:attacker:openssl:3.0.20:*:*:*:*:*:*:*', component('OpenSSL')), false);
});

test('does not accept a matching product under an unexpected vendor', () => {
  assert.equal(cpeMatchesComponent('cpe:2.3:a:attacker:php:8.2:*:*:*:*:*:*:*', component('PHP')), false);
});

test('does not infer a CPE vendor/product pair for an unknown operating system label', () => {
  const os = { name: 'custom linux', type: 'os' };
  assert.equal(cpeMatchesComponent('cpe:2.3:o:custom_linux:custom_linux:1:*:*:*:*:*:*:*', os), false);
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
    ['cpe:2.3:o:microsoft:windows_server_2019:10.0.17763.7919:*:*:*:*:*:x64:*', { name: 'Windows Server 2019', type: 'os', architecture: 'x64' }],
    ['cpe:2.3:o:microsoft:windows_server_2022:10.0.20348.4467:*:*:*:datacenter:*:x64:*', { name: 'Windows Server 2022', type: 'os', swEdition: 'datacenter', architecture: 'x64' }],
    ['cpe:2.3:o:microsoft:windows_server_2025:10.0.26100.4946:*:*:*:*:*:x64:*', { name: 'Windows Server 2025', type: 'os', architecture: 'x64' }],
    ['cpe:2.3:o:almalinux:almalinux:9.5:*:*:*:*:*:*:*', 'AlmaLinux'],
    ['cpe:2.3:o:resf:rocky_linux:8.4:*:*:*:*:*:*:*', 'Rocky Linux'],
    ['cpe:2.3:o:suse:linux_enterprise_server:15:sp2:*:*:*:*:*:*', { name: 'SUSE Linux Enterprise Server', type: 'os', update: 'sp2' }],
    ['cpe:2.3:o:suse:linux_enterprise_server:15:*:*:*:*:*:*:*', 'SLES']
  ];
  for (const [cpe, identity] of cases) {
    const component = typeof identity === 'string' ? { name: identity, type: 'os' } : identity;
    assert.equal(cpeMatchesComponent(cpe, component), true, component.name);
  }
});

test('does not match OS CPEs to similarly named application CPEs', () => {
  assert.equal(cpeMatchesComponent('cpe:2.3:a:alpinelinux:alpine_linux:3.20:*:*:*:*:*:*:*', { name: 'Alpine Linux', type: 'os' }), false);
  assert.equal(cpeMatchesComponent('cpe:2.3:a:redhat:enterprise_linux:9.0:*:*:*:*:*:*:*', { name: 'Red Hat Enterprise Linux', type: 'os' }), false);
  assert.equal(cpeMatchesComponent('cpe:2.3:o:microsoft:windows_server_2022:10.0.20348.4467:*:*:*:datacenter:*:x64:*', { name: 'Windows Server', type: 'os' }), false);
});

test('uses a valid declared CPE identity for otherwise unsupported component labels', () => {
  const custom = { name: 'Acme Gateway', type: 'web', cpe: 'cpe:2.3:a:acme:gateway:*:*:*:*:*:*:*:*' };
  assert.equal(cpeMatchesComponent('cpe:2.3:a:acme:gateway:4.2:*:*:*:*:*:*:*', custom), true);
  assert.equal(cpeMatchesComponent('cpe:2.3:a:attacker:gateway:4.2:*:*:*:*:*:*:*', custom), false);
  assert.equal(cpeMatchesComponent('cpe:2.3:a:acme:other:4.2:*:*:*:*:*:*:*', custom), false);
});

test('rejects malformed declared CPE identities instead of falling back to a guessed name', () => {
  const custom = { name: 'Acme Gateway', type: 'web', cpe: 'cpe:2.3:a:acme:gateway' };
  assert.equal(cpeMatchesComponent('cpe:2.3:a:acme:gateway:4.2:*:*:*:*:*:*:*', custom), false);
});


test('matches the official Apache Log4j CPE only to the vulnerable core artifact', () => {
  // NVD CVE-2021-44228 identifies cpe:2.3:a:apache:log4j as the product.
  const cpe = 'cpe:2.3:a:apache:log4j:2.14.1:*:*:*:*:*:*:*';
  assert.equal(cpeMatchesComponent(cpe, component('log4j-core')), true);
  assert.equal(cpeMatchesComponent(cpe, component('Log4j Core')), true);
  assert.equal(cpeMatchesComponent(cpe, component('Log4j')), false);
  assert.equal(cpeMatchesComponent(cpe, component('log4j-api')), false);
  assert.equal(cpeMatchesComponent(
    'cpe:2.3:a:attacker:log4j:2.14.1:*:*:*:*:*:*:*',
    component('log4j-core')
  ), false);
});


test('requires exact inventory metadata for constrained CPE qualifiers', () => {
  const windows = 'cpe:2.3:o:microsoft:windows_server_2022:10.0.20348.4467:*:*:*:datacenter:*:x64:*';
  assert.equal(cpeMatchesComponent(windows, {
    name: 'Windows Server 2022', type: 'os', version: '10.0.20348.4467'
  }), true, 'product identity remains a candidate when edition metadata is unknown');
  assert.equal(cpeMatchesComponent(windows, {
    name: 'Windows Server 2022', type: 'os', version: '10.0.20348.4467', architecture: 'x64'
  }), true, 'architecture alone does not resolve the missing software edition');
  assert.equal(cpeMatchesComponent(windows, {
    name: 'Windows Server 2022', type: 'os', version: '10.0.20348.4467',
    swEdition: 'datacenter', architecture: 'x64'
  }), true);
  assert.equal(cpeMatchesComponent(windows, {
    name: 'Windows Server 2022', type: 'os', version: '10.0.20348.4467',
    swEdition: 'datacenter', architecture: 'arm64'
  }), false);

  const suseSp2 = 'cpe:2.3:o:suse:linux_enterprise_server:15:sp2:*:*:*:*:*:*';
  assert.equal(cpeMatchesComponent(suseSp2, {
    name: 'SUSE Linux Enterprise Server', type: 'os', version: '15'
  }), true, 'product identity remains a candidate when update metadata is unknown');
  assert.equal(cpeMatchesComponent(suseSp2, {
    name: 'SUSE Linux Enterprise Server', type: 'os', version: '15', update: 'sp2'
  }), true);
});

test('keeps qualified NVD CPE evidence in review when software-edition metadata is absent', () => {
  const result = classifyCpeApplicability([{
    criteria: 'cpe:2.3:o:microsoft:windows_server_2022:10.0.20348.4467:*:*:*:datacenter:*:x64:*',
    vulnerable: true
  }], {
    name: 'Windows Server 2022',
    type: 'os',
    version: '10.0.20348.4467',
    architecture: 'x64'
  });
  assert.equal(result.status, 'needs_review');
});


test('uses a declared CPE to verify qualifiers and cross-checks supplied architecture', () => {
  const criteria = 'cpe:2.3:o:microsoft:windows_server_2022:10.0.20348.4467:*:*:*:datacenter:*:x64:*';
  const declared = {
    name: 'Windows Server 2022',
    type: 'os',
    version: '10.0.20348.4467',
    cpe: 'cpe:2.3:o:microsoft:windows_server_2022:*:*:*:datacenter:*:x64:*'
  };
  assert.equal(cpeMatchesComponent(criteria, declared), true);
  assert.equal(classifyCpeApplicability([{ criteria, vulnerable: true }], declared).status, 'possible');
  assert.equal(classifyCpeApplicability([{ criteria, vulnerable: true }], {
    ...declared, architecture: 'arm64'
  }).status, 'needs_review');
});
