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

test('uses SemVer prerelease ordering for npm and Composer packages', () => {
  assert.equal(compareVersionForComponent('1.0.0-alpha.2', '1.0.0-alpha.10', { purl: 'pkg:npm/example@1.0.0' }), -1);
  assert.equal(compareVersionForComponent('1.0.0-rc.1', '1.0.0', component('php', 'Composer')), -1);
  assert.equal(compareVersionForComponent('1.0.0+build.1', '1.0.0+build.2', { purl: 'pkg:npm/example@1.0.0' }), 0);
  assert.equal(compareVersionForComponent('01.0.0', '1.0.0', { purl: 'pkg:npm/example@1.0.0' }), null);
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
