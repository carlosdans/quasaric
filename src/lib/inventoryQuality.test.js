import test from 'node:test';
import assert from 'node:assert/strict';
import { inspectInventory } from './inventoryQuality.js';

test('flags missing binary versions and incomplete source package versions', () => {
  const result = inspectInventory([
    { id: 'a', name: 'Ubuntu' },
    { id: 'b', name: 'openssl-libs', sourcePackage: 'openssl' },
    { id: 'c', name: 'nginx', sourcePackage: 'nginx', sourceVersion: '1.26-1' }
  ]);
  assert.deepEqual(result.missingVersion, [{ id: 'a', name: 'Ubuntu' }, { id: 'b', name: 'openssl-libs' }, { id: 'c', name: 'nginx' }]);
  assert.deepEqual(result.missingSourceVersion, [{ id: 'b', name: 'openssl-libs', sourcePackage: 'openssl' }]);
  assert.deepEqual(result.duplicates, []);
});
test('detects normalized duplicates',()=>{
  const r=inspectInventory([{id:'a',name:'NGINX',vendor:' F5 ',version:'1.25.0'},{id:'b',name:' nginx ',vendor:'f5',version:' 1.25.0 '}]);
  assert.deepEqual(r.duplicates,[{id:'b',name:' nginx ',firstIndex:1,row:2}]);
});
test('keeps distinct versions and vendors separate',()=>{
  assert.deepEqual(inspectInventory([{name:'OpenSSL',vendor:'OpenSSL',version:'3.0.1'},{name:'OpenSSL',vendor:'OpenSSL',version:'3.0.2'},{name:'OpenSSL',vendor:'Ubuntu',version:'3.0.1'}]).duplicates,[]);
});
test('handles empty inventories and missing names',()=>{
  assert.deepEqual(inspectInventory([]),{missingVersion:[],missingSourceVersion:[],invalidPurls:[],invalidCpes:[],sourceVersionWithoutPackage:[],purlVersionMismatches:[],sourcePurlVersionMismatches:[],sourcePurlNameMismatches:[],cpeVersionMismatches:[],identifierConflicts:[],duplicates:[]});
  assert.deepEqual(inspectInventory([{id:'a',version:'1.0'}]).duplicates,[]);
});
test('does not report false duplicates when metadata contains separators',()=>{
  const result=inspectInventory([
    {id:'a',name:'service|vendor',vendor:'team',version:'1'},
    {id:'b',name:'service',vendor:'vendor|team',version:'1'}
  ]);
  assert.deepEqual(result.duplicates,[]);
});


test('does not mark distinct architectures, ecosystems, PURLs or CPEs as duplicates', () => {
  const items = [
    { id: 'a', name: 'openssl', type: 'library', vendor: 'Ubuntu', ecosystem: 'Ubuntu:24.04:LTS', version: '3.0.2', architecture: 'amd64', purl: 'pkg:deb/ubuntu/openssl@3.0.2' },
    { id: 'b', name: 'openssl', type: 'library', vendor: 'Ubuntu', ecosystem: 'Ubuntu:24.04:LTS', version: '3.0.2', architecture: 'arm64', purl: 'pkg:deb/ubuntu/openssl@3.0.2?arch=arm64' },
    { id: 'c', name: 'openssl', type: 'library', vendor: 'Debian', ecosystem: 'Debian:12', version: '3.0.2', architecture: 'amd64', purl: 'pkg:deb/debian/openssl@3.0.2' },
    { id: 'd', name: 'openssl', type: 'library', vendor: 'Ubuntu', ecosystem: 'Ubuntu:24.04:LTS', version: '3.0.2', architecture: 'amd64', purl: 'pkg:deb/ubuntu/openssl@3.0.2', cpe: 'cpe:2.3:a:openssl:openssl:3.0.2:*:*:*:*:*:*:*' }
  ];
  assert.deepEqual(inspectInventory(items).duplicates, []);
});

test('does not guess duplicates when installed versions are missing', () => {
  const result = inspectInventory([
    { id: 'a', name: 'nginx' },
    { id: 'b', name: 'nginx' }
  ]);
  assert.deepEqual(result.missingVersion, [
    { id: 'a', name: 'nginx' }, { id: 'b', name: 'nginx' }
  ]);
  assert.deepEqual(result.duplicates, []);
});

