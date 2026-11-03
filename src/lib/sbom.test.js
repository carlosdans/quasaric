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
test('preserves PURL namespaces when CycloneDX omits the component name', () => {
  const result = parseSbom(JSON.stringify({
    bomFormat: 'CycloneDX', specVersion: '1.6',
    components: [
      { purl: 'pkg:npm/%40acme/widget@1.2.3' },
      { purl: 'pkg:maven/org.apache.commons/commons-lang3@3.14.0' },
      { purl: 'pkg:pypi/requests@2.31.0' }
    ]
  }));
  assert.deepEqual(result.components.map(item => item.name), [
    '@acme/widget', 'org.apache.commons/commons-lang3', 'requests'
  ]);
  assert.deepEqual(result.components.map(item => item.version), ['1.2.3', '3.14.0', '2.31.0']);
});

test('imports CycloneDX 1.7 component metadata', () => {
  const result = parseSbom(JSON.stringify({
    bomFormat: 'CycloneDX', specVersion: '1.7',
    components: [{
      type: 'library', name: 'openssl', version: '3.3.2',
      publisher: 'OpenSSL Foundation',
      purl: 'pkg:generic/openssl@3.3.2',
      cpe: 'cpe:2.3:a:openssl:openssl:3.3.2:*:*:*:*:*:*:*'
    }]
  }));
  assert.equal(result.format, 'CycloneDX');
  assert.equal(result.components[0].name, 'openssl');
  assert.equal(result.components[0].version, '3.3.2');
  assert.equal(result.components[0].vendor, 'OpenSSL Foundation');
  assert.equal(result.components[0].purl, 'pkg:generic/openssl@3.3.2');
  assert.match(result.components[0].cpe, /^cpe:/);
});

test('imports nested CycloneDX components recursively in document order', () => {
  const result = parseSbom(JSON.stringify({
    bomFormat: 'CycloneDX', specVersion: '1.7',
    components: [
      {
        name: 'application', version: '1.0',
        components: [
          {
            name: 'framework', version: '2.0',
            components: [{ name: 'transitive-library', version: '3.0' }]
          },
          { name: 'direct-library', version: '4.0' }
        ]
      },
      { name: 'second-root-library', version: '5.0' }
    ]
  }));
  assert.deepEqual(result.components.map(item => item.name), [
    'application', 'framework', 'transitive-library', 'direct-library', 'second-root-library'
  ]);
  assert.deepEqual(result.components.map(item => item.version), ['1.0', '2.0', '3.0', '4.0', '5.0']);
});

