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
