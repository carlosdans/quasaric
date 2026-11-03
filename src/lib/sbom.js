import { parsePackageUrl } from './packageUrl.js';

const MAX_COMPONENTS = 50000;
const MAX_SBOM_BYTES = 10 * 1024 * 1024;
const MAX_FIELD_LENGTH = 16384;
const MAX_IDENTIFIER_LENGTH = 2048;
const str = value => typeof value === 'string' ? value.trim() : '';
function validateComponentFields(component) {
  if (['name', 'version', 'vendor', 'sourcePackage', 'sourceVersion', 'architecture', 'sourceRelationship'].some(field => component[field].length > MAX_FIELD_LENGTH)) return 'Component metadata exceeds the 16384 character field limit.';
  if (['purl', 'cpe', 'sourceRef', 'sourcePurl'].some(field => component[field].length > MAX_IDENTIFIER_LENGTH)) return 'PURL, CPE and source reference fields must not exceed 2048 characters.';
  return null;
}
function purlInfo(purl) {
  if (!str(purl)) return {};
  const parsed = parsePackageUrl(purl);
  return parsed ? {
    name: parsed.name,
    qualifiedName: parsed.namespace ? `${parsed.namespace}/${parsed.name}` : parsed.name,
    version: parsed.version,
    ecosystem: parsed.type,
    qualifiers: parsed.qualifiers
  } : null;
}
function typeFor(name, ecosystem, declaredType = '') {
  // CycloneDX's component type is explicit inventory metadata. Preserve it
  // ahead of name-based suggestions, which can misclassify packages such as
  // an npm library named "nginx" as a web server.
  const declared = str(declaredType).toLowerCase().replaceAll('_', '-');
  if (declared === 'operating-system') return 'os';
  if (['library', 'framework', 'file'].includes(declared)) return 'library';
  if (['application', 'container', 'device', 'firmware', 'platform', 'device-driver',
    'machine-learning-model', 'data', 'cryptographic-asset', 'install', 'source', 'archive', 'other'].includes(declared)) return 'other';
  const value = (name + ' ' + ecosystem).toLowerCase();
  if (/ubuntu|debian|red hat|rhel|rocky|alma|suse|windows server|linux/.test(value)) return 'os';
  if (/nginx|apache|httpd|iis|caddy|tomcat/.test(value)) return 'web';
  if (/php|node(js)?|python|java|ruby|rust|dotnet|\.net|asp\.net|powershell|golang|(^|[^a-z])go([^a-z]|$)/.test(value)) return 'runtime';
  if (/wordpress|drupal|joomla/.test(value)) return 'cms';
  if (/postgres|mysql|mariadb|mongodb|redis/.test(value)) return 'database';
  return 'library';
}
function propertiesFor(item) {
  const result = {};
  for (const property of Array.isArray(item.properties) ? item.properties : []) {
    const key = str(property?.name);
    if (key.startsWith('quasaric:') && typeof property.value === 'string') result[key.slice(9)] = property.value.trim();
  }
  return result;
}
function flattenCycloneComponents(components) {
  const pending = [...components].reverse();
  const flattened = [];
  while (pending.length) {
    const item = pending.pop();
    flattened.push(item);
    if (flattened.length > MAX_COMPONENTS) throw new Error('SBOM exceeds the 50000 component limit.');
    if (item && typeof item === 'object' && !Array.isArray(item) && Array.isArray(item.components)) {
      for (let index = item.components.length - 1; index >= 0; index -= 1) {
        pending.push(item.components[index]);
      }
    }
  }
  return flattened;
}

