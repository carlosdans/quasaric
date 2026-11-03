import test from 'node:test';
import assert from 'node:assert/strict';
import { compareVersionForComponent, normalizeEcosystem, classifyVersionRange } from './universalVersions.js';

const component = (name, vendor = '') => ({ name, vendor });

test('detects Linux package ecosystems without conflating their version schemes', () => {
  assert.equal(normalizeEcosystem(component('nginx', 'Ubuntu 24.04')), 'deb');
  assert.equal(normalizeEcosystem(component('openssl', 'Red Hat Enterprise Linux 9')), 'rpm');
  assert.equal(normalizeEcosystem(component('Windows Server 2022')), 'windows');
  assert.equal(normalizeEcosystem({ purl: 'pkg:pypi/requests@2.31.0' }), 'pypi');
  assert.equal(normalizeEcosystem({ purl: 'pkg:npm/lodash@4.17.21' }), 'npm');
});

test('uses dpkg ordering for Debian and Ubuntu revisions and epochs', () => {
  const ubuntu = component('openssl', 'Ubuntu 24.04');
  assert.equal(compareVersionForComponent('3.0.13-0ubuntu3.1', '3.0.13-0ubuntu3.2', ubuntu), -1);
  assert.equal(compareVersionForComponent('2:1.0-1', '1:9.9-9', component('debian')), 1);
});

test('uses RPM EVR ordering including epoch, release, tilde and caret', () => {
  const rhel = component('openssl', 'RHEL 9');
  assert.equal(compareVersionForComponent('1:3.0.7-25.el9', '1:3.0.7-26.el9', rhel), -1);
  assert.equal(compareVersionForComponent('1.0~rc1-1', '1.0-1', rhel), -1);
  assert.equal(compareVersionForComponent('1.0-1', '1.0^git1-1', rhel), -1);
  assert.equal(compareVersionForComponent('2:1.0-1', '1:9.9-9', rhel), 1);
  assert.equal(compareVersionForComponent('1.0^git1-1', '1.0-1', rhel), 1);
  assert.equal(compareVersionForComponent('1.0^git1-1', '1.0.1-1', rhel), -1);
  assert.equal(compareVersionForComponent('1.0-1.el9_4', '1.0-1.el9_10', rhel), -1);
  assert.equal(compareVersionForComponent('1.0-1', '1.0-1.0', rhel), -1);
  assert.equal(compareVersionForComponent('1.0-1', '0:1.0-1', rhel), 0);
  assert.equal(compareVersionForComponent('1.0-β', '1.0-1', rhel), null);
  assert.equal(compareVersionForComponent('1.0!-1', '1.0-1', rhel), null);
});

test('uses PEP 440 ordering for Python pre, final, post and dev releases', () => {
  const python = component('Python', 'PyPI');
  assert.equal(compareVersionForComponent('1.0a1', '1.0b1', python), -1);
  assert.equal(compareVersionForComponent('1.0rc1', '1.0', python), -1);
  assert.equal(compareVersionForComponent('1.0', '1.0.post1', python), -1);
  assert.equal(compareVersionForComponent('1.0.dev1', '1.0a1', python), -1);
  assert.equal(compareVersionForComponent('1.0+ubuntu.1', '1.0', python), 1);
  assert.equal(compareVersionForComponent('2!1.0', '1!9.9', python), 1);
});

test('accepts PEP 440 prerelease, postrelease and dev aliases with omitted numbers', () => {
  const python = component('Python', 'PyPI');
  assert.equal(compareVersionForComponent('1.0a', '1.0a0', python), 0);
  assert.equal(compareVersionForComponent('1.0alpha', '1.0a0', python), 0);
  assert.equal(compareVersionForComponent('1.0b', '1.0b0', python), 0);
  assert.equal(compareVersionForComponent('1.0rc', '1.0rc0', python), 0);
  assert.equal(compareVersionForComponent('1.0.post', '1.0.post0', python), 0);
  assert.equal(compareVersionForComponent('1.0rev', '1.0.post0', python), 0);
  assert.equal(compareVersionForComponent('1.0.dev', '1.0.dev0', python), 0);
  assert.equal(compareVersionForComponent('1.0.post1.dev', '1.0.post1.dev0', python), 0);
  assert.equal(compareVersionForComponent('1.0.dev', '1.0a0', python), -1);
  assert.equal(compareVersionForComponent('1.0a', '1.0', python), -1);
  assert.equal(compareVersionForComponent('1.0', '1.0.post', python), -1);
});

