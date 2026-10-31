import React from 'react';
import { useMemo, useState } from 'react';
import { analyzeInventory } from './lib/correlation.js';
import { toCsv } from './lib/csv.js';
import { createAnalysisSnapshot, compareAnalysisSnapshots, loadAnalysisHistory, saveAnalysisHistory } from './lib/analysisHistory.js';
import { suggestedComponentType, normalizeComponentType } from './lib/componentTypes.js';
import {
  Activity, AlertTriangle, ArrowDownRight, ArrowUpRight, Bell, BookOpen,
  Check, ChevronDown, ChevronRight, CircleHelp, ClipboardList, Cloud,
  Code2, Database, Download, FileDown, FileText, Filter, Globe2, Layers3,
  LockKeyhole, Menu, Plus, Search, Server, Settings2, Shield, ShieldAlert,
  ShieldCheck, SlidersHorizontal, Sparkles, Trash2, X
} from 'lucide-react';

const copy = {
  es: {
    platform: 'Plataforma de inteligencia de seguridad', overview: 'Resumen', inventory: 'Inventario',
    vulnerabilities: 'Vulnerabilidades', reports: 'Informes', settings: 'Configuración',
    workspace: 'ESPACIO DE TRABAJO', overviewTitle: 'Resumen de seguridad',
    subtitle: 'Visibilidad de vulnerabilidades en los componentes de tu tecnología.',
    newAnalysis: 'Nuevo análisis', components: 'Componentes', uniqueCves: 'CVE únicas',
    critical: 'Críticas', kev: 'En catálogo KEV', riskOverview: 'Panorama de exposición',
    severity: 'Distribución por severidad', technologyMap: 'Mapa tecnológico',
    recentFindings: 'Hallazgos recientes', viewAll: 'Ver todos', component: 'Componente',
    version: 'Versión', findings: 'Hallazgos', status: 'Estado', action: 'Acción',
    demo: 'Datos de demostración', demoText: 'Estos datos son ilustrativos; todavía no son resultados de consultas a fuentes de vulnerabilidades.',
    addComponent: 'Añadir componente', componentName: 'Nombre del componente',
    chooseType: 'Tipo', versionLabel: 'Versión exacta', vendor: 'Fabricante / distribución', sourcePackageLabel: 'Paquete fuente Ubuntu (opcional)', sourceVersionLabel: 'Versión del paquete fuente Ubuntu (opcional)', architectureLabel: 'Arquitectura Ubuntu (opcional)', sourcePackageHelp: 'En Ubuntu, el nombre y la versión del paquete binario no siempre coinciden con los del paquete fuente. Ejecuta este comando localmente y copia los campos correspondientes, incluida la arquitectura. No envíes el inventario completo.',
    add: 'Añadir', cancel: 'Cancelar', empty: 'Aún no hay componentes en tu inventario.',
    emptyHint: 'Añade tecnologías y versiones para preparar tu primer análisis.',
    maxReached: 'El inventario admite un máximo de 10 componentes por análisis.',
    remove: 'Eliminar', search: 'Buscar CVE o componente…', all: 'Todos',
    confirmed: 'Requiere verificación', possible: 'Coincidencia posible',
    identified: 'Versión no identificada', ready: 'Pendiente de análisis',
    os: 'Sistema operativo', web: 'Servidor web', runtime: 'Runtime',
    cms: 'CMS', database: 'Base de datos', library: 'Librería / dependencia',
    other: 'Otro', noResults: 'No hay resultados para esta búsqueda.',
    analysisTitle: 'Inventario tecnológico', analysisDesc: 'Declara manualmente los componentes y sus versiones. Quasaric no escanea tus servidores.',
    privacyNote: 'Tu inventario permanece en este navegador. No introduzcas contraseñas, tokens ni secretos.',
    language: 'Idioma', spanish: 'Español', english: 'English',
    export: 'Exportar inventario CSV', localSaved: 'Guardado localmente',
    sourceNotice: 'Motor de correlación y conectores de fuentes en desarrollo.',
    priority: 'Prioridad', exposure: 'Exposición', noScan: 'Sin escaneos activos',
    noScanText: 'Quasaric analiza los datos que proporcionas; no realiza conexiones de reconocimiento ni pruebas sobre tus sistemas.',
    footer: 'Inteligencia de vulnerabilidades, con transparencia sobre los datos y sus límites.',
    help: 'Ayuda', product: 'Producto',
    reportSubtitle: 'Genera un informe local del inventario y del último análisis disponible.',
    printReport: 'Imprimir / Guardar PDF',
    reportTitle: 'Informe de seguridad',
    reportGenerated: 'Generado',
    reportInventory: 'Inventario analizado',
    reportFindings: 'Hallazgos del último análisis',
    reportNoComponents: 'No hay componentes en el inventario.',
    reportNoAnalysis: 'Todavía no hay resultados. Ejecuta un análisis para incluir hallazgos.',
    reportPrivacy: 'Informe generado en este navegador. El inventario y los resultados no se envían a un servidor.',
    reportType: 'Tipo', reportVersion: 'Versión', reportVendor: 'Fabricante / distribución',
    reportCve: 'CVE', reportDescription: 'Descripción', reportSeverity: 'Severidad',
    reportScore: 'CVSS', reportEpss: 'EPSS', reportKev: 'CISA KEV',
    reportApplicability: 'Aplicabilidad', reportComponents: 'Componentes', reportSources: 'Fuentes',
    compareTitle: 'Cambios desde el análisis anterior',
    compareFirst: 'Este es el primer análisis guardado. El siguiente permitirá comparar la evolución.',
    compareAdded: 'Exposiciones nuevas', compareResolved: 'Ya no detectadas',
    compareRetained: 'Sin cambios de presencia', compareChanged: 'Datos modificados',
    compareNone: 'No hay diferencias de exposición entre los dos últimos análisis.',
    compareAddedLabel: 'Nueva', compareResolvedLabel: 'Ya no detectada',
    compareChangedLabel: 'Datos modificados', comparePrevious: 'Anterior',
    compareCurrent: 'Actual', compareComponent: 'Componente afectado',
    compareChange: 'Cambio', compareBefore: 'Antes', compareAfter: 'Ahora',
    comparePrint: 'Resumen comparativo'
  },
  en: {
    platform: 'SECURITY INTELLIGENCE PLATFORM', overview: 'Overview', inventory: 'Inventory',
    vulnerabilities: 'Vulnerabilities', reports: 'Reports', settings: 'Settings',
    workspace: 'WORKSPACE', overviewTitle: 'Security overview',
    subtitle: 'Vulnerability visibility across your technology stack.',
    newAnalysis: 'New analysis', components: 'Components', uniqueCves: 'Unique CVEs',
    critical: 'Critical', kev: 'In KEV catalog', riskOverview: 'Exposure overview',
    severity: 'Severity distribution', technologyMap: 'Technology map',
    recentFindings: 'Recent findings', viewAll: 'View all', component: 'Component',
    version: 'Version', findings: 'Findings', status: 'Status', action: 'Action',
    demo: 'Demonstration data', demoText: 'These figures are illustrative; they are not results from live vulnerability-source queries.',
    addComponent: 'Add component', componentName: 'Component name',
    chooseType: 'Type', versionLabel: 'Exact version', vendor: 'Vendor / distribution', sourcePackageLabel: 'Ubuntu source package (optional)', sourceVersionLabel: 'Ubuntu source package version (optional)', architectureLabel: 'Ubuntu architecture (optional)', sourcePackageHelp: 'On Ubuntu, the installed binary package name and version do not always match the source package name and version. Run this command locally and copy the corresponding fields, including architecture. Do not send the full inventory.',
    add: 'Add', cancel: 'Cancel', empty: 'There are no components in your inventory yet.',
    emptyHint: 'Add technologies and versions to prepare your first analysis.',
    maxReached: 'An analysis supports up to 10 components.',
    remove: 'Remove', search: 'Search CVE or component…', all: 'All',
    confirmed: 'Requires verification', possible: 'Possible match',
    identified: 'Version not identified', ready: 'Awaiting analysis',
    os: 'Operating system', web: 'Web server', runtime: 'Runtime',
    cms: 'CMS', database: 'Database', library: 'Library / dependency',
    other: 'Other', noResults: 'No results for this search.',
    analysisTitle: 'Technology inventory', analysisDesc: 'Enter components and their versions manually. Quasaric does not scan your servers.',
    privacyNote: 'Your inventory stays in this browser. Do not enter passwords, tokens or secrets.',
    language: 'Language', spanish: 'Español', english: 'English',
    export: 'Export inventory CSV', localSaved: 'Saved locally',
    sourceNotice: 'Correlation engine and source connectors are under development.',
    priority: 'Priority', exposure: 'Exposure', noScan: 'No active scanning',
    noScanText: 'Quasaric analyses the data you provide; it does not perform reconnaissance connections or tests against your systems.',
    footer: 'Vulnerability intelligence, with transparency about data and limitations.',
    help: 'Help', product: 'Product',
    reportSubtitle: 'Create a local report from your inventory and the latest available analysis.',
    printReport: 'Print / Save PDF',
    reportTitle: 'Security report',
    reportGenerated: 'Generated',
    reportInventory: 'Assessed inventory',
    reportFindings: 'Findings from the latest analysis',
    reportNoComponents: 'There are no components in the inventory.',
    reportNoAnalysis: 'No results yet. Run an analysis to include findings.',
    reportPrivacy: 'Report generated in this browser. Inventory and results are not sent to a server.',
    reportType: 'Type', reportVersion: 'Version', reportVendor: 'Vendor / distribution',
    reportCve: 'CVE', reportDescription: 'Description', reportSeverity: 'Severity',
    reportScore: 'CVSS', reportEpss: 'EPSS', reportKev: 'CISA KEV',
    reportApplicability: 'Applicability', reportComponents: 'Components', reportSources: 'Sources',
    compareTitle: 'Changes since the previous analysis',
    compareFirst: 'This is the first saved analysis. The next run will enable comparison.',
    compareAdded: 'New exposures', compareResolved: 'No longer detected',
    compareRetained: 'Presence unchanged', compareChanged: 'Data changed',
    compareNone: 'There are no exposure differences between the latest two analyses.',
    compareAddedLabel: 'New', compareResolvedLabel: 'No longer detected',
    compareChangedLabel: 'Data changed', comparePrevious: 'Previous',
    compareCurrent: 'Current', compareComponent: 'Affected component',
    compareChange: 'Change', compareBefore: 'Before', compareAfter: 'Now',
    comparePrint: 'Comparison summary'
  }
};

