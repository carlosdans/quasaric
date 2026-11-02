import test from 'node:test';
import assert from 'node:assert/strict';
import { parseSbom } from './sbom.js';

test('imports CycloneDX 1.6 components with PURL, publisher and CPE', () => {
  const result=parseSbom(JSON.stringify({bomFormat:'CycloneDX',specVersion:'1.6',components:[
    {name:'Node.js',version:'22.1.0',publisher:'OpenJS',purl:'pkg:npm/node@22.1.0',cpe:'cpe:2.3:a:nodejs:node.js:22.1.0:*:*:*:*:*:*:*'},
    {name:'openssl',version:'3.0.2'}
  ]}));
  assert.equal(result.format,'CycloneDX');
  assert.equal(result.components.length,2);
  assert.equal(result.components[0].vendor,'OpenJS');
  assert.match(result.components[0].cpe,/^cpe:/);
});

test('imports SPDX 2.3 package and external references', () => {
  const result=parseSbom(JSON.stringify({spdxVersion:'SPDX-2.3',dataLicense:'CC0-1.0',packages:[{
    name:'nginx',versionInfo:'1.26.0',supplier:'Organization: F5',
    externalRefs:[{referenceType:'purl',referenceLocator:'pkg:deb/debian/nginx@1.26.0'},{referenceType:'cpe23Type',referenceLocator:'cpe:2.3:a:nginx:nginx:1.26.0:*:*:*:*:*:*:*'}]
  }]}));
  assert.equal(result.format,'SPDX');
  assert.equal(result.components[0].vendor,'F5');
  assert.equal(result.components[0].type,'web');
  assert.match(result.components[0].purl,/^pkg:/);
});

test('preserves valid components and reports entries without names', () => {
  const result=parseSbom(JSON.stringify({bomFormat:'CycloneDX',specVersion:'1.5',components:[{name:'openssl'},{version:'1'}]}));
  assert.equal(result.components.length,1);
  assert.deepEqual(result.errors,[{index:2,message:'Missing component name.'}]);
});

test('rejects malformed, unknown and unsupported SBOM documents', () => {
  assert.throws(()=>parseSbom(''),/empty/);
  assert.throws(()=>parseSbom('{'),/valid JSON/);
  assert.throws(()=>parseSbom('{}'),/Unrecognised/);
  assert.throws(()=>parseSbom(JSON.stringify({bomFormat:'CycloneDX',specVersion:'1.3',components:[]})),/Unsupported CycloneDX/);
  assert.throws(()=>parseSbom(JSON.stringify({spdxVersion:'SPDX-2.2',dataLicense:'CC0-1.0',packages:[]})),/Unsupported SPDX/);
});

test('reports malformed PURLs instead of deriving a misleading component identity', () => {
  const result=parseSbom(JSON.stringify({bomFormat:'CycloneDX',specVersion:'1.6',components:[
    {name:'safe-name',purl:'pkg:npm/%ZZ'}
  ]}));
  assert.equal(result.components.length,0);
  assert.deepEqual(result.errors,[{index:1,message:'Invalid Package URL.'}]);
});


test('rejects SBOM input larger than 10 MiB before JSON parsing', () => {
  const oversized = ' '.repeat(10 * 1024 * 1024 + 1);
  assert.throws(() => parseSbom(oversized), /10 MB limit/);
});

test('measures SBOM size in UTF-8 bytes, including multibyte characters', () => {
  const oversized = '😀'.repeat(Math.ceil((10 * 1024 * 1024) / 4) + 1);
  assert.throws(() => parseSbom(oversized), /10 MB limit/);
});

test('normalises SPDX originator prefixes and whitespace', () => {
  const result=parseSbom(JSON.stringify({spdxVersion:'SPDX-2.3',dataLicense:'CC0-1.0',packages:[
    {name:'package-org',originator:'Organization: Example Foundation'},
    {name:'package-person',originator:'Person: Jane Example'}
  ]}));
  assert.deepEqual(result.components.map(component=>component.vendor),['Example Foundation','Jane Example']);
});

test('reports non-object CycloneDX and SPDX entries without aborting the import', () => {
  const cyclone=parseSbom(JSON.stringify({bomFormat:'CycloneDX',specVersion:'1.6',components:[
    null, 'not-a-component', {name:'openssl'}
  ]}));
  assert.equal(cyclone.components.length,1);
  assert.deepEqual(cyclone.errors,[
    {index:1,message:'Component entry must be a JSON object.'},
    {index:2,message:'Component entry must be a JSON object.'}
  ]);

  const spdx=parseSbom(JSON.stringify({spdxVersion:'SPDX-2.3',dataLicense:'CC0-1.0',packages:[
    null, 42, {name:'nginx'}
  ]}));
  assert.equal(spdx.components.length,1);
  assert.deepEqual(spdx.errors,[
    {index:1,message:'Package entry must be a JSON object.'},
    {index:2,message:'Package entry must be a JSON object.'}
  ]);
});


test('reports oversized component metadata as an entry error before persistence', () => {
  const result = parseSbom(JSON.stringify({bomFormat:'CycloneDX',specVersion:'1.6',components:[
    {name:'x'.repeat(16385)},
    {name:'nginx',purl:'x'.repeat(2049)},
    {name:'openssl',version:'3.0.0'}
  ]}));
  assert.equal(result.components.length,1);
  assert.equal(result.components[0].name,'openssl');
  assert.deepEqual(result.errors,[
    {index:1,message:'Component metadata exceeds the 16384 character field limit.'},
    {index:2,message:'PURL and CPE fields must not exceed 2048 characters.'}
  ]);
});

test('applies SBOM field limits to SPDX packages too', () => {
  const result = parseSbom(JSON.stringify({spdxVersion:'SPDX-2.3',dataLicense:'CC0-1.0',packages:[
    {name:'nginx',versionInfo:'v'.repeat(16385)},
    {name:'openssl'}
  ]}));
  assert.equal(result.components.length,1);
  assert.equal(result.errors[0].index,1);
  assert.match(result.errors[0].message,/16384 character/);
});
