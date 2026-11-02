import test from 'node:test';
import assert from 'node:assert/strict';
import { parseInventoryCsv } from './inventoryCsv.js';
test('parses inventory CSV with BOM, CRLF and quoted commas', () => {
  const result = parseInventoryCsv('\uFEFFname,type,version,vendor,sourcePackage,sourceVersion,architecture\r\n"NGINX, Plus",web,1.25,"Example, Inc.",,,\r\nUbuntu,os,24.04,,,,amd64\r\n');
  assert.equal(result.errors.length,0); assert.equal(result.components.length,2);
  assert.equal(result.components[0].name,'NGINX, Plus'); assert.equal(result.components[0].vendor,'Example, Inc.');
  assert.equal(result.components[1].architecture,'amd64');
});
test('supports escaped quotes, optional columns and empty rows', () => {
  const result=parseInventoryCsv('name,vendor\n"Web ""Core""",Acme\n\nPHP,\n');
  assert.deepEqual(result.components.map(item=>[item.name,item.type,item.vendor]),[['Web "Core"','other','Acme'],['PHP','other','']]);
});
test('reports invalid rows while preserving valid rows', () => {
  const result=parseInventoryCsv('name,type,version\nNGINX,web,1.2\n,os,24.04\nUbuntu,unknown,24.04\nPHP,runtime\n');
  assert.equal(result.components.length,1); assert.deepEqual(result.errors.map(error=>error.row),[3,4,5]);
});
test('rejects malformed quoting, unsupported headers and missing name header', () => {
  assert.throws(()=>parseInventoryCsv('name,type\n"NGINX,web'),/unterminated/);
  assert.throws(()=>parseInventoryCsv('name,type\nng"inx,web'),/quote in an unquoted/);
  assert.throws(()=>parseInventoryCsv('product,type\nNGINX,web'),/name column/);
  assert.throws(()=>parseInventoryCsv('name,secret\nNGINX,x'),/unsupported columns/);
});
test('rejects non-text and empty files', () => { assert.throws(()=>parseInventoryCsv(null),/must be text/); assert.throws(()=>parseInventoryCsv(''),/empty/); });
test('enforces size, row, column and field limits', () => {
  assert.throws(()=>parseInventoryCsv('name\n'+'x'.repeat(5*1024*1024)),/5 MB/);
  assert.throws(()=>parseInventoryCsv('name\n'+Array.from({length:50002},(_,i)=>'item'+i).join('\n')),/50000 data-row/);
  assert.throws(()=>parseInventoryCsv(Array.from({length:33},(_,i)=>i===0?'name':'x'+i).join(',')+'\nitem'+',x'.repeat(32)),/32-column/);
  assert.throws(()=>parseInventoryCsv('name\n'+'x'.repeat(16385)),/field longer/);
});
test('rejects duplicate headers regardless of case',()=>assert.throws(()=>parseInventoryCsv('name,Name\nnginx,nginx'),/duplicate/));
test('preserves PURL and CPE and supports old CSV schemas',()=>{
  const result=parseInventoryCsv('name,purl,cpe\nnginx,pkg:deb/debian/nginx@1.26.0,cpe:2.3:a:nginx:nginx:1.26.0:*:*:*:*:*:*:*\n');
  assert.equal(result.components[0].purl,'pkg:deb/debian/nginx@1.26.0'); assert.match(result.components[0].cpe,/^cpe:2\.3:/);
  assert.equal(parseInventoryCsv('name,type\nnginx,web\n').components[0].purl,'');
});
test('rejects oversized identifiers as row errors',()=>{
  const result=parseInventoryCsv('name,purl\nnginx,'+'x'.repeat(2049));
  assert.equal(result.components.length,0); assert.equal(result.errors[0].row,2);
});
test('enforces UTF-8 byte limits',()=>{
  const multibyte='😀'.repeat(Math.ceil((5*1024*1024)/4));
  assert.throws(()=>parseInventoryCsv('name\n'+multibyte),/5 MB/);
});
test('enforces field limits while decoding escaped quotes',()=>{
  const valid='name\n"'+'a'.repeat(16383)+'""'+'b'+'"';
  assert.throws(()=>parseInventoryCsv(valid),/field longer than 16384/);
});
test('round-trips explicit source relationship columns and remains backwards compatible',()=>{
  const result=parseInventoryCsv('name,sourcePackage,sourceVersion,sourceRelationship,sourceRef,sourcePurl,architecture\nopenssl-libs,openssl,3.0.7-1,spdx_generated_from,SPDXRef-source,pkg:rpm/openssl@3.0.7-1?arch=src,x86_64\n');
  assert.equal(result.errors.length,0);
  for(const [field,value] of Object.entries({sourcePackage:'openssl',sourceVersion:'3.0.7-1',sourceRelationship:'spdx_generated_from',sourceRef:'SPDXRef-source',sourcePurl:'pkg:rpm/openssl@3.0.7-1?arch=src',architecture:'x86_64'})) assert.equal(result.components[0][field],value);
  assert.equal(parseInventoryCsv('name,type\nnginx,web\n').components[0].sourceRelationship,'');
});
test('rejects oversized source references',()=>{
  const result=parseInventoryCsv('name,sourcePurl\nnginx,'+'x'.repeat(2049));
  assert.equal(result.components.length,0); assert.match(result.errors[0].message,/source reference fields/);
});


test('rejects malformed component and source Package URLs as row errors', () => {
  const result = parseInventoryCsv(
    'name,purl,sourcePurl\\nnginx,pkg:deb/debian/nginx@1.26,pkg:rpm/nginx@1.26?arch=src\\n' +
    'bad-component,not-a-purl,\\n' +
    'bad-source,pkg:deb/debian/nginx@1.26,not-a-purl\\n'
  );
  assert.equal(result.components.length, 1);
  assert.deepEqual(result.errors.map(error => error.row), [3, 4]);
  assert.match(result.errors[0].message, /valid Package URLs/);
});