test('still detects exact package duplicates when all identity metadata matches', () => {
  const result = inspectInventory([
    { id: 'a', name: 'openssl-libs', type: 'library', vendor: 'Rocky', ecosystem: 'Rocky Linux', version: '3.0.7-1', architecture: 'x86_64', sourcePackage: 'openssl', sourceVersion: '3.0.7-1', purl: 'pkg:rpm/openssl-libs@3.0.7-1?arch=x86_64' },
    { id: 'b', name: ' OpenSSL-Libs ', type: 'library', vendor: 'rocky', ecosystem: 'Rocky Linux', version: ' 3.0.7-1 ', architecture: 'X86_64', sourcePackage: 'OpenSSL', sourceVersion: '3.0.7-1', purl: 'pkg:rpm/openssl-libs@3.0.7-1?arch=x86_64' }
  ]);
  assert.deepEqual(result.duplicates, [
    { id: 'b', name: ' OpenSSL-Libs ', firstIndex: 1, row: 2 }
  ]);
});

test('flags malformed CPEs and source versions without a source package', () => {
  const result = inspectInventory([
    { id: 'bad-cpe', name: 'nginx', version: '1.26', cpe: 'cpe:2.3:a:nginx' },
    { id: 'source-version-only', name: 'openssl-libs', version: '3.0.2', sourceVersion: '3.0.2-1' },
    { id: 'valid-cpe', name: 'openssl', version: '3.0.2', cpe: 'cpe:2.3:a:openssl:openssl:3.0.2:*:*:*:*:*:*:*' }
  ]);
  assert.deepEqual(result.invalidCpes, [{ id: 'bad-cpe', name: 'nginx' }]);
  assert.deepEqual(result.sourceVersionWithoutPackage, [{ id: 'source-version-only', name: 'openssl-libs' }]);
});

test('does not warn about absent optional CPE or source metadata', () => {
  const result = inspectInventory([{ id: 'plain', name: 'nginx', version: '1.26' }]);
  assert.deepEqual(result.invalidCpes, []);
  assert.deepEqual(result.sourceVersionWithoutPackage, []);
});


test('does not collapse case-sensitive package identifiers when checking duplicates', () => {
  const result = inspectInventory([
    { id: 'a', name: 'Library', type: 'library', version: '1.0', purl: 'pkg:maven/com.Example/Library@1.0' },
    { id: 'b', name: 'Library', type: 'library', version: '1.0', purl: 'pkg:maven/com.example/Library@1.0' },
    { id: 'c', name: 'Library', type: 'library', version: '1.0', sourcePurl: 'pkg:maven/com.Example/source@1.0' },
    { id: 'd', name: 'Library', type: 'library', version: '1.0', sourcePurl: 'pkg:maven/com.example/source@1.0' }
  ]);
  assert.deepEqual(result.duplicates, []);
});


test('flags contradictory architecture metadata across inventory, PURL and CPE', () => {
  const result = inspectInventory([
    { id: 'conflict', name: 'openssl', version: '3.0.2', architecture: 'amd64', purl: 'pkg:deb/ubuntu/openssl@3.0.2?arch=arm64', cpe: 'cpe:2.3:a:openssl:openssl:3.0.2:*:*:*:*:*:x86_64:*' },
    { id: 'alias-match', name: 'nginx', version: '1.26', architecture: 'amd64', purl: 'pkg:deb/ubuntu/nginx@1.26?arch=x86_64' },
    { id: 'wildcard-cpe', name: 'curl', version: '8.0', architecture: 'aarch64', cpe: 'cpe:2.3:a:curl:curl:8.0:*:*:*:*:*:*:*' }
  ]);
  assert.equal(result.identifierConflicts.length, 1);
  assert.equal(result.identifierConflicts[0].id, 'conflict');
  assert.deepEqual(result.identifierConflicts[0].claims.map(claim => claim.source), ['inventory', 'PURL', 'CPE targetHw']);
});

test('does not infer architecture conflicts from missing or equivalent metadata', () => {
  const result = inspectInventory([
    { name: 'openssl', version: '3.0.2', architecture: 'arm64', purl: 'pkg:deb/ubuntu/openssl@3.0.2?arch=aarch64' },
    { name: 'nginx', version: '1.26', architecture: 'x86_64', cpe: 'cpe:2.3:a:nginx:nginx:1.26:*:*:*:*:*:amd64:*' }
  ]);
  assert.deepEqual(result.identifierConflicts, []);
});