function cyclone(document) {
  if (document.bomFormat !== 'CycloneDX' || !['1.4','1.5','1.6','1.7'].includes(String(document.specVersion))) throw new Error('Unsupported CycloneDX format or version (supported: JSON 1.4–1.7).');
  if (document.components !== undefined && !Array.isArray(document.components)) throw new Error('CycloneDX components must be an array.');
  const nested = flattenCycloneComponents(document.components || []);
  const root = document.metadata?.component;
  const rootRef = str(root?.['bom-ref']);
  // metadata.component is the BOM subject and can be the only component in
  // otherwise valid BOMs. Prefer its stable bom-ref; CycloneDX also permits
  // components without one, so use an exact PURL or complete name/version/type
  // identity as a conservative fallback to avoid importing the subject twice.
  const rootIndex = root && typeof root === 'object'
    ? nested.findIndex(item => {
        if (!item || typeof item !== 'object' || Array.isArray(item)) return false;
        if (rootRef) return str(item['bom-ref']) === rootRef;
        const rootPurl = str(root.purl);
        if (rootPurl) return str(item.purl) === rootPurl;
        return Boolean(str(root.name)) &&
          str(item.name) === str(root.name) &&
          str(item.version) === str(root.version) &&
          str(item.type) === str(root.type);
      })
    : -1;
  // The metadata subject is authoritative for shared fields. Retain nested
  // relationships/collections when the subject omits them, rather than
  // silently losing richer root metadata or importing the same ref twice.
  let flattened;
  if (rootIndex >= 0) {
    const matched = nested[rootIndex];
    // Replace the matched subject's descendant subtree with the metadata
    // subject's subtree when supplied. Otherwise retain the document subtree.
    // This keeps richer metadata.component dependencies without duplicating
    // descendants already flattened from document.components.
    const previousDescendants = new Set(flattenCycloneComponents(
      Array.isArray(matched?.components) ? matched.components : []
    ));
    const mergedRoot = {
      ...matched,
      ...root,
      components: Array.isArray(root.components) ? root.components : matched?.components
    };
    const replacementTree = flattenCycloneComponents([mergedRoot]);
    flattened = [];
    nested.forEach((item, index) => {
      if (index === rootIndex) flattened.push(...replacementTree);
      else if (!previousDescendants.has(item)) flattened.push(item);
    });
  } else {
    flattened = root ? [...flattenCycloneComponents([root]), ...nested] : nested;
  }
  if (flattened.length > MAX_COMPONENTS) throw new Error('SBOM exceeds the 50000 component limit.');
  return flattened.map((item,index) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return { error:'Component entry must be a JSON object.', index:index+1 };
    const rawPurl = str(item.purl);
    if (rawPurl.length > MAX_IDENTIFIER_LENGTH || str(item.cpe).length > MAX_IDENTIFIER_LENGTH) return { error:'PURL and CPE fields must not exceed 2048 characters.', index:index+1 };
    const purl = purlInfo(rawPurl);
    if (rawPurl && !purl) return { error:'Invalid Package URL.', index:index+1 };
    const declaredVersion = str(item.version);
    const purlVersionMismatch = Boolean(declaredVersion && purl?.version && declaredVersion !== purl.version);
    const safePurl = purlVersionMismatch ? '' : rawPurl;
    const safePurlData = purlVersionMismatch ? null : purl;
    const name = str(item.name) || purl?.qualifiedName || purl?.name;
    if (!name) return { error:'Missing component name.', index:index+1 };
    const refs = Array.isArray(item.externalReferences) ? item.externalReferences : [];
    const cpeRef = refs.find(ref => /cpe/i.test(str(ref.type) + ' ' + str(ref.referenceType)));
    const properties = propertiesFor(item);
    const warnings = [];
    if (purlVersionMismatch) warnings.push('The declared component version does not match the version embedded in its PURL; the PURL was removed to prevent an incorrect OSV query.');
    const component = {
      name, version:declaredVersion || purl?.version || '',
      vendor:str(item.publisher) || str(item.supplier?.name),
      type:typeFor(name,safePurlData?.ecosystem || '',item.type), purl:safePurl,
      cpe:str(item.cpe) || str(cpeRef?.url) || str(cpeRef?.referenceLocator),
      sourcePackage:str(properties.sourcePackage), sourceVersion:str(properties.sourceVersion),
      architecture:str(properties.architecture) || str(safePurlData?.qualifiers?.arch),
      sourceRelationship:str(properties.sourceRelationship), sourceRef:str(properties.sourceRef),
      sourcePurl:str(properties.sourcePurl)
    };
    // CycloneDX pedigree ancestors describe provenance. Promote only ancestors
    // explicitly identified as RPM source packages (arch=src), never by name.
    if (!component.sourcePackage) {
      const ancestors = Array.isArray(item.pedigree?.ancestors) ? item.pedigree.ancestors : [];
      const sources = ancestors.filter(ancestor => {
        const parsed = purlInfo(str(ancestor?.purl));
        return parsed?.ecosystem === 'rpm' && parsed.qualifiers?.arch === 'src';
      });
      // Multiple source candidates are ambiguous; leave provenance unresolved.
      if (sources.length === 1) {
        const source = sources[0];
        const parsed = purlInfo(str(source.purl));
        component.sourcePackage = parsed.name;
        component.sourceVersion = parsed.version;
        component.sourcePurl = str(source.purl);
        component.sourceRef = str(source['bom-ref']);
        component.sourceRelationship = 'cyclonedx_pedigree_ancestor_rpm_src';
      }
    }
    const error = validateComponentFields(component);
    if (error) return { error, index:index+1 };
    const sourcePurlData = purlInfo(component.sourcePurl);
    if (component.sourcePurl && !sourcePurlData) return { error:'Invalid source Package URL.', index:index+1 };
    if (component.sourceVersion && sourcePurlData?.version && component.sourceVersion !== sourcePurlData.version) {
      component.sourcePurl = '';
      warnings.push('The declared source package version does not match the version embedded in its source PURL; the source PURL was removed.');
    }
    return warnings.length ? { ...component, warning: warnings } : component;
  });
}
function spdx(document) {
  if (document.spdxVersion !== 'SPDX-2.3' || document.dataLicense !== 'CC0-1.0') throw new Error('Unsupported SPDX format or version (supported: SPDX 2.3 JSON).');
  if (!Array.isArray(document.packages)) throw new Error('SPDX document has no packages array.');
  if (document.packages.length > MAX_COMPONENTS) throw new Error('SBOM exceeds the 50000 component limit.');
  const packageIdCounts = new Map();
  for (const item of document.packages) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
    const id = str(item.SPDXID);
    if (id) packageIdCounts.set(id, (packageIdCounts.get(id) || 0) + 1);
  }
  const packages = new Map(document.packages.filter(item =>
    item && typeof item === 'object' && !Array.isArray(item) &&
    str(item.SPDXID) && packageIdCounts.get(str(item.SPDXID)) === 1
  ).map(item => [str(item.SPDXID), item]));
  const generatedFrom = new Map();
  for (const relationship of Array.isArray(document.relationships) ? document.relationships : []) {
    if (str(relationship?.relationshipType) !== 'GENERATED_FROM') continue;
    const binaryId = str(relationship.spdxElementId);
    const sourceId = str(relationship.relatedSpdxElement);
    // Duplicate SPDX identifiers make an edge ambiguous even if the JSON
    // contains an explicit relationship. Never attach provenance by map order.
    if (packageIdCounts.get(binaryId) !== 1 || packageIdCounts.get(sourceId) !== 1 ||
        !packages.has(binaryId) || !packages.has(sourceId) || binaryId === sourceId) continue;
    if (!generatedFrom.has(binaryId)) generatedFrom.set(binaryId, []);
    generatedFrom.get(binaryId).push(sourceId);
  }
  return document.packages.map((item,index) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return { error:'Package entry must be a JSON object.', index:index+1 };
    const refs = Array.isArray(item.externalRefs) ? item.externalRefs : [];
    const purlRef = refs.find(ref => /purl/i.test(str(ref.referenceType)));
    const cpeRef = refs.find(ref => /cpe/i.test(str(ref.referenceType)));
    const rawPurl = str(purlRef?.referenceLocator);
    const rawCpe = str(cpeRef?.referenceLocator);
    if (rawPurl.length > MAX_IDENTIFIER_LENGTH || rawCpe.length > MAX_IDENTIFIER_LENGTH) return { error:'PURL and CPE fields must not exceed 2048 characters.', index:index+1 };
    const purl = purlInfo(rawPurl);
    if (rawPurl && !purl) return { error:'Invalid Package URL.', index:index+1 };
    const declaredVersion = str(item.versionInfo);
    const purlVersionMismatch = Boolean(declaredVersion && purl?.version && declaredVersion !== purl.version);
    const safePurl = purlVersionMismatch ? '' : rawPurl;
    const safePurlData = purlVersionMismatch ? null : purl;
    const name = str(item.name) || purl?.qualifiedName || purl?.name;
    if (!name) return { error:'Missing package name.', index:index+1 };
    const warnings = [];
    if (purlVersionMismatch) warnings.push('The declared package version does not match the version embedded in its PURL; the PURL was removed to prevent an incorrect OSV query.');
    const component = {
      name, version:declaredVersion || purl?.version || '',
      vendor:str(item.supplier).replace(/^Organization:[ \t]*/i,'') || str(item.originator).replace(/^(Organization|Person):\s*/i,''),
      type:typeFor(name,safePurlData?.ecosystem || '',item.primaryPackagePurpose), purl:safePurl, cpe:rawCpe,
      sourcePackage:'', sourceVersion:'', architecture:str(safePurlData?.qualifiers?.arch),
      sourceRelationship:'', sourceRef:'', sourcePurl:''
    };
    // SPDX GENERATED_FROM is directional: binary (left) is generated from source (right).
    // Multiple source targets are intentionally left unresolved for manual review.
    const sources = generatedFrom.get(str(item.SPDXID)) || [];
    if (sources.length === 1) {
      const source = packages.get(sources[0]);
      const sourceRefs = Array.isArray(source.externalRefs) ? source.externalRefs : [];
      const sourcePurlRef = sourceRefs.find(ref => /purl/i.test(str(ref.referenceType)));
      const sourcePurl = str(sourcePurlRef?.referenceLocator);
      const sourcePurlData = purlInfo(sourcePurl);
      component.sourcePackage = str(source.name) || sourcePurlData?.name || '';
      component.sourceVersion = str(source.versionInfo) || sourcePurlData?.version || '';
      component.sourceRef = str(source.SPDXID);
      component.sourcePurl = sourcePurl;
      component.sourceRelationship = 'spdx_generated_from';
      if (component.sourceVersion && sourcePurlData?.version && component.sourceVersion !== sourcePurlData.version) {
        component.sourcePurl = '';
        warnings.push('The declared source package version does not match the version embedded in its source PURL; the source PURL was removed.');
      }
    }
    const error = validateComponentFields(component);
    if (error) return { error, index:index+1 };
    const sourcePurlData = purlInfo(component.sourcePurl);
    if (component.sourcePurl && !sourcePurlData) return { error:'Invalid source Package URL.', index:index+1 };
    if (component.sourceVersion && sourcePurlData?.version && component.sourceVersion !== sourcePurlData.version) {
      component.sourcePurl = '';
      warnings.push('The declared source package version does not match the version embedded in its source PURL; the source PURL was removed.');
    }
    return warnings.length ? { ...component, warning: warnings } : component;
  });
}
export function parseSbom(input) {
  if (typeof input !== 'string') throw new TypeError('SBOM content must be text.');
  if (new TextEncoder().encode(input).byteLength > MAX_SBOM_BYTES) throw new Error('SBOM exceeds the 10 MB limit.');
  if (!input.trim()) throw new Error('SBOM file is empty.');
  let document;
  try { document = JSON.parse(input); } catch { throw new Error('SBOM is not valid JSON.'); }
  if (!document || typeof document !== 'object' || Array.isArray(document)) throw new Error('SBOM root must be a JSON object.');
  let format, records;
  if (document.bomFormat === 'CycloneDX') { format='CycloneDX'; records=cyclone(document); }
  else if (typeof document.spdxVersion === 'string') { format='SPDX'; records=spdx(document); }
  else throw new Error('Unrecognised SBOM. Expected CycloneDX or SPDX JSON.');
  if (records.length > MAX_COMPONENTS) throw new Error('SBOM exceeds the 50000 component limit.');
  const components=[], errors=[], warnings=[];
  records.forEach((record,index) => {
    if (record.error) errors.push({index:record.index || index+1,message:record.error});
    else {
      const { warning, ...component } = record;
      components.push(component);
      for (const message of warning || []) warnings.push({index:index+1,message});
    }
  });
  return {format,components,errors,warnings};
}
