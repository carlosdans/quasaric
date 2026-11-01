const MAX_COMPONENTS = 50000;
const str = value => typeof value === 'string' ? value.trim() : '';
function purlInfo(purl) {
  if (!str(purl).startsWith('pkg:')) return {};
  const clean = purl.slice(4).split(/[?#]/)[0];
  const slash = clean.indexOf('/');
  const at = clean.indexOf('@', slash + 1);
  return {
    name: decodeURIComponent((at < 0 ? clean.slice(slash + 1) : clean.slice(slash + 1, at)).split('/').pop() || ''),
    version: at < 0 ? '' : decodeURIComponent(clean.slice(at + 1)),
    ecosystem: clean.slice(0, slash < 0 ? clean.length : slash)
  };
}
function typeFor(name, ecosystem) {
  const value = (name + ' ' + ecosystem).toLowerCase();
  if (/ubuntu|debian|red hat|rhel|rocky|alma|suse|windows server|linux/.test(value)) return 'os';
  if (/nginx|apache|httpd|iis/.test(value)) return 'web';
  if (/php|node(js)?|python|java|ruby|\.net|golang/.test(value)) return 'runtime';
  if (/wordpress|drupal|joomla/.test(value)) return 'cms';
  if (/postgres|mysql|mariadb|mongodb|redis/.test(value)) return 'database';
  return 'library';
}
function cyclone(document) {
  if (document.bomFormat !== 'CycloneDX' || !['1.4','1.5','1.6'].includes(String(document.specVersion))) throw new Error('Unsupported CycloneDX format or version (supported: JSON 1.4–1.6).');
  if (!Array.isArray(document.components)) throw new Error('CycloneDX document has no components array.');
  return document.components.map((item,index) => {
    const purl = purlInfo(item.purl);
    const name = str(item.name) || purl.name;
    if (!name) return { error:'Missing component name.', index:index+1 };
    const refs = Array.isArray(item.externalReferences) ? item.externalReferences : [];
    const cpeRef = refs.find(ref => /cpe/i.test(str(ref.type) + ' ' + str(ref.referenceType)));
    return {
      name, version:str(item.version) || purl.version,
      vendor:str(item.publisher) || str(item.supplier?.name),
      type:typeFor(name,purl.ecosystem), purl:str(item.purl),
      cpe:str(item.cpe) || str(cpeRef?.url) || str(cpeRef?.referenceLocator),
      sourcePackage:'', sourceVersion:'', architecture:''
    };
  });
}
function spdx(document) {
  if (document.spdxVersion !== 'SPDX-2.3' || document.dataLicense !== 'CC0-1.0') throw new Error('Unsupported SPDX format or version (supported: SPDX 2.3 JSON).');
  if (!Array.isArray(document.packages)) throw new Error('SPDX document has no packages array.');
  return document.packages.map((item,index) => {
    const refs = Array.isArray(item.externalRefs) ? item.externalRefs : [];
    const purlRef = refs.find(ref => /purl/i.test(str(ref.referenceType)));
    const cpeRef = refs.find(ref => /cpe/i.test(str(ref.referenceType)));
    const purl = purlInfo(purlRef?.referenceLocator);
    const name = str(item.name) || purl.name;
    if (!name) return { error:'Missing package name.', index:index+1 };
    return {
      name, version:str(item.versionInfo) || purl.version,
      vendor:str(item.supplier).replace(/^Organization:\\s*/i,'') || str(item.originator).replace(/^(Organization|Person):\\s*/i,''),
      type:typeFor(name,purl.ecosystem), purl:str(purlRef?.referenceLocator),
      cpe:str(cpeRef?.referenceLocator), sourcePackage:'', sourceVersion:'', architecture:''
    };
  });
}
export function parseSbom(input) {
  if (typeof input !== 'string') throw new TypeError('SBOM content must be text.');
  if (!input.trim()) throw new Error('SBOM file is empty.');
  let document;
  try { document = JSON.parse(input); } catch { throw new Error('SBOM is not valid JSON.'); }
  if (!document || typeof document !== 'object' || Array.isArray(document)) throw new Error('SBOM root must be a JSON object.');
  let format, records;
  if (document.bomFormat === 'CycloneDX') { format='CycloneDX'; records=cyclone(document); }
  else if (typeof document.spdxVersion === 'string') { format='SPDX'; records=spdx(document); }
  else throw new Error('Unrecognised SBOM. Expected CycloneDX or SPDX JSON.');
  if (records.length > MAX_COMPONENTS) throw new Error('SBOM exceeds the 50000 component limit.');
  const components=[], errors=[];
  records.forEach((record,index) => {
    if (record.error) errors.push({index:record.index || index+1,message:record.error});
    else components.push(record);
  });
  return {format,components,errors};
}
