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
  const result=parseSbom(JSON.stringify({bomFormat:'CycloneDX',specVersion:'1.6',components:[{name:'safe-name',purl:'pkg:npm/%ZZ'}]}));
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
  const cyclone=parseSbom(JSON.stringify({bomFormat:'CycloneDX',specVersion:'1.6',components:[null,'not-a-component',{name:'openssl'}]}));
  assert.equal(cyclone.components.length,1);
  assert.deepEqual(cyclone.errors,[{index:1,message:'Component entry must be a JSON object.'},{index:2,message:'Component entry must be a JSON object.'}]);
  const spdx=parseSbom(JSON.stringify({spdxVersion:'SPDX-2.3',dataLicense:'CC0-1.0',packages:[null,42,{name:'nginx'}]}));
  assert.equal(spdx.components.length,1);
  assert.deepEqual(spdx.errors,[{index:1,message:'Package entry must be a JSON object.'},{index:2,message:'Package entry must be a JSON object.'}]);
});
test('reports oversized component metadata as an entry error before persistence', () => {
  const result=parseSbom(JSON.stringify({bomFormat:'CycloneDX',specVersion:'1.6',components:[
    {name:'x'.repeat(16385)},{name:'nginx',purl:'x'.repeat(2049)},{name:'openssl',version:'3.0.0'}
  ]}));
  assert.equal(result.components.length,1);
  assert.equal(result.components[0].name,'openssl');
  assert.deepEqual(result.errors,[
    {index:1,message:'Component metadata exceeds the 16384 character field limit.'},
    {index:2,message:'PURL and CPE fields must not exceed 2048 characters.'}
  ]);
});
test('applies SBOM field limits to SPDX packages too', () => {
  const result=parseSbom(JSON.stringify({spdxVersion:'SPDX-2.3',dataLicense:'CC0-1.0',packages:[
    {name:'nginx',versionInfo:'v'.repeat(16385)},{name:'openssl'}
  ]}));
  assert.equal(result.components.length,1);
  assert.equal(result.errors[0].index,1);
  assert.match(result.errors[0].message,/16384 character/);
});
test('maps SPDX GENERATED_FROM from a binary to its unique explicit source package', () => {
  const result=parseSbom(JSON.stringify({
    spdxVersion:'SPDX-2.3',dataLicense:'CC0-1.0',
    packages:[
      {SPDXID:'SPDXRef-binary',name:'openssl-libs',versionInfo:'3.0.7-1',externalRefs:[{referenceType:'purl',referenceLocator:'pkg:rpm/openssl-libs@3.0.7-1?arch=x86_64'}]},
      {SPDXID:'SPDXRef-source',name:'openssl',versionInfo:'3.0.7-1',externalRefs:[{referenceType:'purl',referenceLocator:'pkg:rpm/openssl@3.0.7-1?arch=src'}]}
    ],
    relationships:[{spdxElementId:'SPDXRef-binary',relationshipType:'GENERATED_FROM',relatedSpdxElement:'SPDXRef-source'}]
  }));
  const binary=result.components[0];
  assert.equal(binary.sourcePackage,'openssl');
  assert.equal(binary.sourceVersion,'3.0.7-1');
  assert.equal(binary.sourceRelationship,'spdx_generated_from');
  assert.equal(binary.sourceRef,'SPDXRef-source');
  assert.equal(binary.sourcePurl,'pkg:rpm/openssl@3.0.7-1?arch=src');
  assert.equal(binary.architecture,'x86_64');
});
test('does not infer SPDX relationships from names or ambiguous source edges', () => {
  const result=parseSbom(JSON.stringify({
    spdxVersion:'SPDX-2.3',dataLicense:'CC0-1.0',
    packages:[{SPDXID:'bin',name:'openssl-libs'},{SPDXID:'src-a',name:'openssl'},{SPDXID:'src-b',name:'openssl'}],
    relationships:[
      {spdxElementId:'bin',relationshipType:'GENERATED_FROM',relatedSpdxElement:'src-a'},
      {spdxElementId:'bin',relationshipType:'GENERATED_FROM',relatedSpdxElement:'src-b'}
    ]
  }));
  assert.equal(result.components[0].sourcePackage,'');
  assert.equal(result.components[0].sourceRelationship,'');
});
test('imports CycloneDX quasaric source properties and RPM arch=src pedigree only', () => {
  const result=parseSbom(JSON.stringify({
    bomFormat:'CycloneDX',specVersion:'1.6',
    components:[
      {name:'openssl-libs',version:'3.0.7',purl:'pkg:rpm/openssl-libs@3.0.7?arch=x86_64',pedigree:{ancestors:[{name:'openssl',version:'3.0.7',purl:'pkg:rpm/openssl@3.0.7?arch=src'}]}},
      {name:'curl',version:'8.0',properties:[
        {name:'quasaric:sourcePackage',value:'curl'},{name:'quasaric:sourceVersion',value:'8.0-1'},
        {name:'quasaric:sourceRelationship',value:'vendor_explicit_mapping'},
        {name:'quasaric:sourceRef',value:'source-record-1'},{name:'quasaric:sourcePurl',value:'pkg:rpm/curl@8.0-1?arch=src'}
      ]},
      {name:'nginx',version:'1.26',pedigree:{ancestors:[{name:'nginx-src',version:'1.26'}]}}
    ]
  }));
  assert.equal(result.components[0].sourcePackage,'openssl');
  assert.equal(result.components[0].sourceVersion,'3.0.7');
  assert.equal(result.components[0].sourceRelationship,'cyclonedx_pedigree_ancestor_rpm_src');
  assert.equal(result.components[0].architecture,'x86_64');
  assert.equal(result.components[1].sourcePackage,'curl');
  assert.equal(result.components[1].sourceRelationship,'vendor_explicit_mapping');
  assert.equal(result.components[2].sourcePackage,'');
});
test('rejects oversized source relationship metadata', () => {
  const result=parseSbom(JSON.stringify({bomFormat:'CycloneDX',specVersion:'1.6',components:[
    {name:'nginx',properties:[{name:'quasaric:sourcePurl',value:'x'.repeat(2049)}]}
  ]}));
  assert.equal(result.components.length,0);
  assert.match(result.errors[0].message,/source reference fields/);
});


test('rejects malformed explicit source PURLs instead of retaining invalid provenance', () => {
  const result = parseSbom(JSON.stringify({
    bomFormat: 'CycloneDX', specVersion: '1.6',
    components: [{ name: 'nginx', properties: [{ name: 'quasaric:sourcePurl', value: 'pkg:rpm/%ZZ' }] }]
  }));
  assert.equal(result.components.length, 0);
  assert.equal(result.errors[0].message, 'Invalid source Package URL.');
});


test('does not attach SPDX source provenance when package identifiers are duplicated', () => {
  const result = parseSbom(JSON.stringify({
    spdxVersion: 'SPDX-2.3', dataLicense: 'CC0-1.0',
    packages: [
      { SPDXID: 'SPDXRef-binary', name: 'openssl-libs' },
      { SPDXID: 'SPDXRef-source', name: 'openssl' },
      { SPDXID: 'SPDXRef-source', name: 'unrelated-source' }
    ],
    relationships: [{
      spdxElementId: 'SPDXRef-binary',
      relationshipType: 'GENERATED_FROM',
      relatedSpdxElement: 'SPDXRef-source'
    }]
  }));
  assert.equal(result.components.length, 3);
  assert.equal(result.components[0].sourcePackage, '');
  assert.equal(result.components[0].sourceRelationship, '');
});