const types = ['os', 'web', 'runtime', 'cms', 'database', 'library', 'other'];
const typeNames = { os: 'OS', web: 'Web', runtime: 'Runtime', cms: 'CMS', database: 'DB', library: 'Lib', other: 'Other' };
const iconFor = (type) => ({ os: Server, web: Cloud, runtime: Code2, cms: Layers3, database: Database, library: Code2, other: Layers3 }[type] || Layers3);

const sampleFindings = [
  { id: 'CVE-2024-21762', title: 'Fortinet FortiOS SSL-VPN out-of-bounds write', severity: 'Critical', score: '9.6', component: 'Ejemplo · servidor perimetral', state: 'KEV', date: '2024' },
  { id: 'CVE-2023-44487', title: 'HTTP/2 Rapid Reset', severity: 'High', score: '7.5', component: 'Ejemplo · servidor web', state: 'Verificar', date: '2023' },
  { id: 'CVE-2021-44228', title: 'Apache Log4j2 remote code execution', severity: 'Critical', score: '10.0', component: 'Ejemplo · dependencia Java', state: 'KEV', date: '2021' }
];

function App() {
  const [lang, setLang] = useState('es');
  const [active, setActive] = useState('overview');
  const [items, setItems] = useState(() => {
    try { return JSON.parse(localStorage.getItem('quasaric-inventory') || '[]'); }
    catch { return []; }
  });
  const [showAdd, setShowAdd] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [query, setQuery] = useState('');
  const [analysis, setAnalysis] = useState(null);
  const [analysisHistory, setAnalysisHistory] = useState(() => loadAnalysisHistory());
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState('');
  const [analysisProgress, setAnalysisProgress] = useState({ completed: 0, total: 0 });
  const [form, setForm] = useState({ name: '', type: 'other', version: '', vendor: '', sourcePackage: '', sourceVersion: '', architecture: '' });
  const suggestedType = suggestedComponentType(form.name);
  const t = copy[lang];

  const persist = (next) => {
    setItems(next);
    try { localStorage.setItem('quasaric-inventory', JSON.stringify(next)); } catch { /* storage may be unavailable */ }
  };
  const latestComparison = useMemo(() => analysisHistory.length >= 2
    ? compareAnalysisSnapshots(analysisHistory[1], analysisHistory[0])
    : null, [analysisHistory]);

  const filtered = useMemo(() => {
    const live = analysis?.findings?.map(f => ({
      id: f.id,
      title: f.description,
      component: f.components.map(x => x.component.name).join(', '),
      severity: f.severity || 'Unknown',
      score: f.cvss ?? '—',
      state: f.kev ? 'KEV' : 'Candidate',
      live: true
    }));
    const rows = live || sampleFindings;
    return rows.filter(x => (x.id + x.title + x.component).toLowerCase().includes(query.toLowerCase()));
  }, [analysis, query]);

  const runAnalysis = async () => {
    if (!items.length || analyzing) return;
    setAnalyzing(true); setAnalysisError(''); setAnalysis(null); setAnalysisProgress({ completed: 0, total: items.length });
    try {
      const result = await analyzeInventory(items, { onProgress: setAnalysisProgress });
      setAnalysis(result);
      const snapshot = createAnalysisSnapshot(result, items);
      const nextHistory = [snapshot, ...analysisHistory.filter(entry => entry.id !== snapshot.id)].slice(0, 10);
      setAnalysisHistory(nextHistory);
      saveAnalysisHistory(nextHistory);
    } catch (error) { setAnalysisError(error.message || 'Analysis failed'); }
    finally { setAnalyzing(false); }
  };

  const addItem = (event) => {
    event.preventDefault();
    if (!form.name.trim() || items.length >= 10) return;
    persist([...items, { ...normalizeComponentType(form), id: crypto.randomUUID(), createdAt: new Date().toISOString() }]);
    setForm({ name: '', type: 'other', version: '', vendor: '', sourcePackage: '', sourceVersion: '', architecture: '' });
    setShowAdd(false);
  };

  const downloadCsv = (rows, filename) => {
    const blob = new Blob([toCsv(rows)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportCsv = () => {
    const rows = [['name','type','version','vendor','sourcePackage','sourceVersion','architecture'], ...items.map(x => [x.name, x.type, x.version, x.vendor, x.sourcePackage || '', x.sourceVersion || '', x.architecture || ''])];
    downloadCsv(rows, 'quasaric-inventory.csv');
  };

  const exportFindingsCsv = () => {
    if (!analysis?.findings?.length) return;
    const rows = [
      ['CVE','Description','CVSS','Severity','EPSS','CISA KEV','Applicability','Components','CVSS vector','NVD URL','Evidence by source (JSON)'],
      ...analysis.findings.map(f => [
        f.id, f.description, f.cvss ?? '', f.severity ?? '', f.epss ?? '',
        f.kev ? 'yes' : 'no', f.applicabilityStatus,
        f.components.map(x => x.component.name + ' ' + x.component.version).join('; '),
        f.vector ?? '', 'https://nvd.nist.gov/vuln/detail/' + f.id,
        JSON.stringify(f.components.flatMap(component => component.evidence || []))
      ])
    ];
    downloadCsv(rows, 'quasaric-findings.csv');
  };

  const nav = [
    { id: 'overview', label: t.overview, icon: Activity },
    { id: 'inventory', label: t.inventory, icon: ClipboardList },
    { id: 'vulnerabilities', label: t.vulnerabilities, icon: ShieldAlert },
    { id: 'reports', label: t.reports, icon: FileText }
  ];

  return (
    <div className="app-shell">
      <aside className={'sidebar ' + (mobileNav ? 'sidebar-open' : '')}>
        <div className="brand">
          <img className="brand-mark" src="/favicon.svg" alt="" />
          <div><div className="brand-name">Quasaric<span>.com</span></div><div className="brand-sub">{t.platform}</div></div>
          <button className="icon-btn mobile-close" onClick={() => setMobileNav(false)} aria-label="Close menu"><X size={18}/></button>
        </div>
        <div className="nav-caption">{t.workspace}</div>
        <nav className="main-nav">
          {nav.map(({ id, label, icon: Icon }) => <button key={id} className={'nav-link ' + (active === id ? 'active' : '')} onClick={() => { setActive(id); setMobileNav(false); }}><Icon size={17}/><span>{label}</span>{id === 'vulnerabilities' && <span className="nav-soon">BETA</span>}</button>)}
        </nav>
        <div className="sidebar-bottom">
          <div className="privacy-card"><div className="privacy-icon"><LockKeyhole size={16}/></div><div><strong>{t.noScan}</strong><p>{t.noScanText}</p></div></div>
          <button className={'nav-link ' + (active === 'settings' ? 'active' : '')} onClick={() => setActive('settings')}><Settings2 size={17}/><span>{t.settings}</span></button>
          <div className="sidebar-user"><div className="avatar">Q</div><div className="user-copy"><strong>Quasaric</strong><span>Personal workspace</span></div><ChevronDown size={15}/></div>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <button className="icon-btn mobile-menu" onClick={() => setMobileNav(true)} aria-label="Open menu"><Menu size={19}/></button>
          <div className="breadcrumb"><span>Quasaric</span><ChevronRight size={14}/><strong>{active === 'overview' ? t.overview : active === 'inventory' ? t.inventory : active === 'vulnerabilities' ? t.vulnerabilities : active === 'reports' ? t.reports : t.settings}</strong></div>
          <div className="top-actions">
            <span className="status-pill"><span className="status-dot"/> {t.localSaved}</span>
            <button className="language-btn" onClick={() => setLang(lang === 'es' ? 'en' : 'es')} aria-label={t.language}><Globe2 size={15}/><span>{lang.toUpperCase()}</span></button>
            <button className="icon-btn" aria-label="Help"><CircleHelp size={18}/></button>
          </div>
        </header>

        <div className="content">
          {active === 'overview' && <>
            <div className="page-heading"><div><div className="eyebrow">{t.platform}</div><h1>{t.overviewTitle}</h1><p>{t.subtitle}</p></div><button className="primary-btn" onClick={() => { setActive('inventory'); setShowAdd(true); }}><Plus size={17}/>{t.newAnalysis}</button></div>
            <div className="demo-banner"><Sparkles size={16}/><div><strong>{t.demo}</strong><span>{t.demoText}</span></div></div>
            <section className="metric-grid">
              <Metric icon={Layers3} label={t.components} value={String(items.length)} hint={lang === 'es' ? 'En tu inventario' : 'In your inventory'} />
              <Metric icon={ShieldAlert} label={t.uniqueCves} value="—" hint={t.sourceNotice} />
              <Metric icon={AlertTriangle} label={t.critical} value="—" hint={lang === 'es' ? 'Sin correlación todavía' : 'No correlation yet'} />
              <Metric icon={ShieldCheck} label={t.kev} value="—" hint={lang === 'es' ? 'CISA Known Exploited Vulnerabilities' : 'CISA Known Exploited Vulnerabilities'} />
            </section>
            <div className="dashboard-grid">
              <section className="panel exposure-panel"><PanelHead title={t.riskOverview} detail={t.sourceNotice}/><div className="empty-visual"><div className="orbit orbit-one"/><div className="orbit orbit-two"/><div className="orbit-core"><Shield size={27}/></div><span className="orbit-label label-top">{lang === 'es' ? 'APLICABILIDAD' : 'APPLICABILITY'}</span><span className="orbit-label label-bottom">{lang === 'es' ? 'INTELIGENCIA' : 'INTELLIGENCE'}</span></div><div className="panel-foot"><span><i className="legend-dot blue"/> {lang === 'es' ? 'Inventario local' : 'Local inventory'}</span><span><i className="legend-dot muted"/> {lang === 'es' ? 'Fuentes pendientes' : 'Sources pending'}</span></div></section>
              <section className="panel severity-panel"><PanelHead title={t.severity} detail={lang === 'es' ? 'Se mostrará tras el análisis' : 'Available after analysis'}/><div className="severity-empty"><div className="severity-bars"><i/><i/><i/><i/></div><strong>—</strong><span>{lang === 'es' ? 'Sin datos verificados' : 'No verified data'}</span></div><div className="severity-legend"><span><i className="sev critical"/>Critical</span><span><i className="sev high"/>High</span><span><i className="sev medium"/>Medium</span><span><i className="sev low"/>Low</span></div></section>
            </div>
            <section className="panel inventory-panel"><PanelHead title={t.technologyMap} action={<button className="text-btn" onClick={() => setActive('inventory')}>{t.viewAll}<ChevronRight size={14}/></button>}/>{items.length ? <div className="component-grid">{items.slice(0,5).map(item => <ComponentChip key={item.id} item={item}/>)}</div> : <div className="empty-state"><div className="empty-icon"><Layers3 size={21}/></div><strong>{t.empty}</strong><span>{t.emptyHint}</span><button className="secondary-btn" onClick={() => { setActive('inventory'); setShowAdd(true); }}><Plus size={15}/>{t.addComponent}</button></div>}</section>
            <section className="panel findings-panel"><PanelHead title={t.recentFindings} action={<span className="muted-label">{t.demo}</span>}/><div className="table-wrap"><table><thead><tr><th>CVЕ ID</th><th>{t.component}</th><th>{t.status}</th><th>CVSS</th></tr></thead><tbody>{sampleFindings.map(f => <tr key={f.id}><td><strong className="cve-id">{f.id}</strong><span className="finding-title">{f.title}</span></td><td>{f.component}</td><td><span className={'tag ' + (f.state === 'KEV' ? 'tag-red' : 'tag-amber')}>{f.state}</span></td><td className="score">{f.score}</td></tr>)}</tbody></table></div></section>
          </>}

          {active === 'inventory' && <><div className="page-heading"><div><div className="eyebrow">{t.workspace}</div><h1>{t.analysisTitle}</h1><p>{t.analysisDesc}</p></div><div className="heading-actions"><button className="secondary-btn" onClick={exportCsv} disabled={!items.length}><Download size={15}/>{t.export}</button><button className="primary-btn" onClick={runAnalysis} disabled={!items.length || analyzing}><Activity size={16}/>{analyzing ? (lang === 'es' ? 'Analizando…' : 'Analyzing…') : (lang === 'es' ? 'Analizar inventario' : 'Analyze inventory')}</button><button className="primary-btn" onClick={() => setShowAdd(true)} disabled={items.length >= 10}><Plus size={17}/>{t.addComponent}</button></div></div><div className="notice"><LockKeyhole size={17}/><span>{t.privacyNote}</span></div><section className="panel inventory-list-panel"><PanelHead title={t.inventory} detail={items.length + ' / 10'}/>{items.length ? <div className="inventory-list">{items.map(item => <div className="inventory-row" key={item.id}><div className="component-icon"><IconFor type={item.type}/></div><div className="inventory-name"><strong>{item.name}</strong><span>{t[item.type] || item.type} {item.vendor ? '· ' + item.vendor : ''} {item.sourcePackage ? '· src: ' + item.sourcePackage : ''} {item.sourceVersion ? '· src ver: ' + item.sourceVersion : ''} {item.architecture ? '· arch: ' + item.architecture : ''}</span></div><div className="inventory-version"><span>{t.version}</span><strong>{item.version || '—'}</strong></div><span className="tag tag-neutral">{t.ready}</span><button className="icon-btn danger-hover" onClick={() => persist(items.filter(x => x.id !== item.id))} aria-label={t.remove}><Trash2 size={16}/></button></div>)}</div> : <div className="empty-state large"><div className="empty-icon"><ClipboardList size={22}/></div><strong>{t.empty}</strong><span>{t.emptyHint}</span><button className="primary-btn" onClick={() => setShowAdd(true)}><Plus size={16}/>{t.addComponent}</button></div>}</section>{analyzing && <section className="panel analysis-progress"><strong>{lang === 'es' ? 'Consultando fuentes públicas…' : 'Querying public sources…'}</strong><span>{analysisProgress.completed} / {analysisProgress.total} {lang === 'es' ? 'componentes consultados' : 'components queried'}</span><div className="progress-track"><i style={{ width: (analysisProgress.total ? analysisProgress.completed / analysisProgress.total * 100 : 0) + '%' }}/></div></section>}{analysisError && <div className="error-banner"><AlertTriangle size={16}/>{analysisError}</div>}{analysis && <section className="panel results-panel"><PanelHead title={lang === 'es' ? 'Resultados de correlación' : 'Correlation results'} detail={new Date(analysis.analyzedAt).toLocaleString(lang === 'es' ? 'es-ES' : 'en-US')}/><p className="result-disclaimer">{analysis.disclaimer}</p><div className="source-status">{Object.entries(analysis.sources).map(([source,status]) => <span key={source}><i className={status === 'queried' ? 'source-ok' : 'source-warn'}/>{source.toUpperCase()}: {status}</span>)}</div>{analysis.errors.length > 0 && <div className="error-banner"><AlertTriangle size={15}/>{analysis.errors.length} {lang === 'es' ? 'errores de consulta; los resultados pueden estar incompletos.' : 'source errors; results may be incomplete.'}</div>}{analysis.limits?.length > 0 && <div className="error-banner"><AlertTriangle size={15}/>{lang === 'es' ? `NVD ha alcanzado el límite de 400 resultados en ${analysis.limits.length} consulta(s). Los hallazgos son parciales y pueden faltar CVE; reduce el inventario o revisa NVD directamente.` : `NVD reached the 400-result cap in ${analysis.limits.length} quer(ies). Findings are partial and CVEs may be missing; narrow the inventory or review NVD directly.`}</div>}{analysis.findings.length ? <div className="table-wrap"><table><thead><tr><th>CVE</th><th>{lang === 'es' ? 'Severidad' : 'Severity'}</th><th>CVSS</th><th>EPSS</th><th>KEV</th><th>{lang === 'es' ? 'Aplicabilidad' : 'Applicability'}</th></tr></thead><tbody>{analysis.findings.map(f => <tr key={f.id}><td><strong className="cve-id"><a href={`https://nvd.nist.gov/vuln/detail/${f.id}`} target="_blank" rel="noreferrer">{f.id}</a></strong><span className="finding-title">{f.description}</span>{f.vector && <span className="finding-title">CVSS vector: {f.vector}</span>}{f.references?.length > 0 && <span className="finding-title"><a href={f.references[0].url} target="_blank" rel="noreferrer">{lang === 'es' ? 'Referencia / aviso del fabricante' : 'Reference / vendor advisory'}</a></span>}{f.kev && f.kevRequiredAction && <span className="finding-title">{lang === 'es' ? 'Acción CISA: ' : 'CISA action: '}{f.kevRequiredAction}</span>}</td><td>{f.severity || '—'}</td><td className="score">{f.cvss ?? '—'}</td><td>{f.epss == null ? '—' : (f.epss * 100).toFixed(2) + '%'}</td><td>{f.kev ? <span className="tag tag-red">CISA KEV</span> : '—'}{f.kev && f.kevDueDate && <span className="finding-title">{lang === 'es' ? 'Fecha límite: ' : 'Due: '}{f.kevDueDate}</span>}</td><td><span className="tag tag-amber">{({ possible: lang === 'es' ? 'Posible' : 'Possible', affected: lang === 'es' ? 'Afectado según Ubuntu OSV' : 'Affected per Ubuntu OSV', patched_candidate: lang === 'es' ? 'Parche candidato · verificar' : 'Patch candidate · verify', unaffected: lang === 'es' ? 'No afectado según Ubuntu OSV' : 'Not affected per Ubuntu OSV', needs_review: lang === 'es' ? 'Verificar' : 'Review' })[f.applicabilityStatus] || (lang === 'es' ? 'Verificar' : 'Review')}</span><span className="finding-title">{f.components.map(x => x.component.name + ' — ' + (x.applicability.status === 'affected' ? (lang === 'es' ? 'afectado' : 'affected') : x.applicability.status === 'patched_candidate' ? (lang === 'es' ? 'parche candidato' : 'patch candidate') : x.applicability.status === 'unaffected' ? (lang === 'es' ? 'no afectado' : 'not affected') : (lang === 'es' ? 'verificar' : 'review'))).join(', ')}</span>{f.components.filter(x => x.ubuntuOsv).map(x => <span className="finding-title" key={'osv-' + x.component.id}>Ubuntu OSV · {x.component.name}: {({ affected: lang === 'es' ? 'afectado' : 'affected', patched_candidate: lang === 'es' ? 'parche candidato' : 'patch candidate', unaffected: lang === 'es' ? 'no afectado' : 'not affected', needs_review: lang === 'es' ? 'requiere revisión' : 'needs review' })[x.ubuntuOsv.status] || x.ubuntuOsv.status}</span>)}{f.components.filter(x => x.ubuntuVex).map(x => <span className="finding-title" key={x.component.id}>OpenVEX · {x.component.name}: {({ fixed: lang === 'es' ? 'fijo según VEX' : 'fixed per VEX', affected: lang === 'es' ? 'afectado según VEX' : 'affected per VEX', not_affected: lang === 'es' ? 'no afectado según VEX' : 'not affected per VEX', under_investigation: lang === 'es' ? 'en investigación' : 'under investigation', needs_review: lang === 'es' ? 'requiere revisión' : 'needs review', unavailable: lang === 'es' ? 'no disponible' : 'unavailable' })[x.ubuntuVex.status] || x.ubuntuVex.status}{x.ubuntuVex.documentTimestamp && <> · {new Date(x.ubuntuVex.documentTimestamp).toLocaleString(lang === 'es' ? 'es-ES' : 'en-US')}</>}{x.ubuntuVex.documentUrl && <> · <a href={x.ubuntuVex.documentUrl} target="_blank" rel="noreferrer">{lang === 'es' ? 'Documento Canonical' : 'Canonical document'}</a></>}{x.ubuntuVex.reason && <span> · {x.ubuntuVex.reason}</span>}{x.ubuntuVex.consistency?.status === 'conflicting' && <span> · <strong>{lang === 'es' ? 'CONFLICTO ENTRE FUENTES' : 'SOURCE CONFLICT'}</strong>: {x.ubuntuVex.consistency.reason}</span>}</span>)}{f.components.map(x => <details className="source-evidence-details" key={'evidence-' + x.component.id}><summary>{lang === 'es' ? 'Trazabilidad de evidencias' : 'Evidence traceability'} · {x.component.name} ({x.evidence?.length || 0})</summary>{x.evidence?.length ? x.evidence.map((entry, index) => <div className="source-evidence-item" key={entry.source + '-' + index}><strong>{entry.source}</strong><span>{lang === 'es' ? 'Estado' : 'Status'}: {entry.status || '—'}</span>{entry.advisoryId && <span>{lang === 'es' ? 'Identificador' : 'Identifier'}: {entry.advisoryId}</span>}{entry.publishedAt && <span>{lang === 'es' ? 'Publicado' : 'Published'}: {entry.publishedAt}</span>}{entry.updatedAt && <span>{lang === 'es' ? 'Actualizado' : 'Updated'}: {entry.updatedAt}</span>}{entry.documentTimestamp && <span>{lang === 'es' ? 'Fecha del documento' : 'Document timestamp'}: {entry.documentTimestamp}</span>}{entry.documentVersion != null && <span>{lang === 'es' ? 'Versión del documento' : 'Document version'}: {entry.documentVersion}</span>}{entry.product && <span>{entry.product.name || '—'} {entry.product.version ? '@ ' + entry.product.version : ''}{entry.product.architecture ? ' · ' + entry.product.architecture : ''}{entry.product.ecosystem ? ' · ' + entry.product.ecosystem : ''}{entry.product.sourcePackage ? ' · src: ' + entry.product.sourcePackage : ''}{entry.product.sourceVersion ? ' ' + entry.product.sourceVersion : ''}</span>}{entry.reason && <span>{entry.reason}</span>}{entry.url && <a href={entry.url} target="_blank" rel="noreferrer">{lang === 'es' ? 'Abrir fuente' : 'Open source'}</a>}{entry.references?.map((url, refIndex) => <a href={url} target="_blank" rel="noreferrer" key={url + refIndex}>{lang === 'es' ? 'Referencia adicional' : 'Additional reference'} {refIndex + 1}</a>)}</div>) : <span>{lang === 'es' ? 'No hay evidencias fuente adjuntas a este componente.' : 'No source evidence is attached to this component.'}</span>}</details>)}</td></tr>)}</tbody></table></div> : <div className="empty-state"><strong>{lang === 'es' ? 'No se han obtenido candidatos con los filtros actuales.' : 'No candidate matches were returned.'}</strong><span>{lang === 'es' ? 'Esto no demuestra que los componentes estén libres de vulnerabilidades.' : 'This does not prove that the components are vulnerability-free.'}</span></div>}</section>}<div className="inventory-bottom"><span>{t.maxReached}</span><button className="secondary-btn" onClick={exportCsv} disabled={!items.length}><Download size={15}/>{t.export}</button></div></>}

          {active === 'vulnerabilities' && <><div className="page-heading"><div><div className="eyebrow">{t.workspace}</div><h1>{t.vulnerabilities}</h1><p>{t.sourceNotice}</p></div></div>{!analysis && <div className="demo-banner"><Sparkles size={16}/><div><strong>{t.demo}</strong><span>{t.demoText}</span></div></div>}{analysis && <div className="result-disclaimer">{lang === 'es' ? 'Resultados del último análisis en este navegador. Son candidatos que requieren verificación, no confirmaciones.' : 'Results from the latest analysis in this browser. These are candidates requiring verification, not confirmations.'}</div>}<section className="panel findings-panel"><div className="findings-toolbar"><div className="search-field"><Search size={16}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder={t.search}/></div><button className="secondary-btn"><Filter size={15}/>{t.all}<ChevronDown size={14}/></button></div><div className="table-wrap"><table><thead><tr><th>CVЕ ID / {t.component}</th><th>{t.severity}</th><th>CVSS</th><th>{t.status}</th></tr></thead><tbody>{filtered.map(f => <tr key={f.id}><td><strong className="cve-id">{f.live ? <a href={`https://nvd.nist.gov/vuln/detail/${f.id}`} target="_blank" rel="noreferrer">{f.id}</a> : f.id}</strong><span className="finding-title">{f.title}</span><span className="finding-title">{f.component}</span></td><td><span className={'severity-text ' + f.severity.toLowerCase()}>{f.severity}</span></td><td className="score">{f.score}</td><td><span className={'tag ' + (f.state === 'KEV' ? 'tag-red' : 'tag-amber')}>{f.state}</span></td></tr>)}</tbody></table>{!filtered.length && <div className="empty-state">{t.noResults}</div>}</div></section></>}

          {active === 'reports' && <>
            <div className="page-heading">
              <div><div className="eyebrow">{t.workspace}</div><h1>{t.reports}</h1><p>{t.reportSubtitle}</p></div>
              <div className="heading-actions"><button className="primary-btn" onClick={() => window.print()} disabled={!items.length && !analysis?.findings?.length}><FileDown size={16}/>{t.printReport}</button></div>
            </div>

            <section className="panel comparison-panel">
              <div className="comparison-heading"><div><h3>{t.compareTitle}</h3><p>{analysisHistory.length >= 2 ? t.comparePrevious + ': ' + new Date(analysisHistory[1].analyzedAt).toLocaleString() + ' · ' + t.compareCurrent + ': ' + new Date(analysisHistory[0].analyzedAt).toLocaleString() : t.compareFirst}</p></div></div>
              {latestComparison && <>
                <div className="comparison-stats">
                  <div><strong>{latestComparison.counts.added}</strong><span>{t.compareAdded}</span></div>
                  <div><strong>{latestComparison.counts.resolved}</strong><span>{t.compareResolved}</span></div>
                  <div><strong>{latestComparison.counts.retained}</strong><span>{t.compareRetained}</span></div>
                  <div><strong>{latestComparison.counts.changed}</strong><span>{t.compareChanged}</span></div>
                </div>
                {(latestComparison.added.length + latestComparison.resolved.length + latestComparison.changed.length) > 0
                  ? <div className="print-report-table-wrap"><table className="print-report-table"><thead><tr><th>{t.reportCve}</th><th>{t.compareComponent}</th><th>{t.compareChange}</th><th>{t.compareBefore}</th><th>{t.compareAfter}</th></tr></thead><tbody>
                    {[...latestComparison.added.map(x => ({...x, kind:'added'})), ...latestComparison.resolved.map(x => ({...x, kind:'resolved'})), ...latestComparison.changed.map(x => ({...x, kind:'changed'}))].map(item => <tr key={item.key + item.kind}><td>{item.cve}</td><td>{item.component.name} {item.component.version || ''}</td><td>{item.kind === 'added' ? t.compareAddedLabel : item.kind === 'resolved' ? t.compareResolvedLabel : t.compareChangedLabel}</td><td>{item.kind === 'added' ? '—' : item.kind === 'resolved' ? item.severity : item.differences.map(x => x.field + ': ' + (x.before ?? '—')).join('; ')}</td><td>{item.kind === 'resolved' ? '—' : item.kind === 'added' ? item.severity : item.differences.map(x => x.field + ': ' + (x.after ?? '—')).join('; ')}</td></tr>)}
                  </tbody></table></div>
                  : <p className="print-report-empty">{t.compareNone}</p>}
              </>}
            </section>
            <section className="print-report">
              <header className="print-report-header">
                <div><div className="print-report-brand">QUASARIC.COM</div><h2>{t.reportTitle}</h2><p>{t.reportGenerated}: {new Date().toLocaleString(lang === 'es' ? 'es-ES' : 'en-US')}</p></div>
                <span className="print-report-mark">Q</span>
              </header>
              <p className="print-report-notice">{t.reportPrivacy}</p>
              <section className="print-report-section">
                <h3>{t.reportInventory} ({items.length})</h3>
                {items.length ? <div className="print-report-table-wrap"><table className="print-report-table"><thead><tr><th>{t.component}</th><th>{t.reportType}</th><th>{t.reportVersion}</th><th>{t.reportVendor}</th></tr></thead><tbody>{items.map(item => <tr key={item.id}><td>{item.name}</td><td>{item.type}</td><td>{item.version || '—'}</td><td>{item.vendor || '—'}</td></tr>)}</tbody></table></div> : <p className="print-report-empty">{t.reportNoComponents}</p>}
              </section>
              <section className="print-report-section">
                <h3>{t.reportFindings} ({analysis?.findings?.length || 0})</h3>
                {analysis?.findings?.length ? <div className="print-report-table-wrap"><table className="print-report-table"><thead><tr><th>{t.reportCve}</th><th>{t.reportDescription}</th><th>{t.reportSeverity}</th><th>{t.reportScore}</th><th>{t.reportEpss}</th><th>{t.reportKev}</th><th>{t.reportApplicability}</th><th>{t.reportComponents}</th><th>{t.reportSources}</th></tr></thead><tbody>{analysis.findings.map(finding => {
                  const sources = [...new Set(finding.components.flatMap(component => (component.evidence || []).map(evidence => evidence.source).filter(Boolean)))];
                  return <tr key={finding.id}><td className="print-report-cve">{finding.id}</td><td>{finding.description || '—'}</td><td>{finding.severity || '—'}</td><td>{finding.cvss ?? '—'}</td><td>{finding.epss ?? '—'}</td><td>{finding.kev ? 'Yes' : 'No'}</td><td>{finding.applicabilityStatus || '—'}</td><td>{finding.components.map(component => component.component.name + ' ' + (component.component.version || '')).join('; ')}</td><td>{sources.join(', ') || '—'}</td></tr>;
                })}</tbody></table></div> : <p className="print-report-empty">{t.reportNoAnalysis}</p>}
              </section>
              {latestComparison && <section className="print-report-section"><h3>{t.comparePrint}</h3><p className="print-report-empty">{t.compareAdded}: {latestComparison.counts.added} · {t.compareResolved}: {latestComparison.counts.resolved} · {t.compareRetained}: {latestComparison.counts.retained} · {t.compareChanged}: {latestComparison.counts.changed}</p></section>}
              <footer className="print-report-footer">Quasaric · {window.location.origin}</footer>
            </section>
            <section className="panel report-card"><div className="report-icon"><FileDown size={23}/></div><div><h3>{lang === 'es' ? 'Exportar inventario' : 'Export inventory'}</h3><p>{lang === 'es' ? 'Descarga los componentes que has añadido en formato CSV.' : 'Download your declared components as CSV.'}</p></div><button className="secondary-btn" onClick={exportCsv} disabled={!items.length}><Download size={16}/>{lang === 'es' ? 'Inventario CSV' : 'Inventory CSV'}</button></section>
            <section className="panel report-card"><div className="report-icon"><ShieldAlert size={23}/></div><div><h3>{lang === 'es' ? 'Exportar hallazgos' : 'Export findings'}</h3><p>{lang === 'es' ? 'Descarga los candidatos CVE del último análisis con CVSS, EPSS, KEV y evidencias por fuente.' : 'Download candidate CVEs from the latest analysis with CVSS, EPSS, KEV and source evidence.'}</p></div><button className="secondary-btn" onClick={exportFindingsCsv} disabled={!analysis?.findings?.length}><Download size={16}/>{lang === 'es' ? 'Hallazgos CSV' : 'Findings CSV'}</button></section>
          </>}

          {active === 'settings' && <><div className="page-heading"><div><div className="eyebrow">{t.workspace}</div><h1>{t.settings}</h1><p>{lang === 'es' ? 'Preferencias de idioma y datos locales.' : 'Language and local data preferences.'}</p></div></div><section className="panel settings-panel"><h3>{t.language}</h3><p>{lang === 'es' ? 'Selecciona el idioma de la interfaz.' : 'Choose the interface language.'}</p><div className="setting-options"><button className={lang === 'es' ? 'selected' : ''} onClick={() => setLang('es')}>Español {lang === 'es' && <Check size={16}/>}</button><button className={lang === 'en' ? 'selected' : ''} onClick={() => setLang('en')}>English {lang === 'en' && <Check size={16}/>}</button></div><div className="settings-divider"/><h3>{lang === 'es' ? 'Datos del navegador' : 'Browser data'}</h3><p>{lang === 'es' ? 'El inventario se almacena localmente en este navegador.' : 'Your inventory is stored locally in this browser.'}</p><button className="danger-btn" onClick={() => { if (confirm(lang === 'es' ? '¿Eliminar todo el inventario local?' : 'Delete the entire local inventory?')) persist([]); }}><Trash2 size={15}/>{lang === 'es' ? 'Borrar inventario local' : 'Clear local inventory'}</button></section></>}
          <footer className="footer"><span>© {new Date().getFullYear()} Quasaric · {t.footer}</span><a href="mailto:contacto@quasaric.com">contacto@quasaric.com</a></footer>
        </div>
      </main>

      {showAdd && <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) setShowAdd(false); }}><form className="modal" onSubmit={addItem}><div className="modal-head"><div><div className="eyebrow">QUASARIC</div><h2>{t.addComponent}</h2></div><button type="button" className="icon-btn" onClick={() => setShowAdd(false)} aria-label="Close"><X size={18}/></button></div><label>{t.componentName}<input required autoFocus value={form.name} onChange={e => { const name = e.target.value; setForm(current => ({ ...current, name, type: suggestedComponentType(name) || current.type })); }} placeholder="e.g. PHP, NGINX"/></label><label>{t.chooseType}<select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>{types.map(type => <option key={type} value={type}>{t[type]}</option>)}</select></label>{suggestedType && suggestedType !== form.type && <div className="modal-note"><AlertTriangle size={15}/>{lang === 'es' ? `Tipo recomendado para ${form.name}: ${t[suggestedType]}. Se corregirá automáticamente al añadir.` : `Recommended type for ${form.name}: ${t[suggestedType]}. It will be corrected automatically when added.`}</div>}<label>{t.versionLabel}<input value={form.version} onChange={e => setForm({ ...form, version: e.target.value })} placeholder="e.g. 1.24.0"/></label><label>{t.vendor}<input value={form.vendor} onChange={e => setForm({ ...form, vendor: e.target.value })} placeholder={form.name.trim().toLowerCase() === 'ubuntu' ? 'Ubuntu:24.04:LTS' : 'e.g. Ubuntu:24.04:LTS'}/></label><label>{t.sourcePackageLabel}<input value={form.sourcePackage || ''} onChange={e => setForm({ ...form, sourcePackage: e.target.value })} placeholder="e.g. openssl (source package)"/></label><label>{t.sourceVersionLabel}<input value={form.sourceVersion || ''} onChange={e => setForm({ ...form, sourceVersion: e.target.value })} placeholder="e.g. 3.0.2-0ubuntu1.18"/></label><label>{t.architectureLabel}<input value={form.architecture || ''} onChange={e => setForm({ ...form, architecture: e.target.value })} placeholder="e.g. amd64"/></label><div className="modal-note"><BookOpen size={15}/><span>{t.sourcePackageHelp}<br/><code>{"dpkg-query -W -f='${binary:Package}\\t${Version}\\t${Architecture}\\t${source:Package}\\t${source:Version}\\n'"}</code></span></div><div className="modal-note"><LockKeyhole size={15}/>{t.privacyNote}</div><div className="modal-actions"><button type="button" className="secondary-btn" onClick={() => setShowAdd(false)}>{t.cancel}</button><button type="submit" className="primary-btn" disabled={!form.name.trim() || items.length >= 10}><Plus size={16}/>{t.add}</button></div></form></div>}
    </div>
  );
}

function Metric({ icon: Icon, label, value, hint }) { return <div className="metric-card"><div className="metric-top"><span>{label}</span><div className="metric-icon"><Icon size={17}/></div></div><strong className="metric-value">{value}</strong><span className="metric-hint">{hint}</span></div>; }
function PanelHead({ title, detail, action }) { return <div className="panel-head"><div><h2>{title}</h2>{detail && <span>{detail}</span>}</div>{action}</div>; }
function IconFor({ type }) { const Icon = iconFor(type); return <Icon size={18}/>; }
function ComponentChip({ item }) { return <div className="component-chip"><div className="component-icon"><IconFor type={item.type}/></div><div><strong>{item.name}</strong><span>{item.version || 'Version —'}</span></div><span className="chip-type">{typeNames[item.type]}</span></div>; }

export default App;