test('uses SemVer prerelease ordering for npm and Composer packages', () => {
  assert.equal(compareVersionForComponent('1.0.0-alpha.2', '1.0.0-alpha.10', { purl: 'pkg:npm/example@1.0.0' }), -1);
  assert.equal(compareVersionForComponent('1.0.0-rc.1', '1.0.0', component('php', 'Composer')), -1);
  assert.equal(compareVersionForComponent('1.0.0+build.1', '1.0.0+build.2', { purl: 'pkg:npm/example@1.0.0' }), 0);
  assert.equal(compareVersionForComponent('01.0.0', '1.0.0', { purl: 'pkg:npm/example@1.0.0' }), null);
});

test('compares arbitrarily large SemVer core identifiers without Number precision loss', () => {
  const npm = { purl: 'pkg:npm/example@1.0.0' };
  assert.equal(compareVersionForComponent(
    '9007199254740992.0.0', '9007199254740993.0.0', npm
  ), -1);
  assert.equal(compareVersionForComponent(
    '18446744073709551616.0.0', '18446744073709551615.0.0', npm
  ), 1);
  assert.equal(compareVersionForComponent(
    '1.9007199254740993.0', '1.9007199254740992.0', npm
  ), 1);
});

test('orders Windows builds and UBR tuples numerically', () => {
  const windows = component('Windows Server 2022');
  assert.equal(compareVersionForComponent('10.0.20348.2159', '10.0.20348.2160', windows), -1);
  assert.equal(compareVersionForComponent('10.0.20348', '10.0.20348.0', windows), 0);
});

test('does not guess when a vendor-specific version cannot be parsed', () => {
  assert.equal(compareVersionForComponent('3.0.7-custom', '3.0.7', component('unknown')), null);
  assert.equal(compareVersionForComponent('3.0.7-', '3.0.7-2.el9', component('RHEL 9')), null);
});

test('classifies explicit range endpoints with ecosystem-aware ordering', () => {
  const rhel = component('openssl', 'RHEL 9');
  assert.equal(classifyVersionRange('1.0-2.el9', { versionStartIncluding: '1.0-1.el9', versionEndExcluding: '1.0-3.el9' }, rhel).status, 'affected_candidate');
  assert.equal(classifyVersionRange('1.0-3.el9', { versionStartIncluding: '1.0-1.el9', versionEndExcluding: '1.0-3.el9' }, rhel).status, 'not_affected');
  assert.equal(classifyVersionRange('1.0-', { versionEndIncluding: '1.0-3.el9' }, rhel).status, 'needs_review');
  assert.equal(classifyVersionRange('', { versionEndIncluding: '2.0' }, rhel).status, 'version_missing');
});


test('matches canonical Debian ordering for repeated tildes and punctuation', () => {
  const debian = component('nginx', 'Debian 12');
  const ordered = ['1.0~~', '1.0~', '1.0', '1.0-1', '1.0-1+b1'];
  for (let index = 0; index < ordered.length - 1; index++) {
    assert.equal(compareVersionForComponent(ordered[index], ordered[index + 1], debian), -1,
      `expected ${ordered[index]} < ${ordered[index + 1]}`);
  }
  
});

