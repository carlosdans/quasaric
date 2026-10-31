import React from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { analyzeInventory } from './lib/correlation.js';
import { toCsv } from './lib/csv.js';
import { createAnalysisSnapshot, compareAnalysisSnapshots, loadAnalysisHistory, saveAnalysisHistory } from './lib/analysisHistory.js';
import { suggestedComponentType, normalizeComponentType } from './lib/componentTypes.js';
import { rankFindingsByRisk } from './lib/riskPriority.js';
import { buildFindingRemediation } from './lib/remediation.js';
import { buildSecurityPosture } from './lib/securityPosture.js';
import { buildSecurityPostureCsv } from './lib/securityPostureCsv.js';
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
    comparePrint: 'Resumen comparativo', priorityLabel: 'Prioridad calculada', riskScore: 'Puntuación de triage', riskMethod: 'KEV 40 + EPSS 30 + CVSS 20 + aplicabilidad 10. No es una probabilidad de explotación ni una confirmación.', riskCritical: 'Urgente', riskHigh: 'Alta', riskModerate: 'Moderada', riskLow: 'Baja', remediation: 'Remediación', updateTo: 'Actualizar a', reviewVendor: 'Revisar aviso oficial', fixCandidate: 'Posible corrección; verificar',
    posture: 'Postura', postureTitle: 'Postura de seguridad', postureDesc: 'Evolución de la exposición observada en tus análisis guardados.', postureHistory: 'Historial disponible', postureWindow: 'Ventana observada', postureNoHistory: 'Aún no hay análisis históricos.', postureNeedTwo: 'Guarda al menos dos análisis para comparar tendencias.', postureExposures: 'Exposiciones por componente', postureCves: 'CVE únicas', postureKev: 'CVE en KEV', postureRisk: 'Prioridad agregada (suma)', postureTrend: 'Tendencia histórica', postureDwell: 'Periodo de observación', postureDwellHelp: 'Primera y última observación en el historial local; el número de análisis indica recurrencia, no duración real de exposición ni fecha de remediación.', posturePresent: 'Presente en el último análisis', postureAbsent: 'No detectada en el último análisis', postureFirst: 'Primera observación', postureLast: 'Última observación', postureSnapshots: 'Análisis observados', postureNoDwell: 'No hay exposiciones registradas en el historial.', postureIncrease: 'Aumento', postureDecrease: 'Descenso', postureStable: 'Sin cambio', postureLimits: 'Se muestran como máximo 10 análisis guardados en este navegador. Una ausencia posterior no confirma remediación.', postureExport: 'Exportar historial CSV', postureReport: 'Historial de postura de seguridad', postureReportTimeline: 'Evolución por análisis', postureReportObservations: 'Observaciones CVE / componente', postureReportLimit: 'Se muestran las 30 observaciones más recurrentes o presentes; el historial completo sigue disponible en el CSV.', postureReportCaveat: 'Las fechas reflejan únicamente análisis guardados. La ausencia de una CVE no demuestra remediación.'
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
    comparePrint: 'Comparison summary', priorityLabel: 'Calculated priority', riskScore: 'Triage score', riskMethod: 'KEV 40 + EPSS 30 + CVSS 20 + applicability 10. Not an exploitation probability or a confirmation.', riskCritical: 'Urgent', riskHigh: 'High', riskModerate: 'Moderate', riskLow: 'Low', remediation: 'Remediation', updateTo: 'Update to', reviewVendor: 'Review vendor advisory', fixCandidate: 'Fix candidate; verify',
    posture: 'Posture', postureTitle: 'Security posture', postureDesc: 'Exposure trends across your saved analyses.', postureHistory: 'Available history', postureWindow: 'Observed window', postureNoHistory: 'There are no historical analyses yet.', postureNeedTwo: 'Save at least two analyses to compare trends.', postureExposures: 'Component exposures', postureCves: 'Unique CVEs', postureKev: 'KEV CVEs', postureRisk: 'Aggregated priority (sum)', postureTrend: 'Historical trend', postureDwell: 'Observation window', postureDwellHelp: 'First and last observations in local history; snapshot count indicates recurrence, not real exposure duration or a remediation date.', posturePresent: 'Present in latest analysis', postureAbsent: 'Not detected in latest analysis', postureFirst: 'First observed', postureLast: 'Last observed', postureSnapshots: 'Analyses observed', postureNoDwell: 'No exposures are recorded in history.', postureIncrease: 'Increase', postureDecrease: 'Decrease', postureStable: 'No change', postureLimits: 'Up to 10 analyses saved in this browser are shown. A later absence does not confirm remediation.', postureExport: 'Export history CSV', postureReport: 'Security posture history', postureReportTimeline: 'Trend by analysis', postureReportObservations: 'CVE / component observations', postureReportLimit: 'Showing the 30 most recurrent or currently present observations; the full history remains available in CSV.', postureReportCaveat: 'Dates reflect saved analyses only. A CVE being absent does not prove remediation.'
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
  const addDialogRef = useRef(null);
  const addTriggerRef = useRef(null);
  const openAdd = () => {
    addTriggerRef.current = document.activeElement;
    openAdd();
  };
  useEffect(() => {
    if (!showAdd) return undefined;
    const previousOverflow = document.body.style.overflow;
    const handleDialogKeys = event => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setShowAdd(false);
        return;
      }
      if (event.key !== 'Tab') return;
      const dialog = addDialogRef.current;
      if (!dialog) return;
      const focusable = [...dialog.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')]
        .filter(element => element.getAttribute('aria-hidden') !== 'true');
      if (!focusable.length) {
        event.preventDefault();
        dialog.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !dialog.contains(document.activeElement))) {
        event.preventDefault();
        first.focus();
      }
    };
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleDialogKeys);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleDialogKeys);
      if (addTriggerRef.current?.isConnected) addTriggerRef.current.focus();
      addTriggerRef.current = null;
    };
  }, [showAdd]);
  const [mobileNav, setMobileNav] = useState(false);
  useEffect(() => {
    if (!mobileNav) return undefined;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = event => { if (event.key === 'Escape') setMobileNav(false); };
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [mobileNav]);
  const [query, setQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [analysis, setAnalysis] = useState(null);
  const [analysisHistory, setAnalysisHistory] = useState(() => loadAnalysisHistory());
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState('');
  const [analysisProgress, setAnalysisProgress] = useState({ completed: 0, total: 0 });
  const [form, setForm] = useState({ name: '', type: 'other', version: '', vendor: '', sourcePackage: '', sourceVersion: '', architecture: '' });
  const suggestedType = suggestedComponentType(form.name);
  const t = copy[lang];

  const exportPostureCsv = () => {
    const csv = buildSecurityPostureCsv(posture);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'quasaric-security-posture.csv';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const persist = (next) => {
    setItems(next);
    try { localStorage.setItem('quasaric-inventory', JSON.stringify(next)); } catch { /* storage may be unavailable */ }
  };
  const posture = useMemo(() => buildSecurityPosture(analysisHistory), [analysisHistory]);
  const latestComparison = useMemo(() => analysisHistory.length >= 2
    ? compareAnalysisSnapshots(analysisHistory[1], analysisHistory[0])
    : null, [analysisHistory]);

  const prioritizedFindings = useMemo(() => analysis?.findings?.length
    ? rankFindingsByRisk(analysis.findings).map(finding => ({ ...finding, remediation: buildFindingRemediation(finding) }))
    : [], [analysis]);
  const riskBandLabel = band => ({ critical: t.riskCritical, high: t.riskHigh, moderate: t.riskModerate, low: t.riskLow }[band] || t.riskLow);

  const filtered = useMemo(() => {
    const live = analysis ? prioritizedFindings.map(f => ({
      id: f.id,
      title: f.description,
      component: f.components.map(x => x.component.name).join(', '),
      severity: f.severity || 'Unknown',
      score: f.cvss ?? '—',
      state: f.kev ? 'KEV' : 'Candidate',
      riskPriority: f.riskPriority,
      live: true
    })) : null;
    const rows = live || sampleFindings;
    return rows.filter(x => (x.id + x.title + x.component).toLowerCase().includes(query.toLowerCase())
      && (severityFilter === 'all' || String(x.severity).toLowerCase() === severityFilter));
  }, [prioritizedFindings, query, severityFilter]);

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
      ['CVE','Description','CVSS','Severity','EPSS','CISA KEV','Applicability','Risk score','Risk band','Components','Remediation guidance (JSON)','CVSS vector','NVD URL','Evidence by source (JSON)'],
      ...prioritizedFindings.map(f => [
        f.id, f.description, f.cvss ?? '', f.severity ?? '', f.epss ?? '',
        f.kev ? 'yes' : 'no', f.applicabilityStatus,
        f.riskPriority.score, f.riskPriority.band,
        f.components.map(x => x.component.name + ' ' + x.component.version).join('; '),
        JSON.stringify(f.remediation),
        f.vector ?? '', 'https://nvd.nist.gov/vuln/detail/' + f.id,
        JSON.stringify(f.components.flatMap(component => component.evidence || []))
      ])
    ];
    downloadCsv(rows, 'quasaric-findings.csv');
  };

  const nav = [
    { id: 'overview', label: t.overview, icon: Activity },
    { id: 'posture', label: t.posture, icon: ShieldCheck },
    { id: 'inventory', label: t.inventory, icon: ClipboardList },
    { id: 'vulnerabilities', label: t.vulnerabilities, icon: ShieldAlert },
    { id: 'reports', label: t.reports, icon: FileText }
  ];

  return (
    <div className="app-shell">
      <aside id="primary-navigation" className={'sidebar ' + (mobileNav ? 'sidebar-open' : '')} aria-label={lang === 'es' ? 'Navegación principal' : 'Primary navigation'}>
        <div className="brand">
          <img className="brand-mark" src="/favicon.svg" alt="" />
          <div><div className="brand-name">Quasaric<span>.com</span></div><div className="brand-sub">{t.platform}</div></div>
          <button className="icon-btn mobile-close" onClick={() => setMobileNav(false)} aria-label={lang === 'es' ? 'Cerrar menú' : 'Close menu'}><X size={18}/></button>
        </div>
        <div className="nav-caption">{t.workspace}</div>
        <nav className="main-nav">
          {nav.map(({ id, label, icon: Icon }) => <button key={id} className={'nav-link ' + (active === id ? 'active' : '')} onClick={() => { setActive(id); setMobileNav(false); }}><Icon size={17}/><span>{label}</span>{id === 'vulnerabilities' && <span className="nav-soon">BETA</span>}</button>)}
        </nav>
        <div className="sidebar-bottom">
          <div className="privacy-card"><div className="privacy-icon"><LockKeyhole size={16}/></div><div><strong>{t.noScan}</strong><p>{t.noScanText}</p></div></div>
          <button className={'nav-link ' + (active === 'settings' ? 'active' : '')} onClick={() => { setActive('settings'); setMobileNav(false); }}><Settings2 size={17}/><span>{t.settings}</span></button>
          <div className="sidebar-user"><div className="avatar">Q</div><div className="user-copy"><strong>Quasaric</strong><span>Personal workspace</span></div><ChevronDown size={15}/></div>
        </div>
      </aside>
      {mobileNav && <button className="mobile-nav-backdrop" aria-label={lang === 'es' ? 'Cerrar menú' : 'Close menu'} onClick={() => setMobileNav(false)} />}

      <main className="main-area">
        <header className="topbar">
          <button className="icon-btn mobile-menu" onClick={() => setMobileNav(true)} aria-label={lang === 'es' ? 'Abrir menú' : 'Open menu'} aria-expanded={mobileNav} aria-controls="primary-navigation"><Menu size={19}/></button>
          <div className="breadcrumb"><span>Quasaric</span><ChevronRight size={14}/><strong>{active === 'overview' ? t.overview : active === 'inventory' ? t.inventory : active === 'vulnerabilities' ? t.vulnerabilities : active === 'posture' ? t.posture : active === 'reports' ? t.reports : t.settings}</strong></div>
          <div className="top-actions">
            <span className="status-pill"><span className="status-dot"/> {t.localSaved}</span>
            <button className="language-btn" onClick={() => setLang(lang === 'es' ? 'en' : 'es')} aria-label={t.language}><Globe2 size={15}/><span>{lang.toUpperCase()}</span></button>
            <button className="icon-btn" aria-label="Help"><CircleHelp size={18}/></button>
          </div>
        </header>

        <div className="content">
          {active === 'overview' && <>
            <div className="page-heading"><div><div className="eyebrow">{t.platform}</div><h1>{t.overviewTitle}</h1><p>{t.subtitle}</p></div><button className="primary-btn" onClick={() => { setActive('inventory'); openAdd(); }}><Plus size={17}/>{t.newAnalysis}</button></div>
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
            <section className="panel inventory-panel"><PanelHead title={t.technologyMap} action={<button className="text-btn" onClick={() => setActive('inventory')}>{t.viewAll}<ChevronRight size={14}/></button>}/>{items.length ? <div className="component-grid">{items.slice(0,5).map(item => <ComponentChip key={item.id} item={item}/>)}</div> : <div className="empty-state"><div className="empty-icon"><Layers3 size={21}/></div><strong>{t.empty}</strong><span>{t.emptyHint}</span><button className="secondary-btn" onClick={() => { setActive('inventory'); openAdd(); }}><Plus size={15}/>{t.addComponent}</button></div>}</section>
            <section className="panel findings-panel"><PanelHead title={t.recentFindings} action={<span className="muted-label">{t.demo}</span>}/><div className="table-wrap" role="region" tabIndex={0} aria-label={lang === 'es' ? 'Tabla desplazable' : 'Scrollable table'}><table><thead><tr><th>CVЕ ID</th><th>{t.component}</th><th>{t.status}</th><th>CVSS</th></tr></thead><tbody>{sampleFindings.map(f => <tr key={f.id}><td><strong className="cve-id">{f.id}</strong><span className="finding-title">{f.title}</span></td><td>{f.component}</td><td><span className={'tag ' + (f.state === 'KEV' ? 'tag-red' : 'tag-amber')}>{f.state}</span></td><td className="score">{f.score}</td></tr>)}</tbody></table></div></section>
          </>}

          {active === 'posture' && <>
            <div className="page-heading"><div><div className="eyebrow">{t.workspace}</div><h1>{t.postureTitle}</h1><p>{t.postureDesc}</p></div><div className="heading-actions"><span className="status-pill"><span className="status-dot"/>{posture.snapshotCount} / 10 {t.postureHistory}</span><button className="secondary-btn" onClick={exportPostureCsv} disabled={!posture.snapshotCount}><Download size={15}/>{t.postureExport}</button></div></div>
            <div className="notice"><ShieldCheck size={17}/><span>{t.postureLimits}</span></div>
            {!posture.snapshotCount ? <section className="panel empty-state large"><div className="empty-icon"><Activity size={22}/></div><strong>{t.postureNoHistory}</strong><span>{t.emptyHint}</span><button className="primary-btn" onClick={() => setActive('inventory')}>{t.newAnalysis}</button></section> : <>
              <section className="metric-grid">
                <Metric icon={Layers3} label={t.postureExposures} value={String(posture.latest.exposures)} hint={t.postureWindow + ': ' + new Date(posture.windowEnd).toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-US')}/>
                <Metric icon={ShieldAlert} label={t.postureCves} value={String(posture.latest.uniqueCves)} hint={posture.change ? trendLabel(posture.change.uniqueCves, t) : t.postureNeedTwo}/>
                <Metric icon={AlertTriangle} label={t.postureKev} value={String(posture.latest.kevCves)} hint={posture.change ? trendLabel(posture.change.kevCves, t) : t.postureNeedTwo}/>
                <Metric icon={Activity} label={t.postureRisk} value={String(posture.latest.riskScore)} hint={posture.change ? trendLabel(posture.change.riskScore, t) : t.postureNeedTwo}/>
              </section>
              <section className="panel comparison-panel">
                <div className="comparison-heading"><div><h3>{t.postureTrend}</h3><p>{posture.snapshotCount} {t.postureHistory} · {new Date(posture.windowStart).toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-US')} – {new Date(posture.windowEnd).toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-US')}</p></div></div>
                <p className="posture-severity-summary">{t.critical}: <strong>{posture.latest.criticalCves}</strong> · {t.riskHigh || t.high || 'High'}: <strong>{posture.latest.highCves}</strong> · {t.postureRisk}: <strong>{posture.latest.riskScore}</strong></p>
                <div className="posture-chart">{posture.timeline.map((point, index) => {
                  const max = Math.max(1, ...posture.timeline.map(item => item.uniqueCves));
                  return <div className="posture-chart-column" key={point.id || index} title={new Date(point.analyzedAt).toLocaleString()}>
                    <div className="posture-chart-value">{point.uniqueCves}</div><div className="posture-chart-track"><i style={{height: Math.max(4, point.uniqueCves / max * 100) + '%'}}/></div>
                    <strong>{new Date(point.analyzedAt).toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-US', { day: '2-digit', month: 'short' })}</strong>
                    <span>{point.kevCves} KEV · {point.exposures} {lang === 'es' ? 'expos.' : 'expos.'}</span>
                  </div>;
                })}</div>
                {posture.snapshotCount < 2 && <p className="print-report-empty">{t.postureNeedTwo}</p>}
              </section>
              <section className="panel comparison-panel">
                <div className="comparison-heading"><div><h3>{t.postureDwell}</h3><p>{t.postureDwellHelp}</p></div></div>
                {posture.dwell.length ? <div className="table-wrap" role="region" tabIndex={0} aria-label={lang === 'es' ? 'Tabla desplazable' : 'Scrollable table'}><table><thead><tr><th>CVE</th><th>{t.component}</th><th>{t.postureFirst}</th><th>{t.postureLast}</th><th>{t.postureSnapshots}</th><th>{t.status}</th></tr></thead><tbody>{posture.dwell.map(item => <tr key={item.key}><td><strong className="cve-id">{item.cve}</strong>{item.kev && <span className="tag tag-red">KEV</span>}</td><td>{item.componentName}</td><td>{new Date(item.firstObservedAt).toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-US')}</td><td>{new Date(item.lastObservedAt).toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-US')}</td><td>{item.snapshotsSeen}</td><td><span className={'tag ' + (item.presentInLatest ? 'tag-amber' : 'tag-neutral')}>{item.presentInLatest ? t.posturePresent : t.postureAbsent}</span></td></tr>)}</tbody></table></div> : <p className="print-report-empty">{t.postureNoDwell}</p>}
              </section>
            </>}
          </>}
          {active === 'inventory' && <><div className="page-heading"><div><div className="eyebrow">{t.workspace}</div><h1>{t.analysisTitle}</h1><p>{t.analysisDesc}</p></div><div className="heading-actions"><button className="secondary-btn" onClick={exportCsv} disabled={!items.length}><Download size={15}/>{t.export}</button><button className="primary-btn" onClick={runAnalysis} disabled={!items.length || analyzing}><Activity size={16}/>{analyzing ? (lang === 'es' ? 'Analizando…' : 'Analyzing…') : (lang === 'es' ? 'Analizar inventario' : 'Analyze inventory')}</button><button className="primary-btn" onClick={() => openAdd()} disabled={items.length >= 10}><Plus size={17}/>{t.addComponent}</button></div></div><div className="notice"><LockKeyhole size={17}/><span>{t.privacyNote}</span></div><section className="panel inventory-list-panel"><PanelHead title={t.inventory} detail={items.length + ' / 10'}/>{items.length ? <div className="inventory-list">{items.map(item => <div className="inventory-row" key={item.id}><div className="component-icon"><IconFor type={item.type}/></div><div className="inventory-name"><strong>{item.name}</strong><span>{t[item.type] || item.type} {item.vendor ? '· ' + item.vendor : ''} {item.sourcePackage ? '· src: ' + item.sourcePackage : ''} {item.sourceVersion ? '· src ver: ' + item.sourceVersion : ''} {item.architecture ? '· arch: ' + item.architecture : ''}</span></div><div className="inventory-version"><span>{t.version}</span><strong>{item.version || '—'}</strong></div><span className="tag tag-neutral">{t.ready}</span><button className="icon-btn danger-hover" onClick={() => persist(items.filter(x => x.id !== item.id))} aria-label={t.remove}><Trash2 size={16}/></button></div>)}</div> : <div className="empty-state large"><div className="empty-icon"><ClipboardList size={22}/></div><strong>{t.empty}</strong><span>{t.emptyHint}</span><button className="primary-btn" onClick={() => openAdd()}><Plus size={16}/>{t.addComponent}</button></div>}</section>{analyzing && <section className="panel analysis-progress"><strong>{lang === 'es' ? 'Consultando fuentes públicas…' : 'Querying public sources…'}</strong><span>{analysisProgress.completed} / {analysisProgress.total} {lang === 'es' ? 'componentes consultados' : 'components queried'}</span><div className="progress-track"><i style={{ width: (analysisProgress.total ? analysisProgress.completed / analysisProgress.total * 100 : 0) + '%' }}/></div></section>}{analysisError && <div className="error-banner"><AlertTriangle size={16}/>{analysisError}</div>}{analysis && <section className="panel results-panel"><PanelHead title={lang === 'es' ? 'Resultados de correlación' : 'Correlation results'} detail={new Date(analysis.analyzedAt).toLocaleString(lang === 'es' ? 'es-ES' : 'en-US')}/><p className="result-disclaimer">{analysis.disclaimer}</p><div className="source-status">{Object.entries(analysis.sources).map(([source,status]) => <span key={source}><i className={status === 'queried' ? 'source-ok' : 'source-warn'}/>{source.toUpperCase()}: {status}</span>)}</div>{analysis.errors.length > 0 && <div className="error-banner"><AlertTriangle size={15}/>{analysis.errors.length} {lang === 'es' ? 'errores de consulta; los resultados pueden estar incompletos.' : 'source errors; results may be incomplete.'}</div>}{analysis.limits?.length > 0 && <div className="error-banner"><AlertTriangle size={15}/>{lang === 'es' ? `NVD ha alcanzado el límite de 400 resultados en ${analysis.limits.length} consulta(s). Los hallazgos son parciales y pueden faltar CVE; reduce el inventario o revisa NVD directamente.` : `NVD reached the 400-result cap in ${analysis.limits.length} quer(ies). Findings are partial and CVEs may be missing; narrow the inventory or review NVD directly.`}</div>}{analysis.findings.length ? <div className="table-wrap" role="region" tabIndex={0} aria-label={lang === 'es' ? 'Tabla desplazable' : 'Scrollable table'}><table><thead><tr><th>CVE</th><th>{lang === 'es' ? 'Severidad' : 'Severity'}</th><th>CVSS</th><th>EPSS</th><th>KEV</th><th>{lang === 'es' ? 'Aplicabilidad' : 'Applicability'}</th></tr></thead><tbody>{analysis.findings.map(f => <tr key={f.id}><td><strong className="cve-id"><a href={`https://nvd.nist.gov/vuln/detail/${f.id}`} target="_blank" rel="noreferrer">{f.id}</a></strong><span className="finding-title">{f.description}</span>{f.vector && <span className="finding-title">CVSS vector: {f.vector}</span>}{f.references?.length > 0 && <span className="finding-title"><a href={f.references[0].url} target="_blank" rel="noreferrer">{lang === 'es' ? 'Referencia / aviso del fabricante' : 'Reference / vendor advisory'}</a></span>}{f.kev && f.kevRequiredAction && <span className="finding-title">{lang === 'es' ? 'Acción CISA: ' : 'CISA action: '}{f.kevRequiredAction}</span>}</td><td>{f.severity || '—'}</td><td className="score">{f.cvss ?? '—'}</td><td>{f.epss == null ? '—' : (f.epss * 100).toFixed(2) + '%'}</td><td>{f.kev ? <span className="tag tag-red">CISA KEV</span> : '—'}{f.kev && f.kevDueDate && <span className="finding-title">{lang === 'es' ? 'Fecha límite: ' : 'Due: '}{f.kevDueDate}</span>}</td><td><span className="tag tag-amber">{({ possible: lang === 'es' ? 'Posible' : 'Possible', affected: lang === 'es' ? 'Afectado según Ubuntu OSV' : 'Affected per Ubuntu OSV', patched_candidate: lang === 'es' ? 'Parche candidato · verificar' : 'Patch candidate · verify', unaffected: lang === 'es' ? 'No afectado según Ubuntu OSV' : 'Not affected per Ubuntu OSV', needs_review: lang === 'es' ? 'Verificar' : 'Review' })[f.applicabilityStatus] || (lang === 'es' ? 'Verificar' : 'Review')}</span><span className="finding-title">{f.components.map(x => x.component.name + ' — ' + (x.applicability.status === 'affected' ? (lang === 'es' ? 'afectado' : 'affected') : x.applicability.status === 'patched_candidate' ? (lang === 'es' ? 'parche candidato' : 'patch candidate') : x.applicability.status === 'unaffected' ? (lang === 'es' ? 'no afectado' : 'not affected') : (lang === 'es' ? 'verificar' : 'review'))).join(', ')}</span>{f.components.filter(x => x.ubuntuOsv).map(x => <span className="finding-title" key={'osv-' + x.component.id}>Ubuntu OSV · {x.component.name}: {({ affected: lang === 'es' ? 'afectado' : 'affected', patched_candidate: lang === 'es' ? 'parche candidato' : 'patch candidate', unaffected: lang === 'es' ? 'no afectado' : 'not affected', needs_review: lang === 'es' ? 'requiere revisión' : 'needs review' })[x.ubuntuOsv.status] || x.ubuntuOsv.status}</span>)}{f.components.filter(x => x.ubuntuVex).map(x => <span className="finding-title" key={x.component.id}>OpenVEX · {x.component.name}: {({ fixed: lang === 'es' ? 'fijo según VEX' : 'fixed per VEX', affected: lang === 'es' ? 'afectado según VEX' : 'affected per VEX', not_affected: lang === 'es' ? 'no afectado según VEX' : 'not affected per VEX', under_investigation: lang === 'es' ? 'en investigación' : 'under investigation', needs_review: lang === 'es' ? 'requiere revisión' : 'needs review', unavailable: lang === 'es' ? 'no disponible' : 'unavailable' })[x.ubuntuVex.status] || x.ubuntuVex.status}{x.ubuntuVex.documentTimestamp && <> · {new Date(x.ubuntuVex.documentTimestamp).toLocaleString(lang === 'es' ? 'es-ES' : 'en-US')}</>}{x.ubuntuVex.documentUrl && <> · <a href={x.ubuntuVex.documentUrl} target="_blank" rel="noreferrer">{lang === 'es' ? 'Documento Canonical' : 'Canonical document'}</a></>}{x.ubuntuVex.reason && <span> · {x.ubuntuVex.reason}</span>}{x.ubuntuVex.consistency?.status === 'conflicting' && <span> · <strong>{lang === 'es' ? 'CONFLICTO ENTRE FUENTES' : 'SOURCE CONFLICT'}</strong>: {x.ubuntuVex.consistency.reason}</span>}</span>)}{f.components.map(x => <details className="source-evidence-details" key={'evidence-' + x.component.id}><summary>{lang === 'es' ? 'Trazabilidad de evidencias' : 'Evidence traceability'} · {x.component.name} ({x.evidence?.length || 0})</summary>{x.evidence?.length ? x.evidence.map((entry, index) => <div className="source-evidence-item" key={entry.source + '-' + index}><strong>{entry.source}</strong><span>{lang === 'es' ? 'Estado' : 'Status'}: {entry.status || '—'}</span>{entry.advisoryId && <span>{lang === 'es' ? 'Identificador' : 'Identifier'}: {entry.advisoryId}</span>}{entry.publishedAt && <span>{lang === 'es' ? 'Publicado' : 'Published'}: {entry.publishedAt}</span>}{entry.updatedAt && <span>{lang === 'es' ? 'Actualizado' : 'Updated'}: {entry.updatedAt}</span>}{entry.documentTimestamp && <span>{lang === 'es' ? 'Fecha del documento' : 'Document timestamp'}: {entry.documentTimestamp}</span>}{entry.documentVersion != null && <span>{lang === 'es' ? 'Versión del documento' : 'Document version'}: {entry.documentVersion}</span>}{entry.product && <span>{entry.product.name || '—'} {entry.product.version ? '@ ' + entry.product.version : ''}{entry.product.architecture ? ' · ' + entry.product.architecture : ''}{entry.product.ecosystem ? ' · ' + entry.product.ecosystem : ''}{entry.product.sourcePackage ? ' · src: ' + entry.product.sourcePackage : ''}{entry.product.sourceVersion ? ' ' + entry.product.sourceVersion : ''}</span>}{entry.reason && <span>{entry.reason}</span>}{entry.url && <a href={entry.url} target="_blank" rel="noreferrer">{lang === 'es' ? 'Abrir fuente' : 'Open source'}</a>}{entry.references?.map((url, refIndex) => <a href={url} target="_blank" rel="noreferrer" key={url + refIndex}>{lang === 'es' ? 'Referencia adicional' : 'Additional reference'} {refIndex + 1}</a>)}</div>) : <span>{lang === 'es' ? 'No hay evidencias fuente adjuntas a este componente.' : 'No source evidence is attached to this component.'}</span>}</details>)}</td></tr>)}</tbody></table></div> : <div className="empty-state"><strong>{lang === 'es' ? 'No se han obtenido candidatos con los filtros actuales.' : 'No candidate matches were returned.'}</strong><span>{lang === 'es' ? 'Esto no demuestra que los componentes estén libres de vulnerabilidades.' : 'This does not prove that the components are vulnerability-free.'}</span></div>}</section>}<div className="inventory-bottom"><span>{t.maxReached}</span><button className="secondary-btn" onClick={exportCsv} disabled={!items.length}><Download size={15}/>{t.export}</button></div></>}

          {active === 'vulnerabilities' && <><div className="page-heading"><div><div className="eyebrow">{t.workspace}</div><h1>{t.vulnerabilities}</h1><p>{t.sourceNotice}</p></div></div>{!analysis && <div className="demo-banner"><Sparkles size={16}/><div><strong>{t.demo}</strong><span>{t.demoText}</span></div></div>}{analysis && <div className="result-disclaimer">{lang === 'es' ? 'Resultados del último análisis en este navegador. Son candidatos que requieren verificación, no confirmaciones.' : 'Results from the latest analysis in this browser. These are candidates requiring verification, not confirmations.'}</div>}<section className="panel findings-panel"><div className="findings-toolbar"><div className="search-field"><Search size={16}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder={t.search}/></div><label className="severity-filter-label"><span>{lang === 'es' ? 'Severidad' : 'Severity'}</span><select className="severity-filter" value={severityFilter} onChange={event => setSeverityFilter(event.target.value)}><option value="all">{t.all}</option><option value="critical">{lang === 'es' ? 'Crítica' : 'Critical'}</option><option value="high">{lang === 'es' ? 'Alta' : 'High'}</option><option value="medium">{lang === 'es' ? 'Media' : 'Medium'}</option><option value="low">{lang === 'es' ? 'Baja' : 'Low'}</option><option value="unknown">{lang === 'es' ? 'Desconocida' : 'Unknown'}</option></select></label></div><div className="table-wrap" role="region" tabIndex={0} aria-label={lang === 'es' ? 'Tabla desplazable' : 'Scrollable table'}><table><thead><tr><th>CVЕ ID / {t.component}</th><th>{t.severity}</th><th>CVSS</th><th>{t.priorityLabel}</th><th>{t.remediation}</th><th>{t.status}</th></tr></thead><tbody>{filtered.map(f => <tr key={f.id}><td><strong className="cve-id">{f.live ? <a href={`https://nvd.nist.gov/vuln/detail/${f.id}`} target="_blank" rel="noreferrer">{f.id}</a> : f.id}</strong><span className="finding-title">{f.title}</span><span className="finding-title">{f.component}</span></td><td><span className={'severity-text ' + f.severity.toLowerCase()}>{f.severity}</span></td><td className="score">{f.score}</td><td>{f.riskPriority ? <span className={'tag ' + (f.riskPriority.band === 'critical' || f.riskPriority.band === 'high' ? 'tag-red' : f.riskPriority.band === 'moderate' ? 'tag-amber' : 'tag-neutral')}>{f.riskPriority.score}/100 · {riskBandLabel(f.riskPriority.band)}</span> : '—'}</td><td>{f.remediation?.map(item => <div className="finding-title" key={item.component.id}>{item.component.name}: {item.guidance.status === 'update_candidate' ? t.updateTo + ' ' + item.guidance.targetVersion : item.guidance.status === 'fix_candidate_present' ? t.fixCandidate : t.reviewVendor}{item.guidance.references[0] && <> · <a href={item.guidance.references[0]} target="_blank" rel="noreferrer">{lang === 'es' ? 'fuente' : 'source'}</a></>}</div>)}</td><td><span className={'tag ' + (f.state === 'KEV' ? 'tag-red' : 'tag-amber')}>{f.state}</span></td></tr>)}</tbody></table>{!filtered.length && <div className="empty-state">{t.noResults}</div>}</div></section></>}

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
                  ? <div className="print-report-table-wrap" role="region" tabIndex={0} aria-label={lang === 'es' ? 'Tabla del informe desplazable' : 'Scrollable report table'}><table className="print-report-table"><thead><tr><th>{t.reportCve}</th><th>{t.compareComponent}</th><th>{t.compareChange}</th><th>{t.compareBefore}</th><th>{t.compareAfter}</th></tr></thead><tbody>
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
              {analysis?.findings?.length > 0 && <p className="print-report-notice">{t.riskMethod}</p>}
              <section className="print-report-section">
                <h3>{t.reportInventory} ({items.length})</h3>
                {items.length ? <div className="print-report-table-wrap" role="region" tabIndex={0} aria-label={lang === 'es' ? 'Tabla del informe desplazable' : 'Scrollable report table'}><table className="print-report-table"><thead><tr><th>{t.component}</th><th>{t.reportType}</th><th>{t.reportVersion}</th><th>{t.reportVendor}</th></tr></thead><tbody>{items.map(item => <tr key={item.id}><td>{item.name}</td><td>{item.type}</td><td>{item.version || '—'}</td><td>{item.vendor || '—'}</td></tr>)}</tbody></table></div> : <p className="print-report-empty">{t.reportNoComponents}</p>}
              </section>
              <section className="print-report-section">
                <h3>{t.reportFindings} ({analysis?.findings?.length || 0})</h3>
                {analysis?.findings?.length ? <div className="print-report-table-wrap" role="region" tabIndex={0} aria-label={lang === 'es' ? 'Tabla del informe desplazable' : 'Scrollable report table'}><table className="print-report-table"><thead><tr><th>{t.reportCve}</th><th>{t.reportDescription}</th><th>{t.reportSeverity}</th><th>{t.reportScore}</th><th>{t.reportEpss}</th><th>{t.reportKev}</th><th>{t.reportApplicability}</th><th>{t.riskScore}</th><th>{t.reportComponents}</th><th>{t.remediation}</th><th>{t.reportSources}</th></tr></thead><tbody>{prioritizedFindings.map(finding => {
                  const sources = [...new Set(finding.components.flatMap(component => (component.evidence || []).map(evidence => evidence.source).filter(Boolean)))];
                  return <tr key={finding.id}><td className="print-report-cve">{finding.id}</td><td>{finding.description || '—'}</td><td>{finding.severity || '—'}</td><td>{finding.cvss ?? '—'}</td><td>{finding.epss ?? '—'}</td><td>{finding.kev ? 'Yes' : 'No'}</td><td>{finding.applicabilityStatus || '—'}</td><td>{finding.riskPriority.score}/100 · {riskBandLabel(finding.riskPriority.band)}</td><td>{finding.components.map(component => component.component.name + ' ' + (component.component.version || '')).join('; ')}</td><td>{finding.remediation.map(item => item.component.name + ': ' + (item.guidance.targetVersion ? t.updateTo + ' ' + item.guidance.targetVersion : item.guidance.status === 'fix_candidate_present' ? t.fixCandidate : t.reviewVendor)).join('; ')}</td><td>{sources.join(', ') || '—'}</td></tr>;
                })}</tbody></table></div> : <p className="print-report-empty">{t.reportNoAnalysis}</p>}
              </section>
              {latestComparison && <section className="print-report-section"><h3>{t.comparePrint}</h3><p className="print-report-empty">{t.compareAdded}: {latestComparison.counts.added} · {t.compareResolved}: {latestComparison.counts.resolved} · {t.compareRetained}: {latestComparison.counts.retained} · {t.compareChanged}: {latestComparison.counts.changed}</p></section>}
              {posture.snapshotCount > 0 && <section className="print-report-section">
                <h3>{t.postureReport}</h3>
                <p className="print-report-notice">{t.postureReportCaveat}</p>
                <h4>{t.postureReportTimeline}</h4>
                <div className="print-report-table-wrap" role="region" tabIndex={0} aria-label={lang === 'es' ? 'Tabla del informe desplazable' : 'Scrollable report table'}><table className="print-report-table"><thead><tr><th>{t.reportGenerated}</th><th>{t.postureCves}</th><th>{t.postureExposures}</th><th>{t.postureKev}</th><th>{t.postureRisk}</th></tr></thead><tbody>{posture.timeline.map((point, index) => <tr key={point.id || index}><td>{new Date(point.analyzedAt).toLocaleString(lang === 'es' ? 'es-ES' : 'en-US')}</td><td>{point.uniqueCves}</td><td>{point.exposures}</td><td>{point.kevCves}</td><td>{point.riskScore}</td></tr>)}</tbody></table></div>
                <h4>{t.postureReportObservations}</h4>
                <p className="print-report-empty">{t.postureReportLimit}</p>
                {posture.dwell.length ? <div className="print-report-table-wrap" role="region" tabIndex={0} aria-label={lang === 'es' ? 'Tabla del informe desplazable' : 'Scrollable report table'}><table className="print-report-table"><thead><tr><th>{t.reportCve}</th><th>{t.compareComponent}</th><th>{t.postureFirst}</th><th>{t.postureLast}</th><th>{t.postureSnapshots}</th><th>{t.status}</th></tr></thead><tbody>{posture.dwell.slice(0, 30).map(item => <tr key={item.key}><td>{item.cve}{item.kev ? ' · KEV' : ''}</td><td>{item.componentName}</td><td>{new Date(item.firstObservedAt).toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-US')}</td><td>{new Date(item.lastObservedAt).toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-US')}</td><td>{item.snapshotsSeen}</td><td>{item.presentInLatest ? t.posturePresent : t.postureAbsent}</td></tr>)}</tbody></table></div> : <p className="print-report-empty">{t.postureNoDwell}</p>}
              </section>}
              <footer className="print-report-footer">Quasaric · {window.location.origin}</footer>
            </section>
            <section className="panel report-card"><div className="report-icon"><FileDown size={23}/></div><div><h3>{lang === 'es' ? 'Exportar inventario' : 'Export inventory'}</h3><p>{lang === 'es' ? 'Descarga los componentes que has añadido en formato CSV.' : 'Download your declared components as CSV.'}</p></div><button className="secondary-btn" onClick={exportCsv} disabled={!items.length}><Download size={16}/>{lang === 'es' ? 'Inventario CSV' : 'Inventory CSV'}</button></section>
            <section className="panel report-card"><div className="report-icon"><ShieldAlert size={23}/></div><div><h3>{lang === 'es' ? 'Exportar hallazgos' : 'Export findings'}</h3><p>{lang === 'es' ? 'Descarga los candidatos CVE del último análisis con CVSS, EPSS, KEV y evidencias por fuente.' : 'Download candidate CVEs from the latest analysis with CVSS, EPSS, KEV and source evidence.'}</p></div><button className="secondary-btn" onClick={exportFindingsCsv} disabled={!analysis?.findings?.length}><Download size={16}/>{lang === 'es' ? 'Hallazgos CSV' : 'Findings CSV'}</button></section>
          </>}

          {active === 'settings' && <><div className="page-heading"><div><div className="eyebrow">{t.workspace}</div><h1>{t.settings}</h1><p>{lang === 'es' ? 'Preferencias de idioma y datos locales.' : 'Language and local data preferences.'}</p></div></div><section className="panel settings-panel"><h3>{t.language}</h3><p>{lang === 'es' ? 'Selecciona el idioma de la interfaz.' : 'Choose the interface language.'}</p><div className="setting-options"><button className={lang === 'es' ? 'selected' : ''} onClick={() => setLang('es')}>Español {lang === 'es' && <Check size={16}/>}</button><button className={lang === 'en' ? 'selected' : ''} onClick={() => setLang('en')}>English {lang === 'en' && <Check size={16}/>}</button></div><div className="settings-divider"/><h3>{lang === 'es' ? 'Datos del navegador' : 'Browser data'}</h3><p>{lang === 'es' ? 'El inventario se almacena localmente en este navegador.' : 'Your inventory is stored locally in this browser.'}</p><button className="danger-btn" onClick={() => { if (confirm(lang === 'es' ? '¿Eliminar todo el inventario local?' : 'Delete the entire local inventory?')) persist([]); }}><Trash2 size={15}/>{lang === 'es' ? 'Borrar inventario local' : 'Clear local inventory'}</button></section></>}
          <footer className="footer"><span>© {new Date().getFullYear()} Quasaric · {t.footer}</span><a href="mailto:contacto@quasaric.com">contacto@quasaric.com</a></footer>
        </div>
      </main>

      {showAdd && <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) setShowAdd(false); }}><form ref={addDialogRef} className="modal" role="dialog" tabIndex={-1} aria-modal="true" aria-labelledby="add-component-title" onSubmit={addItem}><div className="modal-head"><div><div className="eyebrow">QUASARIC</div><h2 id="add-component-title">{t.addComponent}</h2></div><button type="button" className="icon-btn" onClick={() => setShowAdd(false)} aria-label={lang === 'es' ? 'Cerrar diálogo' : 'Close dialog'}><X size={18}/></button></div><label>{t.componentName}<input required autoFocus value={form.name} onChange={e => { const name = e.target.value; setForm(current => ({ ...current, name, type: suggestedComponentType(name) || current.type })); }} placeholder="e.g. PHP, NGINX"/></label><label>{t.chooseType}<select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>{types.map(type => <option key={type} value={type}>{t[type]}</option>)}</select></label>{suggestedType && suggestedType !== form.type && <div className="modal-note"><AlertTriangle size={15}/>{lang === 'es' ? `Tipo recomendado para ${form.name}: ${t[suggestedType]}. Se corregirá automáticamente al añadir.` : `Recommended type for ${form.name}: ${t[suggestedType]}. It will be corrected automatically when added.`}</div>}<label>{t.versionLabel}<input value={form.version} onChange={e => setForm({ ...form, version: e.target.value })} placeholder="e.g. 1.24.0"/></label><label>{t.vendor}<input value={form.vendor} onChange={e => setForm({ ...form, vendor: e.target.value })} placeholder={form.name.trim().toLowerCase() === 'ubuntu' ? 'Ubuntu:24.04:LTS' : 'e.g. Ubuntu:24.04:LTS'}/></label><label>{t.sourcePackageLabel}<input value={form.sourcePackage || ''} onChange={e => setForm({ ...form, sourcePackage: e.target.value })} placeholder="e.g. openssl (source package)"/></label><label>{t.sourceVersionLabel}<input value={form.sourceVersion || ''} onChange={e => setForm({ ...form, sourceVersion: e.target.value })} placeholder="e.g. 3.0.2-0ubuntu1.18"/></label><label>{t.architectureLabel}<input value={form.architecture || ''} onChange={e => setForm({ ...form, architecture: e.target.value })} placeholder="e.g. amd64"/></label><div className="modal-note"><BookOpen size={15}/><span>{t.sourcePackageHelp}<br/><code>{"dpkg-query -W -f='${binary:Package}\\t${Version}\\t${Architecture}\\t${source:Package}\\t${source:Version}\\n'"}</code></span></div><div className="modal-note"><LockKeyhole size={15}/>{t.privacyNote}</div><div className="modal-actions"><button type="button" className="secondary-btn" onClick={() => setShowAdd(false)}>{t.cancel}</button><button type="submit" className="primary-btn" disabled={!form.name.trim() || items.length >= 10}><Plus size={16}/>{t.add}</button></div></form></div>}
    </div>
  );
}

function trendLabel(value, t) { return value > 0 ? '+' + value + ' · ' + t.postureIncrease : value < 0 ? value + ' · ' + t.postureDecrease : t.postureStable; }

function Metric({ icon: Icon, label, value, hint }) { return <div className="metric-card"><div className="metric-top"><span>{label}</span><div className="metric-icon"><Icon size={17}/></div></div><strong className="metric-value">{value}</strong><span className="metric-hint">{hint}</span></div>; }
function PanelHead({ title, detail, action }) { return <div className="panel-head"><div><h2>{title}</h2>{detail && <span>{detail}</span>}</div>{action}</div>; }
function IconFor({ type }) { const Icon = iconFor(type); return <Icon size={18}/>; }
function ComponentChip({ item }) { return <div className="component-chip"><div className="component-icon"><IconFor type={item.type}/></div><div><strong>{item.name}</strong><span>{item.version || 'Version —'}</span></div><span className="chip-type">{typeNames[item.type]}</span></div>; }

export default App;