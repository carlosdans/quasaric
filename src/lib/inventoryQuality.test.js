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
  assert.deepEqual(inspectInventory([]),{missingVersion:[],missingSourceVersion:[],duplicates:[]});
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