test('applies the 50000 component limit across nested CycloneDX components', () => {
  const result = {
    bomFormat: 'CycloneDX', specVersion: '1.7',
    components: [{ name: 'root', components: Array.from({ length: 50000 }, (_, index) => ({ name: 'pkg-' + index })) }]
  };
  assert.throws(() => parseSbom(JSON.stringify(result)), /50000 component limit/);
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
test('preserves PURL namespaces when SPDX omits the package name', () => {
  const result = parseSbom(JSON.stringify({
    spdxVersion: 'SPDX-2.3', dataLicense: 'CC0-1.0',
    packages: [{
      SPDXID: 'SPDXRef-npm',
      externalRefs: [{ referenceType: 'purl', referenceLocator: 'pkg:npm/%40acme/widget@1.2.3' }]
    }]
  }));
  assert.equal(result.components[0].name, '@acme/widget');
  assert.equal(result.components[0].version, '1.2.3');
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

test('infers common runtime families from CycloneDX package identity', () => {
  const result = parseSbom(JSON.stringify({
    bomFormat: 'CycloneDX', specVersion: '1.7',
    components: [
      { name: 'Go', version: '1.24.0', purl: 'pkg:golang/go@1.24.0' },
      { name: 'Ruby', version: '3.4.0', purl: 'pkg:gem/ruby@3.4.0' },
      { name: '.NET Runtime', version: '9.0.0' },
      { name: 'Rust', version: '1.85.0', purl: 'pkg:cargo/rust@1.85.0' },
      { name: 'Caddy', version: '2.9.0' },
      { name: 'Apache Tomcat', version: '10.1.0' }
    ]
  }));
  assert.deepEqual(result.components.map(item => item.type), [
    'runtime', 'runtime', 'runtime', 'runtime', 'web', 'web'
  ]);
});


test('does not infer CycloneDX source provenance when multiple RPM source ancestors exist', () => {
  const result = parseSbom(JSON.stringify({
    bomFormat: 'CycloneDX', specVersion: '1.6',
    components: [{
      name: 'openssl-libs', version: '3.0.7',
      pedigree: { ancestors: [
        { name: 'openssl', version: '3.0.7', purl: 'pkg:rpm/openssl@3.0.7?arch=src' },
        { name: 'openssl-custom', version: '3.0.7', purl: 'pkg:rpm/openssl-custom@3.0.7?arch=src' }
      ] }
    }]
  }));
  assert.equal(result.components.length, 1);
  assert.equal(result.components[0].sourcePackage, '');
  assert.equal(result.components[0].sourceVersion, '');
  assert.equal(result.components[0].sourcePurl, '');
  assert.equal(result.components[0].sourceRelationship, '');
});


test('imports the CycloneDX metadata component when it is the BOM subject', () => {
  const result = parseSbom(JSON.stringify({
    bomFormat: 'CycloneDX', specVersion: '1.6',
    metadata: { component: { type: 'application', name: 'quasaric-app', version: '2.4.0', purl: 'pkg:generic/quasaric-app@2.4.0' } }
  }));
  assert.equal(result.errors.length, 0);
  assert.equal(result.components.length, 1);
  assert.equal(result.components[0].name, 'quasaric-app');
  assert.equal(result.components[0].version, '2.4.0');
  assert.equal(result.components[0].purl, 'pkg:generic/quasaric-app@2.4.0');
});

test('preserves explicit SPDX primary package purpose over name heuristics', () => {
  const result = parseSbom(JSON.stringify({
    spdxVersion: 'SPDX-2.3',
    dataLicense: 'CC0-1.0',
    packages: [
      {
        SPDXID: 'SPDXRef-framework',
        name: 'python',
        versionInfo: '1.0.0',
        primaryPackagePurpose: 'FRAMEWORK',
        externalRefs: [{ referenceType: 'purl', referenceLocator: 'pkg:npm/python@1.0.0' }]
      },
      {
        SPDXID: 'SPDXRef-application',
        name: 'nginx',
        versionInfo: '1.0.0',
        primaryPackagePurpose: 'APPLICATION',
        externalRefs: [{ referenceType: 'purl', referenceLocator: 'pkg:npm/nginx@1.0.0' }]
      },
      {
        SPDXID: 'SPDXRef-os',
        name: 'custom-linux-image',
        primaryPackagePurpose: 'OPERATING-SYSTEM'
      }
    ]
  }));
  assert.deepEqual(result.components.map(component => component.type), [
    'library', 'other', 'os'
  ]);
});

test('does not duplicate CycloneDX metadata component when its bom-ref is in components', () => {
  const root = { 'bom-ref': 'app-ref', type: 'application', name: 'quasaric-app', version: '2.4.0' };
  const result = parseSbom(JSON.stringify({
    bomFormat: 'CycloneDX', specVersion: '1.6',
    metadata: { component: root },
    components: [{ 'bom-ref': 'app-ref', type: 'application', name: 'quasaric-app', version: '2.4.0' }, { name: 'react', version: '19.0.0' }]
  }));
  assert.equal(result.components.length, 2);
  assert.deepEqual(result.components.map(item => item.name), ['quasaric-app', 'react']);
});

test('merges richer CycloneDX metadata subject fields into its matching component', () => {
  const result = parseSbom(JSON.stringify({
    bomFormat: 'CycloneDX', specVersion: '1.6',
    metadata: { component: {
      'bom-ref': 'app-ref', type: 'application', name: 'quasaric-app', version: '2.4.0',
      publisher: 'Quasaric Project', purl: 'pkg:generic/quasaric-app@2.4.0'
    } },
    components: [
      { 'bom-ref': 'app-ref', type: 'application', name: 'quasaric-app' },
      { name: 'react', version: '19.0.0' }
    ]
  }));
  assert.equal(result.components.length, 2);
  assert.equal(result.components[0].name, 'quasaric-app');
  assert.equal(result.components[0].version, '2.4.0');
  assert.equal(result.components[0].vendor, 'Quasaric Project');
  assert.equal(result.components[0].purl, 'pkg:generic/quasaric-app@2.4.0');
});
test('does not duplicate CycloneDX metadata subject when bom-ref is omitted', () => {
  const result = parseSbom(JSON.stringify({
    bomFormat: 'CycloneDX', specVersion: '1.7',
    metadata: { component: {
      type: 'application', name: 'quasaric-app', version: '2.4.0',
      publisher: 'Quasaric Project', purl: 'pkg:generic/quasaric-app@2.4.0'
    } },
    components: [
      { type: 'application', name: 'quasaric-app', version: '2.4.0',
        purl: 'pkg:generic/quasaric-app@2.4.0' },
      { type: 'library', name: 'react', version: '19.0.0' }
    ]
  }));
  assert.equal(result.components.length, 2);
  assert.equal(result.components[0].name, 'quasaric-app');
  assert.equal(result.components[0].vendor, 'Quasaric Project');
  assert.equal(result.components[0].purl, 'pkg:generic/quasaric-app@2.4.0');
  assert.equal(result.components[1].name, 'react');
});

test('preserves explicit CycloneDX component types over ambiguous name heuristics', () => {
  const result = parseSbom(JSON.stringify({
    bomFormat: 'CycloneDX', specVersion: '1.7',
    components: [
      { type: 'library', name: 'nginx', version: '1.2.3', purl: 'pkg:npm/nginx@1.2.3' },
      { type: 'library', name: 'python', version: '1.0.0', purl: 'pkg:npm/python@1.0.0' },
      { type: 'operating-system', name: 'custom-linux-image', version: '1.0' },
      { type: 'application', name: 'nginx', version: '1.2.3' }
    ]
  }));
  assert.deepEqual(result.components.map(component => component.type), [
    'library', 'library', 'os', 'other'
  ]);
});


test('flattens nested dependencies when the CycloneDX metadata subject is not in components', () => {
  const result = parseSbom(JSON.stringify({
    bomFormat: 'CycloneDX', specVersion: '1.7',
    metadata: {
      component: {
        type: 'application', name: 'service', version: '1.0',
        components: [{
          type: 'library', name: 'direct-dependency', version: '2.0',
          components: [{ type: 'library', name: 'transitive-dependency', version: '3.0' }]
        }]
      }
    },
    components: [{ type: 'library', name: 'separate-dependency', version: '4.0' }]
  }));
  assert.deepEqual(result.components.map(item => item.name), [
    'service', 'direct-dependency', 'transitive-dependency', 'separate-dependency'
  ]);
  assert.deepEqual(result.components.map(item => item.version), ['1.0', '2.0', '3.0', '4.0']);
});


test('recognizes the SPDX OPERATING_SYSTEM package purpose enum', () => {
  const result = parseSbom(JSON.stringify({
    spdxVersion: 'SPDX-2.3', dataLicense: 'CC0-1.0',
    packages: [{
      SPDXID: 'SPDXRef-os', name: 'custom-appliance-image',
      primaryPackagePurpose: 'OPERATING_SYSTEM'
    }]
  }));
  assert.equal(result.components.length, 1);
  assert.equal(result.components[0].type, 'os');
});