test('checks RPM segment type ordering and caret placement around release boundaries', () => {
  const rpm = component('kernel', 'Fedora');
  const ordered = ['1.0~rc1', '1.0', '1.0^git1', '1.0.1'];
  for (let index = 0; index < ordered.length - 1; index++) {
    assert.equal(compareVersionForComponent(ordered[index], ordered[index + 1], rpm), -1,
      `expected ${ordered[index]} < ${ordered[index + 1]}`);
  }
  assert.equal(compareVersionForComponent('1.0a', '1.0.1', rpm), -1);
  assert.equal(compareVersionForComponent('1.0.1', '1.0a', rpm), 1);
});

test('accepts PEP 440 leading-v and implicit hyphen post-release forms', () => {
  const python = component('Python', 'PyPI');
  assert.equal(compareVersionForComponent('v1.0', '1.0', python), 0);
  assert.equal(compareVersionForComponent('1.0-1', '1.0.post1', python), 0);
  assert.equal(compareVersionForComponent('1.0-1.dev2', '1.0.post1', python), -1);
  assert.equal(compareVersionForComponent('1.0-2', '1.0-1', python), 1);
  assert.equal(classifyVersionRange('1.0-1', { versionEndIncluding: '1.0.post1' }, python).status, 'affected_candidate');
});

test('covers upstream RPM separator, tilde and caret ordering cases', () => {
  const rpm = component('kernel', 'Fedora');
  const equalPairs = [
    ['1.0', '1+0'],
    ['1.0', '1+.+0'],
    ['1.0^', '1.0^'],
    ['1.0~rc1^git1', '1.0~rc1^git1']
  ];
  for (const [left, right] of equalPairs) {
    assert.equal(compareVersionForComponent(left, right, rpm), 0, `${left} == ${right}`);
  }
  const orderedPairs = [
    ['1.0', '1.0^'],
    ['1.0', '1.0^git1'],
    ['1.0^git1', '1.0.1'],
    ['1.0~rc1', '1.0~rc2'],
    ['1.0~rc1', '1.0'],
    ['1.0~rc1', '1.0~rc1^git1'],
    ['1.0^git1~pre', '1.0^git1']
  ];
  for (const [older, newer] of orderedPairs) {
    assert.equal(compareVersionForComponent(older, newer, rpm), -1, `${older} < ${newer}`);
    assert.equal(compareVersionForComponent(newer, older, rpm), 1, `${newer} > ${older}`);
  }
});

test('checks the PEP 440 public release ordering sequence', () => {
  const python = component('Python', 'PyPI');
  const ordered = [
    '1.0.dev0', '1.0a0.dev0', '1.0a0', '1.0a1.dev0', '1.0a1',
    '1.0b1', '1.0rc1.dev0', '1.0rc1', '1.0', '1.0.post0.dev0',
    '1.0.post0', '1.0.post1.dev0', '1.0.post1'
  ];
  for (let index = 0; index < ordered.length - 1; index++) {
    assert.equal(compareVersionForComponent(ordered[index], ordered[index + 1], python), -1,
      `expected ${ordered[index]} < ${ordered[index + 1]}`);
  }
  assert.equal(compareVersionForComponent('1.0-foo', '1.0', python), null);
});

test('checks SemVer numeric and lexical prerelease identifier precedence', () => {
  const npm = { purl: 'pkg:npm/example@1.0.0' };
  const ordered = [
    '1.0.0-alpha',
    '1.0.0-alpha.1',
    '1.0.0-alpha.beta',
    '1.0.0-beta',
    '1.0.0-beta.2',
    '1.0.0-beta.11',
    '1.0.0-rc.1',
    '1.0.0'
  ];
  for (let index = 0; index < ordered.length - 1; index++) {
    assert.equal(compareVersionForComponent(ordered[index], ordered[index + 1], npm), -1,
      `expected ${ordered[index]} < ${ordered[index + 1]}`);
  }
  assert.equal(compareVersionForComponent('1.0.0+build.7', '1.0.0+build.8', npm), 0);
  assert.equal(compareVersionForComponent('1.0.0-01', '1.0.0', npm), null);
});