test('flags declared component and source versions that disagree with valid PURL versions', () => {
  const result = inspectInventory([
    { id: 'binary', name: 'openssl', version: '3.0.2-0ubuntu1', purl: 'pkg:deb/ubuntu/openssl@3.0.2-0ubuntu2' },
    { id: 'source', name: 'openssl-libs', version: '3.0.2', sourcePackage: 'openssl', sourceVersion: '3.0.2-0ubuntu1', sourcePurl: 'pkg:deb/ubuntu/openssl@3.0.2-0ubuntu2' }
  ]);
  assert.deepEqual(result.purlVersionMismatches, [
    { id: 'binary', name: 'openssl', declaredVersion: '3.0.2-0ubuntu1', purlVersion: '3.0.2-0ubuntu2' }
  ]);
  assert.deepEqual(result.sourcePurlVersionMismatches, [
    { id: 'source', name: 'openssl-libs', declaredVersion: '3.0.2-0ubuntu1', purlVersion: '3.0.2-0ubuntu2' }
  ]);
});

test('does not infer version mismatches from absent, versionless or malformed PURLs', () => {
  const result = inspectInventory([
    { id: 'absent', name: 'nginx', version: '1.26' },
    { id: 'versionless', name: 'curl', version: '8.0', purl: 'pkg:generic/curl' },
    { id: 'malformed', name: 'openssl', version: '3.0.2', purl: 'pkg:deb/ubuntu/openssl@' },
    { id: 'source-versionless', name: 'libx', version: '1', sourceVersion: '2', sourcePackage: 'x', sourcePurl: 'pkg:deb/ubuntu/x' }
  ]);
  assert.deepEqual(result.purlVersionMismatches, []);
  assert.deepEqual(result.sourcePurlVersionMismatches, []);
  assert.deepEqual(result.invalidPurls, [
    { id: 'malformed', name: 'openssl', field: 'purl' }
  ]);
});


test('flags concrete CPE versions that differ from the declared inventory version', () => {
  const result = inspectInventory([
    { id: 'mismatch', name: 'openssl', version: '3.0.2-1', cpe: 'cpe:2.3:a:openssl:openssl:3.0.2:*:*:*:*:*:*:*' },
    { id: 'match', name: 'nginx', version: '1.26.2', cpe: 'cpe:2.3:a:nginx:nginx:1.26.2:*:*:*:*:*:*:*' }
  ]);
  assert.deepEqual(result.cpeVersionMismatches, [
    { id: 'mismatch', name: 'openssl', declaredVersion: '3.0.2-1', cpeVersion: '3.0.2' }
  ]);
});

test('does not compare wildcard, not-applicable, missing or malformed CPE versions', () => {
  const result = inspectInventory([
    { id: 'wildcard', name: 'openssl', version: '3.0.2', cpe: 'cpe:2.3:a:openssl:openssl:3.*:*:*:*:*:*:*:*' },
    { id: 'question', name: 'nginx', version: '1.26', cpe: 'cpe:2.3:a:nginx:nginx:1.2?:*:*:*:*:*:*:*' },
    { id: 'not-applicable', name: 'device', version: '1.0', cpe: 'cpe:2.3:h:vendor:device:-:*:*:*:*:*:*:*' },
    { id: 'missing', name: 'curl', version: '8.0' },
    { id: 'malformed', name: 'bad', version: '1.0', cpe: 'cpe:2.3:a:bad' }
  ]);
  assert.deepEqual(result.cpeVersionMismatches, []);
});


test('flags source package names that contradict their source PURL', () => {
  const result = inspectInventory([
    { id: 'wrong-simple', name: 'openssl-libs', sourcePackage: 'openssl', sourcePurl: 'pkg:rpm/openssl-compat@3.0.2' },
    { id: 'wrong-qualified', name: 'library', sourcePackage: 'com.example:source', sourcePurl: 'pkg:maven/com.example/other@1.0' },
    { id: 'simple-match', name: 'openssl-libs', sourcePackage: 'openssl', sourcePurl: 'pkg:rpm/openssl@3.0.2' },
    { id: 'qualified-match', name: 'library', sourcePackage: 'com.example/source', sourcePurl: 'pkg:maven/com.example/source@1.0' },
    { id: 'without-source-name', name: 'library', sourcePurl: 'pkg:maven/com.example/source@1.0' }
  ]);
  assert.deepEqual(result.sourcePurlNameMismatches, [
    { id: 'wrong-simple', name: 'openssl-libs', declaredSourcePackage: 'openssl', purlSourcePackage: 'openssl-compat' },
    { id: 'wrong-qualified', name: 'library', declaredSourcePackage: 'com.example:source', purlSourcePackage: 'com.example/other' }
  ]);
});