test('version comparator results are antisymmetric across representative ecosystem pairs', () => {
  const cases = [
    [component('nginx', 'Debian 12'), '1.0~rc1-1', '1.0-1'],
    [component('openssl', 'RHEL 9'), '1:3.0.7-25.el9', '1:3.0.7-26.el9'],
    [component('Python', 'PyPI'), '2.0rc1', '2.0'],
    [{ purl: 'pkg:npm/example@1.0.0' }, '1.0.0-alpha.2', '1.0.0-alpha.10'],
    [component('Windows Server 2022'), '10.0.20348.2159', '10.0.20348.2160']
  ];
  for (const [target, older, newer] of cases) {
    assert.equal(compareVersionForComponent(older, newer, target), -1);
    assert.equal(compareVersionForComponent(newer, older, target), 1);
    assert.equal(compareVersionForComponent(older, older, target), 0);
  }
});


test('prefers explicit PURL package type over unrelated package-name keywords', () => {
  const npmPythonNamed = { name: 'python-shell', purl: 'pkg:npm/python-shell@1.0.0' };
  const pypiNodeNamed = { name: 'nodejs', purl: 'pkg:pypi/nodejs@1.0.0' };
  const debPythonNamed = { name: 'python3', purl: 'pkg:deb/debian/python3@3.12.0' };

  assert.equal(normalizeEcosystem(npmPythonNamed), 'npm');
  assert.equal(normalizeEcosystem(pypiNodeNamed), 'pypi');
  assert.equal(normalizeEcosystem(debPythonNamed), 'deb');
  assert.equal(compareVersionForComponent('1.0.0-rc.1', '1.0.0', npmPythonNamed), -1);
  assert.equal(compareVersionForComponent('1.0rc1', '1.0', pypiNodeNamed), -1);
});

test('uses declared platform metadata when the PURL type is generic or absent', () => {
  assert.equal(normalizeEcosystem({ purl: 'pkg:generic/openssl@3.0', ecosystem: 'Ubuntu 24.04' }), 'deb');
  assert.equal(normalizeEcosystem({ vendor: 'Red Hat Enterprise Linux 9' }), 'rpm');
});


test('does not infer an ecosystem from an ambiguous package name', () => {
  assert.equal(normalizeEcosystem({ name: 'python-shell', purl: 'pkg:generic/python-shell@1.0.0' }), 'generic');
  assert.equal(normalizeEcosystem({ name: 'nodejs-wrapper' }), '');
});


test('uses Alpine APK ordering for epochs, prerelease suffixes and package revisions', () => {
  const alpine = { purl: 'pkg:apk/alpine/openssl@3.1.4-r0' };
  assert.equal(normalizeEcosystem(alpine), 'apk');
  assert.equal(compareVersionForComponent('3.1.4_rc1-r0', '3.1.4-r0', alpine), -1);
  assert.equal(compareVersionForComponent('3.1.4-r0', '3.1.4-r1', alpine), -1);
  assert.equal(compareVersionForComponent('3.1.4_alpha2-r0', '3.1.4_alpha10-r0', alpine), -1);
  assert.equal(compareVersionForComponent('2:1.0-r0', '1:9.9-r99', alpine), 1);
  assert.equal(compareVersionForComponent('1.2.3_git20240101-r0', '1.2.3-r0', alpine), 1);
  assert.equal(compareVersionForComponent('1.2.3-r0', '1.2.3-r0', alpine), 0);
});

test('does not guess unsupported Alpine APK version syntax', () => {
  const alpine = { vendor: 'Alpine Linux' };
  assert.equal(normalizeEcosystem(alpine), 'apk');
  assert.equal(normalizeEcosystem({ purl: 'pkg:apk/alpine/busybox@1.36.1-r2' }), 'apk');
  assert.equal(compareVersionForComponent('1.2.3-custom-r0', '1.2.3-r1', alpine), null);
  assert.equal(compareVersionForComponent('1.2.3-r', '1.2.3-r1', alpine), null);
});
