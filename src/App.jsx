import React from 'react';
import LandingPage from './LandingPage.jsx';
import { useEffect, useMemo, useRef, useState } from 'react';
import { analyzeInventory } from './lib/correlation.js';
import { toCsv } from './lib/csv.js';
import { createAnalysisSnapshot, compareAnalysisSnapshots, loadAnalysisHistory, saveAnalysisHistory, upsertAnalysisSnapshot } from './lib/analysisHistory.js';
import { createAnalysisHistoryBackup, parseAnalysisHistoryBackup, mergeAnalysisHistory } from './lib/analysisHistoryBackup.js';
import { suggestedComponentType } from './lib/componentTypes.js';
import { rankFindingsByRisk } from './lib/riskPriority.js';
import { buildFindingRemediation } from './lib/remediation.js';
import { buildSecurityPosture } from './lib/securityPosture.js';
import { buildSecurityPostureCsv } from './lib/securityPostureCsv.js';
import { createAuditReport } from './lib/auditReport.js';
import { safeExternalUrl } from './lib/externalUrl.js';
import { parsePackageUrl } from './lib/packageUrl.js';
import { parseInventoryCsv } from './lib/inventoryCsv.js';
import { parseSbom } from './lib/sbom.js';
import { loadInventory, saveInventory, MAX_INVENTORY_COMPONENTS } from './lib/inventoryStorage.js';
import { inspectInventory } from './lib/inventoryQuality.js';
import { createInventoryBackup, parseInventoryBackup, compareInventories } from './lib/inventoryBackup.js';
import {
  Activity, AlertTriangle, ArrowDownRight, ArrowUpRight, Bell, BookOpen,
  Check, ChevronDown, ChevronRight, CircleHelp, ClipboardList, Cloud, Copy,
  Code2, Database, Download, FileDown, FileText, Filter, Globe2, Layers3,
  LockKeyhole, Menu, Moon, Plus, Search, Server, Settings2, Shield, ShieldAlert,
  ShieldCheck, SlidersHorizontal, Sun, Trash2, X
} from 'lucide-react';

const copy = {
  es: {
    platform: 'Plataforma de inteligencia de seguridad', overview: 'Resumen', inventory: 'Inventario',
    vulnerabilities: 'Vulnerabilidades', reports: 'Informes', settings: 'Configuración',
    workspace: 'ESPACIO DE TRABAJO', overviewTitle: 'Resumen de seguridad',
    subtitle: 'Visibilidad de vulnerabilidades en los componentes de tu tecnología.',
    guideTitle: 'Empieza en tres pasos', guideIntro: 'Obtén una primera visión de exposición a partir de las versiones que declares.',
    guideStep1: 'Añade tus tecnologías', guideStep1Text: 'Indica producto, distribución y versión exacta. Puedes empezar con un solo componente.',
    guideStep2: 'Ejecuta el análisis', guideStep2Text: 'Consultaremos fuentes públicas de vulnerabilidades y relacionaremos sus avisos con tu inventario.',
    guideStep3: 'Revisa las evidencias', guideStep3Text: 'Comprueba aplicabilidad, fuentes y versiones. Los candidatos necesitan validación antes de actuar.',
    guideCta: 'Crear mi primer inventario', guidePrivacy: 'El inventario se guarda en este navegador. Las consultas a fuentes externas pueden revelar tu IP y los identificadores consultados.',
    newAnalysis: 'Nuevo análisis', components: 'Componentes', uniqueCves: 'CVE únicas',
    critical: 'Críticas', kev: 'En catálogo KEV', riskOverview: 'Panorama de exposición',
    severity: 'Distribución por severidad', technologyMap: 'Mapa tecnológico',
    recentFindings: 'Hallazgos recientes', viewAll: 'Ver todos', component: 'Componente',
    version: 'Versión', findings: 'Hallazgos', status: 'Estado', action: 'Acción',
    addComponent: 'Añadir componente', componentName: 'Nombre del componente',
    chooseType: 'Tipo', versionLabel: 'Versión exacta', vendor: 'Fabricante / distribución', sourcePackageLabel: 'Paquete fuente (opcional)', sourceVersionLabel: 'Versión del paquete fuente (opcional)', architectureLabel: 'Arquitectura (opcional)', sourcePackageHelp: 'Para Ubuntu, AlmaLinux y Rocky Linux, indica el paquete fuente y su versión exacta si los conoces. En SUSE puedes añadir la arquitectura; estos datos refinan la correlación y no confirman por sí solos que el binario esté afectado.',
    add: 'Añadir', cancel: 'Cancelar', empty: 'Aún no hay componentes en tu inventario.',
    emptyHint: 'Añade tecnologías y versiones para preparar tu primer análisis.',
    remove: 'Eliminar', search: 'Buscar CVE o componente…', all: 'Todos',
    confirmed: 'Requiere verificación', possible: 'Coincidencia posible',
    identified: 'Versión no identificada', ready: 'Pendiente de análisis',
    os: 'Sistema operativo', web: 'Servidor web', runtime: 'Runtime',
    cms: 'CMS', database: 'Base de datos', library: 'Librería / dependencia',
    other: 'Otro', noResults: 'No hay resultados para esta búsqueda.',
    analysisTitle: 'Inventario tecnológico', analysisDesc: 'Declara manualmente los componentes y sus versiones. Quasaric no escanea tus servidores.',
    privacyNote: 'El inventario permanece en este navegador. Al analizar, las fuentes externas pueden recibir los identificadores consultados y ver tu IP. No introduzcas contraseñas, tokens ni secretos.',
    language: 'Idioma', spanish: 'Español', english: 'English',
    export: 'Exportar inventario CSV', localSaved: 'Guardado localmente', storageWarning: 'No se pudo guardar o recuperar íntegramente el inventario local. Conservamos los datos recuperables; exporta una copia y revisa el almacenamiento del navegador.',
    sourceNotice: 'Correlación de candidatos CVE con fuentes públicas. Revisa las evidencias y los límites de cobertura antes de tomar decisiones.',
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
    reportNoFindings: 'El análisis terminó sin candidatos CVE en las fuentes consultadas. Esto no demuestra que los componentes estén libres de vulnerabilidades.',
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
    guideTitle: 'Get started in three steps', guideIntro: 'Build an initial exposure view from the software versions you provide.',
    guideStep1: 'Add your technologies', guideStep1Text: 'Enter the product, distribution and exact version. Start with a single component.',
    guideStep2: 'Run the analysis', guideStep2Text: 'We query public vulnerability sources and correlate their advisories with your inventory.',
    guideStep3: 'Review the evidence', guideStep3Text: 'Check applicability, sources and versions. Candidate matches need validation before action.',
    guideCta: 'Create my first inventory', guidePrivacy: 'Your inventory is stored in this browser. External queries may disclose your IP address and the identifiers queried.',
    newAnalysis: 'New analysis', components: 'Components', uniqueCves: 'Unique CVEs',
    critical: 'Critical', kev: 'In KEV catalog', riskOverview: 'Exposure overview',
    severity: 'Severity distribution', technologyMap: 'Technology map',
    recentFindings: 'Recent findings', viewAll: 'View all', component: 'Component',
    version: 'Version', findings: 'Findings', status: 'Status', action: 'Action',
    addComponent: 'Add component', componentName: 'Component name',
    chooseType: 'Type', versionLabel: 'Exact version', vendor: 'Vendor / distribution', sourcePackageLabel: 'Source package (optional)', sourceVersionLabel: 'Source package version (optional)', architectureLabel: 'Architecture (optional)', sourcePackageHelp: 'For Ubuntu, AlmaLinux and Rocky Linux, enter the exact source package and its version when known. For SUSE, you can also provide the architecture; these fields refine correlation and do not by themselves confirm that a binary is affected.',
    add: 'Add', cancel: 'Cancel', empty: 'There are no components in your inventory yet.',
    emptyHint: 'Add technologies and versions to prepare your first analysis.',
    remove: 'Remove', search: 'Search CVE or component…', all: 'All',
    confirmed: 'Requires verification', possible: 'Possible match',
    identified: 'Version not identified', ready: 'Awaiting analysis',
    os: 'Operating system', web: 'Web server', runtime: 'Runtime',
    cms: 'CMS', database: 'Database', library: 'Library / dependency',
    other: 'Other', noResults: 'No results for this search.',
    analysisTitle: 'Technology inventory', analysisDesc: 'Enter components and their versions manually. Quasaric does not scan your servers.',
    privacyNote: 'Your inventory stays in this browser. When you analyse it, external sources may receive the identifiers queried and see your IP address. Do not enter passwords, tokens or secrets.',
    language: 'Language', spanish: 'Español', english: 'English',
    export: 'Export inventory CSV', localSaved: 'Saved locally', storageWarning: 'The local inventory could not be fully saved or recovered. Recoverable data was preserved; export a backup and check browser storage.',
    sourceNotice: 'Candidate CVE correlation using public sources. Review evidence and coverage limits before making decisions.',
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
    reportNoFindings: 'The analysis completed without CVE candidates in the queried sources. This does not prove that the components are vulnerability-free.',
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

const INVENTORY_PAGE_SIZE = 100;
const types = ['os', 'web', 'runtime', 'cms', 'database', 'library', 'other'];
const typeNames = { os: 'OS', web: 'Web', runtime: 'Runtime', cms: 'CMS', database: 'DB', library: 'Lib', other: 'Other' };
const iconFor = (type) => ({ os: Server, web: Cloud, runtime: Code2, cms: Layers3, database: Database, library: Code2, other: Layers3 }[type] || Layers3);

function App() {
  const [lang, setLang] = useState(() => {
    try { return localStorage.getItem('quasaric-language') === 'en' ? 'en' : 'es'; }
    catch { return 'es'; }
  });
  useEffect(() => {
    try { localStorage.setItem('quasaric-language', lang); } catch { /* storage may be unavailable */ }
  }, [lang]);
  useEffect(() => {
    const english = lang === 'en';
    document.documentElement.lang = lang;
    const pageTitle = english
      ? 'Quasaric — Vulnerability Intelligence'
      : 'Quasaric — Inteligencia de vulnerabilidades';
    document.title = pageTitle;
    document.querySelector('meta[property="og:title"]')?.setAttribute('content', pageTitle);
    document.querySelector('meta[name="twitter:title"]')?.setAttribute('content', pageTitle);
    const description = english
      ? 'Correlate your technology inventory with known vulnerabilities and public risk signals. Local-first analysis, traceable evidence and a transparent methodology.'
      : 'Relaciona tu inventario tecnológico con vulnerabilidades conocidas y señales públicas de riesgo. Análisis local-first, evidencias trazables y metodología transparente.';
    document.querySelector('meta[name="description"]')?.setAttribute('content', description);
    document.querySelector('meta[property="og:description"]')?.setAttribute('content', description);
    document.querySelector('meta[name="twitter:description"]')?.setAttribute('content', description);
    document.querySelector('meta[property="og:locale"]')?.setAttribute('content', english ? 'en_US' : 'es_ES');
  }, [lang]);
  const [showLanding, setShowLanding] = useState(() => window.location.hash !== '#app');
  useEffect(() => {
    const syncRoute = () => setShowLanding(window.location.hash !== '#app');
    window.addEventListener('hashchange', syncRoute);
    return () => window.removeEventListener('hashchange', syncRoute);
  }, []);
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem('quasaric-theme') === 'light' ? 'light' : 'dark'; }
    catch { return 'dark'; }
  });
  useEffect(() => {
    try { localStorage.setItem('quasaric-theme', theme); } catch { /* storage may be unavailable */ }
  }, [theme]);
  const [active, setActive] = useState('overview');
  const [initialInventory] = useState(() => loadInventory());
  const [items, setItems] = useState(initialInventory.items);
  // Keep the latest committed inventory available to async file handlers.
  const itemsRef = useRef(initialInventory.items);
  const [inventoryPage, setInventoryPage] = useState(1);
  const [storageWarning, setStorageWarning] = useState(initialInventory.warning);
  const [showAdd, setShowAdd] = useState(false);
  const addDialogRef = useRef(null);
  const addTriggerRef = useRef(null);
  const openAdd = () => {
    addTriggerRef.current = document.activeElement;
    setShowAdd(true);
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
  const mobileNavRef = useRef(null);
  const mobileNavTriggerRef = useRef(null);
  const openMobileNav = () => {
    mobileNavTriggerRef.current = document.activeElement;
    setMobileNav(true);
  };
  useEffect(() => {
    if (!mobileNav) return undefined;
    const previousOverflow = document.body.style.overflow;
    const sidebar = mobileNavRef.current;
    const focusableElements = () => sidebar
      ? [...sidebar.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')]
        .filter(element => element.getAttribute('aria-hidden') !== 'true')
      : [];
    const closeOnEscapeAndTrapFocus = event => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setMobileNav(false);
        return;
      }
      if (event.key !== 'Tab') return;
      const focusable = focusableElements();
      if (!focusable.length) {
        event.preventDefault();
        sidebar?.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && (document.activeElement === first || !sidebar?.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !sidebar?.contains(document.activeElement))) {
        event.preventDefault();
        first.focus();
      }
    };
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', closeOnEscapeAndTrapFocus);
    sidebar?.querySelector('.mobile-close')?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', closeOnEscapeAndTrapFocus);
      if (mobileNavTriggerRef.current?.isConnected) mobileNavTriggerRef.current.focus();
      mobileNavTriggerRef.current = null;
    };
  }, [mobileNav]);
  const [query, setQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [selectedFinding, setSelectedFinding] = useState(null);
  const selectedFindingDialogRef = useRef(null);
  const selectedFindingTriggerRef = useRef(null);
  const openFindingDetails = finding => {
    selectedFindingTriggerRef.current = document.activeElement;
    setSelectedFinding(finding);
  };
  useEffect(() => {
    if (!selectedFinding) return undefined;
    const previousOverflow = document.body.style.overflow;
    const dialog = selectedFindingDialogRef.current;
    const focusableElements = () => dialog
      ? [...dialog.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')]
        .filter(element => element.getAttribute('aria-hidden') !== 'true')
      : [];
    const handleDialogKeys = event => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setSelectedFinding(null);
        return;
      }
      if (event.key !== 'Tab') return;
      const focusable = focusableElements();
      if (!focusable.length) {
        event.preventDefault();
        dialog?.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && (document.activeElement === first || !dialog?.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !dialog?.contains(document.activeElement))) {
        event.preventDefault();
        first.focus();
      }
    };
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleDialogKeys);
    dialog?.querySelector('.finding-detail-close')?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleDialogKeys);
      if (selectedFindingTriggerRef.current?.isConnected) selectedFindingTriggerRef.current.focus();
      selectedFindingTriggerRef.current = null;
    };
  }, [selectedFinding]);
  const [analysis, setAnalysis] = useState(null);
  const [analysisHistoryWarning, setAnalysisHistoryWarning] = useState(false);
  const analysisAbortRef = useRef(null);
  const [analysisHistory, setAnalysisHistory] = useState(() => loadAnalysisHistory());
  // Latest committed value shared by asynchronous imports and analysis completion.
  const analysisHistoryRef = useRef(analysisHistory);
  const [historyBackupMessage, setHistoryBackupMessage] = useState('');
  const [historyBackupError, setHistoryBackupError] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState('');
  const [analysisProgress, setAnalysisProgress] = useState({ completed: 0, total: 0 });
  const [importMessage, setImportMessage] = useState('');
  const [importError, setImportError] = useState('');
  const [addFormError, setAddFormError] = useState('');
  const [inventoryComparison, setInventoryComparison] = useState(null);
  const [form, setForm] = useState({ name: '', type: 'other', version: '', vendor: '', sourcePackage: '', sourceVersion: '', architecture: '', purl: '', cpe: '' });
  const suggestedType = suggestedComponentType(form.name);
  const t = copy[lang];

  const triggerCsvDownload = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    // Let the browser begin consuming the blob before releasing its URL.
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const exportAnalysisHistory = () => {
    try {
      const backup = createAnalysisHistoryBackup(analysisHistoryRef.current);
      triggerCsvDownload(new Blob([backup], { type: 'application/json;charset=utf-8' }), 'quasaric-analysis-history.json');
      setHistoryBackupError('');
      setHistoryBackupMessage(lang === 'es' ? 'Copia del historial descargada.' : 'Analysis history backup downloaded.');
    } catch (error) {
      setHistoryBackupMessage('');
      setHistoryBackupError(error.message || (lang === 'es' ? 'No se pudo exportar el historial.' : 'Could not export analysis history.'));
    }
  };

  const handleAnalysisHistoryImport = async event => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setHistoryBackupMessage('');
    setHistoryBackupError('');
    try {
      if (file.size > 10 * 1024 * 1024) throw new Error(lang === 'es' ? 'El archivo supera el límite de 10 MB.' : 'The file exceeds the 10 MB limit.');
      const imported = parseAnalysisHistoryBackup(await file.text());
      const next = mergeAnalysisHistory(analysisHistoryRef.current, imported);
      if (!saveAnalysisHistory(next)) throw new Error(lang === 'es' ? 'No hay espacio disponible para guardar el historial en este navegador.' : 'There is not enough browser storage to save the history.');
      analysisHistoryRef.current = next;
      setAnalysisHistory(next);
      setAnalysisHistoryWarning(false);
      setHistoryBackupMessage(lang === 'es'
        ? `Historial integrado: ${imported.length} análisis importados; ${next.length} conservados en total.`
        : `History merged: ${imported.length} analyses imported; ${next.length} retained in total.`);
    } catch (error) {
      setHistoryBackupError(error.message || (lang === 'es' ? 'No se pudo importar el historial.' : 'Could not import analysis history.'));
    }
  };

  const exportPostureCsv = () => {
    const csv = buildSecurityPostureCsv(posture);
    triggerCsvDownload(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), 'quasaric-security-posture.csv');
  };

  const persist = (next) => {
    // Do not change the in-memory inventory unless the same snapshot can be
    // persisted; otherwise the UI could report an import that disappears on reload.
    try {
      if (!saveInventory(next)) throw new Error('Local storage unavailable or full.');
    } catch {
      setStorageWarning(true);
      return false;
    }
    // Stop any in-flight analysis only after the inventory has been saved.
    analysisAbortRef.current?.abort();
    itemsRef.current = next;
    setItems(next);
    setInventoryPage(1);
    // Findings belong to the exact inventory snapshot that was analysed.
    // Never keep presenting them as current after inventory edits.
    setAnalysis(null);
    setAnalysisError('');
    setSelectedFinding(null);
    setStorageWarning(false);
    return true;
  };
  const inventoryPageCount = Math.max(1, Math.ceil(items.length / INVENTORY_PAGE_SIZE));
  const visibleInventoryItems = useMemo(() => {
    const start = (inventoryPage - 1) * INVENTORY_PAGE_SIZE;
    return items.slice(start, start + INVENTORY_PAGE_SIZE);
  }, [items, inventoryPage]);
  const inventoryQuality = useMemo(() => inspectInventory(items), [items]);
  const posture = useMemo(() => buildSecurityPosture(analysisHistory), [analysisHistory]);
  const latestComparison = useMemo(() => analysisHistory.length >= 2
    ? compareAnalysisSnapshots(analysisHistory[1], analysisHistory[0])
    : null, [analysisHistory]);

  const prioritizedFindings = useMemo(() => analysis?.findings?.length
    ? rankFindingsByRisk(analysis.findings).map(finding => ({ ...finding, remediation: buildFindingRemediation(finding) }))
    : [], [analysis]);
  const riskBandLabel = band => ({ critical: t.riskCritical, high: t.riskHigh, moderate: t.riskModerate, low: t.riskLow }[band] || t.riskLow);
  const severityLabel = severity => ({ critical: lang === 'es' ? 'Crítica' : 'Critical', high: lang === 'es' ? 'Alta' : 'High', medium: lang === 'es' ? 'Media' : 'Medium', low: lang === 'es' ? 'Baja' : 'Low', unknown: lang === 'es' ? 'Desconocida' : 'Unknown' }[String(severity || '').toLowerCase()] || severity || '—');
  const applicabilityLabel = status => ({ possible: lang === 'es' ? 'Posible' : 'Possible', affected: lang === 'es' ? 'Afectado' : 'Affected', patched_candidate: lang === 'es' ? 'Parche candidato · verificar' : 'Patch candidate · verify', unaffected: lang === 'es' ? 'No afectado' : 'Not affected', needs_review: lang === 'es' ? 'Verificar' : 'Review' }[String(status || '').toLowerCase()] || status || '');
  const sourceNameLabel = source => ({ nvd: 'NVD', epss: 'FIRST EPSS', kev: 'CISA KEV', osvPurl: 'OSV · PURL', ubuntuOsv: 'Ubuntu OSV', osvLinuxDistributions: lang === 'es' ? 'OSV · distribuciones Linux' : 'OSV · Linux distributions', redHatSecurityData: 'Red Hat Security Data', ubuntuVex: 'Canonical OpenVEX', suseCsafVex: 'SUSE CSAF VEX' }[source] || source);
  const sourceStatusLabel = status => ({ queried: lang === 'es' ? 'consultada' : 'queried', limited: lang === 'es' ? 'limitada' : 'limited', partial_or_unavailable: lang === 'es' ? 'parcial o no disponible' : 'partial or unavailable', unavailable: lang === 'es' ? 'no disponible' : 'unavailable', not_configured: lang === 'es' ? 'no configurada' : 'not configured', needs_source_package: lang === 'es' ? 'requiere paquete fuente' : 'needs source package', needs_review: lang === 'es' ? 'requiere revisión' : 'needs review', no_matching_documents: lang === 'es' ? 'sin documentos coincidentes' : 'no matching documents' }[String(status || '').toLowerCase()] || status || '');
  const evidenceStatusLabel = status => ({ vendor_evidence: lang === 'es' ? 'evidencia del fabricante' : 'vendor evidence', affected_candidate: lang === 'es' ? 'candidato afectado' : 'affected candidate', matched: lang === 'es' ? 'coincidencia' : 'matched', verified: lang === 'es' ? 'verificado' : 'verified', fixed: lang === 'es' ? 'corregido según la fuente' : 'fixed per source', affected: lang === 'es' ? 'afectado' : 'affected', not_affected: lang === 'es' ? 'no afectado' : 'not affected', under_investigation: lang === 'es' ? 'en investigación' : 'under investigation', patched_candidate: lang === 'es' ? 'parche candidato · verificar' : 'patch candidate · verify', needs_review: lang === 'es' ? 'requiere revisión' : 'needs review', unavailable: lang === 'es' ? 'no disponible' : 'unavailable' }[String(status || '').toLowerCase()] || status || '—');
  const findingStats = useMemo(() => {
    const findings = prioritizedFindings;
    const countSeverity = severity => findings.filter(item => String(item.severity || '').toLowerCase() === severity).length;
    return {
      total: findings.length,
      critical: countSeverity('critical'),
      high: countSeverity('high'),
      medium: countSeverity('medium'),
      low: countSeverity('low'),
      kev: findings.filter(item => (item.kev === true)).length,
      averageRisk: findings.length ? Math.round(findings.reduce((sum, item) => sum + item.riskPriority.score, 0) / findings.length) : 0
    };
  }, [prioritizedFindings]);


  const filtered = useMemo(() => {
    const live = analysis ? prioritizedFindings.map(f => ({
      id: f.id,
      title: f.description,
      component: f.components.map(x => x.component.name).join(', '),
      severity: f.severity || 'Unknown',
      score: f.cvss ?? '—',
      state: (f.kev === true) ? 'KEV' : 'Candidate',
      riskPriority: f.riskPriority,
      remediation: f.remediation,
      applicabilityStatus: f.applicabilityStatus,
      live: true
    })) : null;
    const rows = live || [];
    return rows.filter(x => (x.id + x.title + x.component).toLowerCase().includes(query.toLowerCase())
      && (severityFilter === 'all' || (severityFilter === 'kev' ? x.state === 'KEV' : String(x.severity).toLowerCase() === severityFilter)));
  }, [analysis, prioritizedFindings, query, severityFilter]);

  const runAnalysis = async () => {
    // State updates are asynchronous; the ref also blocks rapid duplicate
    // activations before React has rendered the analyzing state.
    if (!items.length || analyzing || analysisAbortRef.current) return;
    const controller = new AbortController();
    analysisAbortRef.current = controller;
    setAnalyzing(true); setAnalysisError(''); setAnalysisHistoryWarning(false); setAnalysis(null); setAnalysisProgress({ completed: 0, total: items.length });
    try {
      const result = await analyzeInventory(items, {
        signal: controller.signal,
        onProgress: progress => {
          // Ignore late progress events from an analysis invalidated by edits.
          if (analysisAbortRef.current === controller && !controller.signal.aborted) {
            setAnalysisProgress(progress);
          }
        }
      });
      // Inventory edits abort the active analysis. Re-check after await as a
      // final source request may resolve just before its abort is delivered.
      if (controller.signal.aborted || analysisAbortRef.current !== controller) return;
      setAnalysis(result);
      const snapshot = createAnalysisSnapshot(result, items);
      // Upsert against the latest value: an import may have completed while this analysis was running.
      const nextHistory = upsertAnalysisSnapshot(analysisHistoryRef.current, snapshot);
      analysisHistoryRef.current = nextHistory;
      setAnalysisHistory(nextHistory);
      const historySaved = saveAnalysisHistory(nextHistory);
      setAnalysisHistoryWarning(!historySaved);
    } catch (error) {
      // Aborted or superseded runs must not surface stale errors over the
      // current inventory or a subsequent analysis.
      if (analysisAbortRef.current === controller && !controller.signal.aborted && error?.name !== 'AbortError') {
        setAnalysisError(error.message || 'Analysis failed');
      }
    }
    finally {
      // A stale request must never clear the busy state of a newer analysis.
      if (analysisAbortRef.current === controller) {
        analysisAbortRef.current = null;
        setAnalyzing(false);
      }
    }
  };

  const handleInventoryImport = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setImportMessage('');
    setImportError('');
    try {
      if (file.size > 5 * 1024 * 1024) throw new Error(lang === 'es' ? 'El CSV supera el límite de 5 MB.' : 'CSV exceeds the 5 MB limit.');
      const parsed = parseInventoryCsv(await file.text());
      const currentItems = itemsRef.current;
      if (currentItems.length + parsed.components.length > MAX_INVENTORY_COMPONENTS) {
        throw new Error(lang === 'es'
          ? `La importación superaría el límite de ${MAX_INVENTORY_COMPONENTS.toLocaleString('es-ES')} componentes. No se ha modificado el inventario.`
          : `Import would exceed the ${MAX_INVENTORY_COMPONENTS.toLocaleString('en-US')} component limit. Inventory was not changed.`);
      }
      const imported = parsed.components.map(component => ({
        ...component,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString()
      }));
      const previousDuplicateCount = inspectInventory(currentItems).duplicates.length;
      const combined = [...currentItems, ...imported];
      const duplicateCount = Math.max(0, inspectInventory(combined).duplicates.length - previousDuplicateCount);
      if (imported.length && !persist(combined)) throw new Error(lang === 'es' ? 'No se pudo guardar el inventario. No se ha aplicado la importación.' : 'Could not save the inventory. The import was not applied.');
      const summary = lang === 'es'
        ? `Importados: ${imported.length}. Posibles duplicados: ${duplicateCount} (se conservan, no se descartan). Filas con errores: ${parsed.errors.length}.`
        : `Imported: ${imported.length}. Possible duplicates: ${duplicateCount} (kept; none discarded). Invalid rows: ${parsed.errors.length}.`;
      setImportMessage(summary + (parsed.errors.length ? ' ' + parsed.errors.slice(0, 20).map(error => `${lang === 'es' ? 'Fila' : 'Row'} ${error.row}: ${error.message}`).join(' ') + (parsed.errors.length > 20 ? (lang === 'es' ? ` Y ${parsed.errors.length - 20} errores más.` : ` And ${parsed.errors.length - 20} more errors.`) : '') : ''));
    } catch (error) {
      setImportError(error.message || (lang === 'es' ? 'No se pudo importar el CSV.' : 'Could not import CSV.'));
    } finally {
      event.target.value = '';
    }
  };


  const handleSbomImport = async event => {
    const file = event.target.files?.[0];
    if (!file) return;
    setImportMessage('');
    setImportError('');
    try {
      if (file.size > 10 * 1024 * 1024) throw new Error(lang === 'es' ? 'El SBOM supera el límite de 10 MB.' : 'SBOM exceeds the 10 MB limit.');
      const parsed = parseSbom(await file.text());
      const currentItems = itemsRef.current;
      if (currentItems.length + parsed.components.length > MAX_INVENTORY_COMPONENTS) {
        throw new Error(lang === 'es'
          ? `La importación superaría el límite de ${MAX_INVENTORY_COMPONENTS.toLocaleString('es-ES')} componentes. No se ha modificado el inventario.`
          : `Import would exceed the ${MAX_INVENTORY_COMPONENTS.toLocaleString('en-US')} component limit. Inventory was not changed.`);
      }
      const imported = parsed.components.map(component => ({ ...component, id: crypto.randomUUID(), createdAt: new Date().toISOString() }));
      const previousDuplicateCount = inspectInventory(currentItems).duplicates.length;
      const combined = [...currentItems, ...imported];
      const duplicateCount = Math.max(0, inspectInventory(combined).duplicates.length - previousDuplicateCount);
      if (imported.length && !persist(combined)) throw new Error(lang === 'es' ? 'No se pudo guardar el inventario. No se ha aplicado la importación.' : 'Could not save the inventory. The import was not applied.');
      const summary = lang === 'es'
        ? `SBOM ${parsed.format}: importados ${imported.length}. Posibles duplicados: ${duplicateCount} (se conservan). Entradas omitidas: ${parsed.errors.length}. Advertencias de identificador: ${parsed.warnings.length}.`
        : `SBOM ${parsed.format}: imported ${imported.length}. Possible duplicates: ${duplicateCount} (kept). Skipped entries: ${parsed.errors.length}. Identifier warnings: ${parsed.warnings.length}.`;
      const details = [
        ...parsed.errors.slice(0, 8).map(error => `${lang === 'es' ? 'Entrada' : 'Entry'} ${error.index}: ${error.message}`),
        ...parsed.warnings.slice(0, 8).map(warning => {
          const source = warning.message.includes('source package');
          const message = lang === 'es'
            ? (source
              ? 'La versión del paquete fuente no coincide con la versión de su PURL; se ha retirado ese PURL.'
              : 'La versión del componente no coincide con la versión de su PURL; se ha retirado ese PURL.')
            : warning.message;
          return `${lang === 'es' ? 'Advertencia en entrada' : 'Warning in entry'} ${warning.index}: ${message}`;
        })
      ];
      setImportMessage(summary + (details.length ? ' ' + details.join(' ') : ''));
    } catch (error) {
      setImportError(error.message || (lang === 'es' ? 'No se pudo importar el SBOM.' : 'Could not import SBOM.'));
    } finally { event.target.value = ''; }
  };

  const addItem = (event) => {
    event.preventDefault();
    if (!form.name.trim()) return;
    if (form.purl.trim() && !parsePackageUrl(form.purl)) {
      setAddFormError(lang === 'es' ? 'El PURL debe ser una Package URL válida (formato pkg:...). No se ha añadido el componente.' : 'PURL must be a valid Package URL (pkg:... format). The component was not added.');
      return;
    }
    setAddFormError('');
    if (itemsRef.current.length >= MAX_INVENTORY_COMPONENTS) {
      setAddFormError(lang === 'es'
        ? `El inventario ha alcanzado el límite de ${MAX_INVENTORY_COMPONENTS.toLocaleString('es-ES')} componentes. Exporta una copia o elimina componentes antes de añadir más.`
        : `The inventory has reached the ${MAX_INVENTORY_COMPONENTS.toLocaleString('en-US')} component limit. Export a backup or remove components before adding more.`);
      return;
    }
    if (!persist([...itemsRef.current, { ...form, id: crypto.randomUUID(), createdAt: new Date().toISOString() }])) {
      setAddFormError(lang === 'es' ? 'No se pudo guardar el inventario. Comprueba el almacenamiento del navegador; no se ha añadido el componente.' : 'Could not save the inventory. Check browser storage; the component was not added.');
      return;
    }
    setForm({ name: '', type: 'other', version: '', vendor: '', sourcePackage: '', sourceVersion: '', architecture: '', purl: '', cpe: '' });
    setShowAdd(false);
  };

  const downloadCsv = (rows, filename) => {
    const blob = new Blob([toCsv(rows)], { type: 'text/csv;charset=utf-8' });
    triggerCsvDownload(blob, filename);
  };

  const exportCsv = () => {
    const rows = [['name','type','version','vendor','sourcePackage','sourceVersion','architecture','sourceRelationship','sourceRef','sourcePurl','purl','cpe'], ...items.map(x => [x.name, x.type, x.version, x.vendor, x.sourcePackage || '', x.sourceVersion || '', x.architecture || '', x.sourceRelationship || '', x.sourceRef || '', x.sourcePurl || '', x.purl || '', x.cpe || ''])];
    downloadCsv(rows, 'quasaric-inventory.csv');
  };
  const exportJsonBackup = () => {
    try {
      const blob = new Blob([JSON.stringify(createInventoryBackup(items), null, 2)], { type: 'application/json;charset=utf-8' });
      triggerCsvDownload(blob, 'quasaric-inventory-backup.json');
      setImportError('');
      setImportMessage(lang === 'es' ? 'Copia JSON exportada correctamente.' : 'JSON backup exported successfully.');
    } catch (error) {
      setImportError(error.message || (lang === 'es' ? 'No se pudo exportar la copia.' : 'Could not export backup.'));
    }
  };
  const handleJsonRestore = async event => {
    const file = event.target.files?.[0]; if (!file) return;
    setImportError(''); setImportMessage('');
    try {
      if (file.size > 10 * 1024 * 1024) throw new Error(lang === 'es' ? 'La copia supera el límite de 10 MB.' : 'Backup exceeds the 10 MB limit.');
      const backup = parseInventoryBackup(await file.text());
      // parseInventoryBackup already repairs missing/duplicate IDs. Keep valid IDs
      // so restoring the same backup preserves component identity in history.
      const restored = backup.components.map(item => ({ ...item, createdAt: item.createdAt || new Date().toISOString() }));
      const currentItems = itemsRef.current;
      if (!window.confirm(lang === 'es' ? `Vas a reemplazar los ${currentItems.length} componentes actuales por ${restored.length} de la copia. ¿Continuar?` : `Replace the current ${currentItems.length} components with ${restored.length} from backup?`)) return;
      if (!persist(restored)) throw new Error(lang === 'es' ? 'No se pudo guardar el inventario. La restauración no se ha aplicado.' : 'Could not save the inventory. The restore was not applied.');
      setInventoryComparison(null);
      setImportMessage(lang === 'es' ? `Copia restaurada: ${restored.length} componentes.` : `Backup restored: ${restored.length} components.`);
    } catch(error) { setImportError(error.message || 'Could not restore backup.'); }
    finally { event.target.value = ''; }
  };
  const handleCompareBackup = async event => {
    const file = event.target.files?.[0]; if (!file) return;
    setImportError('');
    try {
      if (file.size > 10 * 1024 * 1024) throw new Error(lang === 'es' ? 'La copia supera el límite de 10 MB.' : 'Backup exceeds the 10 MB limit.');
      const backup = parseInventoryBackup(await file.text());
      setInventoryComparison(compareInventories(backup.components, itemsRef.current));
    } catch(error) { setImportError(error.message || 'Could not compare backup.'); }
    finally { event.target.value = ''; }
  };

  const exportFindingsCsv = () => {
    if (!analysis?.findings?.length) return;
    const rows = [
      ['CVE','Description','CVSS','Severity','EPSS','CISA KEV','Applicability','Risk score','Risk band','Components','Remediation guidance (JSON)','CVSS vector','NVD URL','Evidence by source (JSON)'],
      ...prioritizedFindings.map(f => [
        f.id, f.description, f.cvss ?? '', f.severity ?? '', f.epss ?? '',
        (f.kev === true) ? 'yes' : 'no', f.applicabilityStatus,
        f.riskPriority.score, f.riskPriority.band,
        f.components.map(x => x.component.name + ' ' + x.component.version).join('; '),
        JSON.stringify(f.remediation),
        f.vector ?? '', 'https://nvd.nist.gov/vuln/detail/' + f.id,
        JSON.stringify(f.components.flatMap(component => component.evidence || []))
      ])
    ];
    downloadCsv(rows, 'quasaric-findings.csv');
  };

  const exportAuditReport = () => {
    if (!analysis) return;
    try {
      const report = createAuditReport({
        analysis,
        inventory: items,
        prioritizedFindings,
        posture,
        comparison: latestComparison
      });
      triggerCsvDownload(
        new Blob([report], { type: 'application/json;charset=utf-8' }),
        'quasaric-security-audit.json'
      );
    } catch (error) {
      setAnalysisError(error.message || (lang === 'es' ? 'No se pudo generar el informe de auditoría.' : 'Could not generate the audit report.'));
    }
  };

  const nav = [
    { id: 'overview', label: t.overview, icon: Activity },
    { id: 'posture', label: t.posture, icon: ShieldCheck },
    { id: 'inventory', label: t.inventory, icon: ClipboardList },
    { id: 'vulnerabilities', label: t.vulnerabilities, icon: ShieldAlert },
    { id: 'reports', label: t.reports, icon: FileText },
    { id: 'help', label: lang === 'es' ? 'Guía de versiones' : 'Version guide', icon: CircleHelp }
  ];

  if (showLanding) {
    return <LandingPage lang={lang} onLanguageChange={setLang} onOpenApp={() => { window.location.hash = 'app'; setShowLanding(false); }} />;
  }

  return (
    <div className="app-shell" data-theme={theme}>
      <a className="skip-link" href="#main-content">{lang === 'es' ? 'Saltar al contenido principal' : 'Skip to main content'}</a>
      <aside ref={mobileNavRef} id="primary-navigation" className={'sidebar ' + (mobileNav ? 'sidebar-open' : '')} role={mobileNav ? 'dialog' : undefined} aria-modal={mobileNav ? 'true' : undefined} aria-label={lang === 'es' ? 'Navegación principal' : 'Primary navigation'}>
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
          <div className="sidebar-user"><div className="avatar">Q</div><div className="user-copy"><strong>Quasaric</strong><span>{lang === 'es' ? 'Espacio local' : 'Local workspace'}</span></div><ChevronDown size={15}/></div>
        </div>
      </aside>
      {mobileNav && <div className="mobile-nav-backdrop" aria-hidden="true" onClick={() => setMobileNav(false)} />}

      <main id="main-content" className="main-area" tabIndex={-1} inert={mobileNav}>
        <header className="topbar">
          <button className="icon-btn mobile-menu" onClick={openMobileNav} aria-label={lang === 'es' ? 'Abrir menú' : 'Open menu'} aria-expanded={mobileNav} aria-controls="primary-navigation"><Menu size={19}/></button>
          <div className="breadcrumb"><span>Quasaric</span><ChevronRight size={14}/><strong>{active === 'overview' ? t.overview : active === 'inventory' ? t.inventory : active === 'vulnerabilities' ? t.vulnerabilities : active === 'posture' ? t.posture : active === 'reports' ? t.reports : active === 'help' ? (lang === 'es' ? 'Guía de versiones' : 'Version guide') : t.settings}</strong></div>
          <div className="top-actions">
            <span className={`status-pill${storageWarning ? " status-warning" : ""}`} role={storageWarning ? "alert" : "status"}><span className="status-dot"/> {storageWarning ? t.storageWarning : t.localSaved}</span>
            <button className="language-btn site-home-btn" onClick={() => { window.location.hash = ''; setShowLanding(true); }}>{lang === 'es' ? 'Web pública' : 'Public site'}</button>
            <button className="language-btn" onClick={() => setLang(lang === 'es' ? 'en' : 'es')} aria-label={t.language}><Globe2 size={15}/><span>{lang.toUpperCase()}</span></button>
            <button className="language-btn theme-toggle" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label={lang === 'es' ? (theme === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro') : (theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme')} title={lang === 'es' ? (theme === 'dark' ? 'Tema claro' : 'Tema oscuro') : (theme === 'dark' ? 'Light theme' : 'Dark theme')}>{theme === 'dark' ? <Sun size={15}/> : <Moon size={15}/>}</button>
            <button className="icon-btn" onClick={() => setActive('help')} aria-label={lang === 'es' ? 'Abrir guía de versiones' : 'Open version guide'} title={lang === 'es' ? 'Guía de versiones' : 'Version guide'}><CircleHelp size={18}/></button>
          </div>
        </header>

        <div className="content">
          {active === 'help' && <>
            <div className="page-heading"><div><div className="eyebrow">{lang === 'es' ? 'CENTRO DE AYUDA' : 'HELP CENTER'}</div><h1>{lang === 'es' ? 'Cómo identificar versiones' : 'How to identify versions'}</h1><p>{lang === 'es' ? 'Encuentra la versión exacta de tus sistemas y tecnologías antes de añadirlos al inventario.' : 'Find the exact version of your systems and technologies before adding them to your inventory.'}</p></div><button className="secondary-btn" onClick={() => { setActive('inventory'); openAdd(); }}><Plus size={15}/>{lang === 'es' ? 'Añadir componente' : 'Add component'}</button></div>
            <section className="panel version-guide-intro"><BookOpen size={20}/><div><strong>{lang === 'es' ? '¿Qué versión debo indicar?' : 'Which version should I enter?'}</strong><p>{lang === 'es' ? 'Introduce la versión instalada, no la última disponible en Internet. Conserva revisiones y niveles de parche del proveedor. Ejecuta los comandos localmente y no compartas datos sensibles.' : 'Enter the installed version, not the latest version available online. Preserve vendor revisions and patch levels. Run commands locally and do not share sensitive data.'}</p></div></section>
            <div className="version-guide-grid">
              {[
                {group:lang==='es'?'Sistemas operativos':'Operating systems',items:[
                  {name:'Ubuntu / Debian',desc:lang==='es'?'Versión de distribución y paquete Debian instalado.':'Distribution and installed Debian package version.',cmd:"cat /etc/os-release\ndpkg-query -W -f='${binary:Package} ${Version} ${Architecture} ${source:Package} ${source:Version}\\n' openssl"},
                  {name:'Windows Server',desc:lang==='es'?'Edición, versión y compilación desde PowerShell.':'Edition, version and build from PowerShell.',cmd:'Get-ComputerInfo | Select-Object WindowsProductName, WindowsVersion, OsBuildNumber'},
                  {name:'RHEL / Rocky / AlmaLinux / Fedora',desc:lang==='es'?'Versión del sistema y del paquete RPM.':'System and installed RPM package versions.',cmd:'cat /etc/os-release\nrpm -q openssl'},
                  {name:'Alpine Linux',desc:lang==='es'?'Versión de Alpine y paquete APK.':'Alpine and installed APK package versions.',cmd:'cat /etc/alpine-release\napk info -v openssl'}
                ]},
                {group:lang==='es'?'Servidores y runtimes':'Servers and runtimes',items:[
                  {name:'NGINX',desc:lang==='es'?'Versión del servidor, incluidos sufijos del proveedor.':'Server version, including vendor suffixes.',cmd:'nginx -v 2>&1'},
                  {name:'Apache HTTP Server',desc:lang==='es'?'Versión del servidor Apache.':'Apache server version.',cmd:'apachectl -v'},
                  {name:'PHP',desc:lang==='es'?'Versión del intérprete PHP.':'PHP interpreter version.',cmd:'php -v'},
                  {name:'Node.js',desc:lang==='es'?'Versión de Node.js y npm.':'Node.js and npm versions.',cmd:'node --version\nnpm --version'},
                  {name:'Python',desc:lang==='es'?'Versión del intérprete usado por la aplicación.':'Interpreter version used by the application.',cmd:'python3 --version'}
                ]},
                {group:lang==='es'?'Bases de datos':'Databases',items:[
                  {name:'PostgreSQL',desc:lang==='es'?'Versión del cliente y confirma la del servidor.':'Client version; confirm the server version.',cmd:'psql --version\n-- En psql: SHOW server_version;'},
                  {name:'MySQL / MariaDB',desc:lang==='es'?'Versión del cliente y del servidor SQL.':'SQL client and server versions.',cmd:'mysql --version\n-- En SQL: SELECT VERSION();'}
                ]},
                {group:lang==='es'?'Plataformas y contenedores':'Platforms and containers',items:[
                  {name:'IIS (Windows)',desc:lang==='es'?'Consulta la versión instalada de IIS en el Registro.':'Read the installed IIS version from the registry.',cmd:"Get-ItemProperty 'HKLM:\\\\SOFTWARE\\\\Microsoft\\\\InetStp' | Select-Object VersionString, MajorVersion, MinorVersion"},
                  {name:'Java',desc:lang==='es'?'Versión del runtime Java activo en el PATH.':'Active Java runtime version in PATH.',cmd:'java -version'},
                  {name:'Docker',desc:lang==='es'?'Consulta la versión del daemon del servidor, no solo la del cliente.':'Check the server daemon version, not only the client.',cmd:"docker version --format '{{.Server.Version}}'"},
                  {name:'Kubernetes',desc:lang==='es'?'Muestra versiones de kubectl y del servidor del clúster.':'Shows kubectl and cluster server versions.',cmd:'kubectl version -o yaml'}
                ]},
                {group:lang==='es'?'Bases de datos NoSQL':'NoSQL databases',items:[
                  {name:'Redis',desc:lang==='es'?'Consulta la versión del servidor Redis.':'Query the Redis server version.',cmd:'redis-server --version\nredis-cli INFO server'},
                  {name:'MongoDB',desc:lang==='es'?'Consulta la versión del servidor desde mongosh.':'Query the server version from mongosh.',cmd:'mongod --version\n// En mongosh: db.runCommand({ buildInfo: 1 }).version'}
                ]}
              ].map(group=><section className="panel version-guide-group" key={group.group}><h2>{group.group}</h2><div className="version-guide-items">{group.items.map(item=><article className="version-guide-item" key={item.name}><div><h3>{item.name}</h3><p>{item.desc}</p></div><pre><code>{item.cmd}</code></pre><button type="button" className="copy-command-btn" onClick={() => navigator.clipboard?.writeText(item.cmd)}><Copy size={13}/>{lang === 'es' ? 'Copiar comando' : 'Copy command'}</button></article>)}</div></section>)}
            </div>
            <section className="panel version-guide-note"><strong>{lang === 'es' ? 'Campos específicos de Ubuntu' : 'Ubuntu-specific fields'}</strong><p>{lang === 'es' ? 'Para correlacionar avisos de paquetes Ubuntu, Quasaric puede necesitar el nombre y la versión del paquete fuente, además del paquete binario y su arquitectura. Son campos opcionales.' : 'To correlate Ubuntu package advisories, Quasaric may need the source package name and version in addition to the binary package and architecture. These fields are optional.'}</p></section>
          </>}
          {active === 'overview' && <>
            <div className="page-heading"><div><div className="eyebrow">{t.platform}</div><h1>{t.overviewTitle}</h1><p>{t.subtitle}</p></div><button className="primary-btn" onClick={() => { setActive('inventory'); openAdd(); }}><Plus size={17}/>{t.newAnalysis}</button></div>
            {!items.length && <section className="panel getting-started">
              <div className="getting-started-heading"><div><span className="eyebrow">{lang === 'es' ? 'PRIMEROS PASOS' : 'QUICK START'}</span><h2>{t.guideTitle}</h2><p>{t.guideIntro}</p></div></div>
              <div className="getting-started-grid">
                <article><span className="getting-started-number">01</span><div><strong>{t.guideStep1}</strong><p>{t.guideStep1Text}</p></div></article>
                <article><span className="getting-started-number">02</span><div><strong>{t.guideStep2}</strong><p>{t.guideStep2Text}</p></div></article>
                <article><span className="getting-started-number">03</span><div><strong>{t.guideStep3}</strong><p>{t.guideStep3Text}</p></div></article>
              </div>
              <div className="getting-started-footer"><span><LockKeyhole size={14}/>{t.guidePrivacy}</span><button className="primary-btn" onClick={() => { setActive('inventory'); openAdd(); }}><Plus size={16}/>{t.guideCta}</button></div>
            </section>}
            <section className="metric-grid">
              <Metric icon={Layers3} label={t.components} value={String(items.length)} hint={lang === 'es' ? 'En tu inventario' : 'In your inventory'} />
              <Metric icon={ShieldAlert} label={t.uniqueCves} value={analysis ? String(findingStats.total) : '—'} hint={analysis ? (lang === 'es' ? 'Hallazgos del último análisis' : 'Findings in latest analysis') : t.sourceNotice} />
              <Metric icon={AlertTriangle} label={t.critical} value={analysis ? String(findingStats.critical) : '—'} hint={analysis ? (lang === 'es' ? 'Severidad crítica' : 'Critical severity') : (lang === 'es' ? 'Ejecuta un análisis' : 'Run an analysis')} />
              <Metric icon={ShieldCheck} label={t.kev} value={analysis ? String(findingStats.kev) : '—'} hint={lang === 'es' ? 'CISA Known Exploited Vulnerabilities' : 'CISA Known Exploited Vulnerabilities'} />
            </section>
            <div className="dashboard-grid">
              <section className="panel exposure-panel"><PanelHead title={t.riskOverview} detail={analysis ? (lang === 'es' ? 'Puntuación media de prioridad' : 'Average risk priority score') : t.sourceNotice}/>{analysis ? <div className="risk-score-visual"><div className="risk-score-ring" style={{'--risk-score': findingStats.averageRisk}}><div><strong>{findingStats.averageRisk}</strong><span>/ 100</span></div></div><div className="risk-score-copy"><strong>{lang === 'es' ? 'Prioridad media' : 'Average priority'}</strong><span>{lang === 'es' ? 'Puntuación combinada de KEV, EPSS, CVSS y aplicabilidad.' : 'Combined KEV, EPSS, CVSS and applicability score.'}</span></div></div> : <div className="empty-visual"><div className="orbit orbit-one"/><div className="orbit orbit-two"/><div className="orbit-core"><Shield size={27}/></div><span className="orbit-label label-top">{lang === 'es' ? 'APLICABILIDAD' : 'APPLICABILITY'}</span><span className="orbit-label label-bottom">{lang === 'es' ? 'INTELIGENCIA' : 'INTELLIGENCE'}</span></div>}<div className="panel-foot"><span><i className="legend-dot blue"/> {analysis ? (lang === 'es' ? 'Datos del último análisis' : 'Latest analysis data') : (lang === 'es' ? 'Inventario local' : 'Local inventory')}</span><span><i className="legend-dot muted"/> {analysis ? findingStats.total + ' CVE' : (lang === 'es' ? 'Fuentes pendientes' : 'Sources pending')}</span></div></section>
              <section className="panel severity-panel"><PanelHead title={t.severity} detail={analysis ? (lang === 'es' ? 'Distribución de hallazgos' : 'Finding distribution') : (lang === 'es' ? 'Se mostrará tras el análisis' : 'Available after analysis')}/>{analysis ? <div className="severity-chart">{[{key:'critical',label:lang==='es'?'Crítica':'Critical',value:findingStats.critical},{key:'high',label:lang==='es'?'Alta':'High',value:findingStats.high},{key:'medium',label:lang==='es'?'Media':'Medium',value:findingStats.medium},{key:'low',label:lang==='es'?'Baja':'Low',value:findingStats.low}].map(item=><div className="severity-row" key={item.key}><div className="severity-row-label"><span className={'sev '+item.key}/><span>{item.label}</span><strong>{item.value}</strong></div><div className="severity-track"><i className={'severity-fill '+item.key} style={{width:(findingStats.total ? item.value/findingStats.total*100 : 0)+'%'}}/></div></div>)}</div> : <div className="severity-empty"><div className="severity-bars"><i/><i/><i/><i/></div><strong>—</strong><span>{lang === 'es' ? 'Sin datos verificados' : 'No verified data'}</span></div>}<div className="severity-legend"><span><i className="sev critical"/>{lang === 'es' ? 'Crítica' : 'Critical'}</span><span><i className="sev high"/>{lang === 'es' ? 'Alta' : 'High'}</span><span><i className="sev medium"/>{lang === 'es' ? 'Media' : 'Medium'}</span><span><i className="sev low"/>{lang === 'es' ? 'Baja' : 'Low'}</span></div></section>
            </div>
            <section className="panel inventory-panel"><PanelHead title={t.technologyMap} action={<button className="text-btn" onClick={() => setActive('inventory')}>{t.viewAll}<ChevronRight size={14}/></button>}/>{items.length ? <div className="component-grid">{items.slice(0,5).map(item => <ComponentChip key={item.id} item={item}/>)}</div> : <div className="empty-state"><div className="empty-icon"><Layers3 size={21}/></div><strong>{t.empty}</strong><span>{t.emptyHint}</span><button className="secondary-btn" onClick={() => { setActive('inventory'); openAdd(); }}><Plus size={15}/>{t.addComponent}</button></div>}</section>
            <section className="panel findings-panel"><PanelHead title={t.recentFindings}/>{analysis?.findings?.length ? <div className="table-wrap" role="region" tabIndex={0} aria-label={lang === 'es' ? 'Tabla desplazable' : 'Scrollable table'}><table><thead><tr><th>CVE ID</th><th>{t.component}</th><th>{t.status}</th><th>CVSS</th></tr></thead><tbody>{prioritizedFindings.slice(0,5).map(f => <tr key={f.id}><td><strong className="cve-id">{f.id}</strong><span className="finding-title">{f.description}</span></td><td>{f.components.map(x => x.component.name).join(', ') || '—'}</td><td><span className={'tag ' + ((f.kev === true) ? 'tag-red' : 'tag-amber')}>{(f.kev === true) ? 'KEV' : applicabilityLabel(f.applicabilityStatus) || severityLabel(f.severity)}</span></td><td className="score">{f.cvss ?? '—'}</td></tr>)}</tbody></table></div> : <div className="empty-state"><div className="empty-icon"><ShieldCheck size={21}/></div><strong>{analysis ? (lang === 'es' ? 'El análisis no devolvió candidatos CVE.' : 'The analysis returned no CVE candidates.') : (lang === 'es' ? 'Todavía no hay resultados de análisis.' : 'There are no analysis results yet.')}</strong><span>{analysis ? (lang === 'es' ? 'La ausencia de resultados no demuestra que los componentes estén libres de vulnerabilidades.' : 'No results do not prove that components are vulnerability-free.') : (lang === 'es' ? 'Añade al menos un componente y ejecuta un análisis para consultar las fuentes públicas.' : 'Add at least one component and run an analysis to query public sources.')}</span>{!analysis && <button className="secondary-btn" onClick={() => { setActive('inventory'); openAdd(); }}><Plus size={15}/>{t.addComponent}</button>}</div>}</section>
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
                {posture.dwell.length ? <div className="table-wrap" role="region" tabIndex={0} aria-label={lang === 'es' ? 'Tabla desplazable' : 'Scrollable table'}><table><thead><tr><th>CVE</th><th>{t.component}</th><th>{t.postureFirst}</th><th>{t.postureLast}</th><th>{t.postureSnapshots}</th><th>{t.status}</th></tr></thead><tbody>{posture.dwell.map(item => <tr key={item.key}><td><strong className="cve-id">{item.cve}</strong>{(item.kev === true) && <span className="tag tag-red">KEV</span>}</td><td>{item.componentName}</td><td>{new Date(item.firstObservedAt).toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-US')}</td><td>{new Date(item.lastObservedAt).toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-US')}</td><td>{item.snapshotsSeen}</td><td><span className={'tag ' + (item.presentInLatest ? 'tag-amber' : 'tag-neutral')}>{item.presentInLatest ? t.posturePresent : t.postureAbsent}</span></td></tr>)}</tbody></table></div> : <p className="print-report-empty">{t.postureNoDwell}</p>}
              </section>
            </>}
          </>}
          {active === 'inventory' && <><div className="page-heading"><div><div className="eyebrow">{t.workspace}</div><h1>{t.analysisTitle}</h1><p>{t.analysisDesc}</p></div><div className="heading-actions"><label className="secondary-btn import-file-btn"><FileDown size={15}/>{lang === 'es' ? 'Importar CSV' : 'Import CSV'}<input type="file" accept=".csv,text/csv" onChange={handleInventoryImport} aria-label={lang === 'es' ? 'Importar inventario desde CSV' : 'Import inventory from CSV'}/></label><label className="secondary-btn import-file-btn"><FileDown size={15}/>{lang === 'es' ? 'Importar SBOM' : 'Import SBOM'}<input type="file" accept=".json,application/json" onChange={handleSbomImport} aria-label={lang === 'es' ? 'Importar SBOM CycloneDX o SPDX' : 'Import CycloneDX or SPDX SBOM'}/></label><label className="secondary-btn import-file-btn">{lang === 'es' ? 'Restaurar JSON' : 'Restore JSON'}<input type="file" accept=".json,application/json" onChange={handleJsonRestore} aria-label={lang === 'es' ? 'Restaurar copia JSON' : 'Restore JSON backup'}/></label><label className="secondary-btn import-file-btn">{lang === 'es' ? 'Comparar copia' : 'Compare backup'}<input type="file" accept=".json,application/json" onChange={handleCompareBackup} aria-label={lang === 'es' ? 'Comparar copia JSON' : 'Compare JSON backup'}/></label><button className="secondary-btn" onClick={exportJsonBackup} disabled={!items.length}><Download size={15}/>{lang === 'es' ? 'Backup JSON' : 'JSON backup'}</button><button className="secondary-btn" onClick={exportCsv} disabled={!items.length}><Download size={15}/>{t.export}</button><button className="primary-btn" onClick={runAnalysis} disabled={!items.length || analyzing}><Activity size={16}/>{analyzing ? (lang === 'es' ? 'Analizando…' : 'Analyzing…') : (lang === 'es' ? 'Analizar inventario' : 'Analyze inventory')}</button><button className="primary-btn" onClick={() => openAdd()}><Plus size={17}/>{t.addComponent}</button></div></div>{(inventoryQuality.missingVersion.length > 0 || inventoryQuality.missingSourceVersion.length > 0 || inventoryQuality.invalidPurls.length > 0 || inventoryQuality.invalidCpes.length > 0 || inventoryQuality.sourceVersionWithoutPackage.length > 0 || inventoryQuality.duplicates.length > 0) && <section className="panel inventory-quality-panel" aria-live="polite"><div className="inventory-quality-heading"><AlertTriangle size={17}/><strong>{lang === 'es' ? 'Calidad del inventario' : 'Inventory quality'}</strong><span>{lang === 'es' ? 'Revisa estos datos antes de analizar' : 'Review these items before analysis'}</span></div><div className="inventory-quality-stats">{inventoryQuality.missingVersion.length > 0 && <div><strong>{inventoryQuality.missingVersion.length}</strong><span>{lang === 'es' ? 'sin versión' : 'missing version'}</span></div>}{inventoryQuality.duplicates.length > 0 && <div><strong>{inventoryQuality.duplicates.length}</strong><span>{lang === 'es' ? 'posibles duplicados' : 'possible duplicates'}</span></div>}{inventoryQuality.missingSourceVersion.length > 0 && <div><strong>{inventoryQuality.missingSourceVersion.length}</strong><span>{lang === 'es' ? 'sin versión fuente' : 'missing source version'}</span></div>}{inventoryQuality.invalidPurls.length > 0 && <div><strong>{inventoryQuality.invalidPurls.length}</strong><span>{lang === 'es' ? 'PURL no válidos' : 'invalid PURLs'}</span></div>}{inventoryQuality.invalidCpes.length > 0 && <div><strong>{inventoryQuality.invalidCpes.length}</strong><span>{lang === 'es' ? 'CPE no válidos' : 'invalid CPEs'}</span></div>}{inventoryQuality.sourceVersionWithoutPackage.length > 0 && <div><strong>{inventoryQuality.sourceVersionWithoutPackage.length}</strong><span>{lang === 'es' ? 'versión fuente sin paquete' : 'source version without package'}</span></div>}</div><ul>{inventoryQuality.missingVersion.slice(0, 20).map((item, index) => <li key={'missing-' + item.id + '-' + index}>{item.name}: {lang === 'es' ? 'falta indicar la versión' : 'version is missing'}</li>)}{inventoryQuality.invalidPurls.slice(0, 20).map((item, index) => <li key={'invalid-purl-' + item.id + '-' + index}>{item.name}: {lang === 'es' ? (item.field === 'sourcePurl' ? 'PURL del paquete fuente no válido' : 'PURL del componente no válido') : (item.field === 'sourcePurl' ? 'source package PURL is invalid' : 'component PURL is invalid')}</li>)}{inventoryQuality.invalidPurls.length > 20 && <li>{lang === 'es' ? `Y ${inventoryQuality.invalidPurls.length - 20} PURL no válidos más.` : `And ${inventoryQuality.invalidPurls.length - 20} more invalid PURLs.`}</li>}{inventoryQuality.invalidCpes.slice(0, 20).map((item, index) => <li key={'invalid-cpe-' + item.id + '-' + index}>{item.name}: {lang === 'es' ? 'CPE 2.3 malformado; revisa sus 13 campos' : 'Malformed CPE 2.3; check its 13 fields'}</li>)}{inventoryQuality.invalidCpes.length > 20 && <li>{lang === 'es' ? `Y ${inventoryQuality.invalidCpes.length - 20} CPE no válidos más.` : `And ${inventoryQuality.invalidCpes.length - 20} more invalid CPEs.`}</li>}{inventoryQuality.sourceVersionWithoutPackage.slice(0, 20).map((item, index) => <li key={'source-without-package-' + item.id + '-' + index}>{item.name}: {lang === 'es' ? 'hay versión fuente, pero falta el nombre del paquete fuente' : 'source version is set, but source package name is missing'}</li>)}{inventoryQuality.sourceVersionWithoutPackage.length > 20 && <li>{lang === 'es' ? `Y ${inventoryQuality.sourceVersionWithoutPackage.length - 20} componentes más con versión fuente sin paquete.` : `And ${inventoryQuality.sourceVersionWithoutPackage.length - 20} more components with source version but no package name.`}</li>}{inventoryQuality.missingSourceVersion.slice(0, 20).map((item, index) => <li key={'missing-source-' + item.id + '-' + index}>{item.name}: {lang === 'es' ? 'falta la versión del paquete fuente ' : 'source package version is missing for '}{item.sourcePackage}</li>)}{inventoryQuality.missingSourceVersion.length > 20 && <li>{lang === 'es' ? `Y ${inventoryQuality.missingSourceVersion.length - 20} componentes más sin versión fuente.` : `And ${inventoryQuality.missingSourceVersion.length - 20} more components without a source version.`}</li>}{inventoryQuality.missingVersion.length > 20 && <li>{lang === 'es' ? `Y ${inventoryQuality.missingVersion.length - 20} componentes más sin versión.` : `And ${inventoryQuality.missingVersion.length - 20} more components without a version.`}</li>}{inventoryQuality.duplicates.slice(0, 20).map((item, index) => <li key={'duplicate-' + item.id + '-' + index}>{item.name}: {lang === 'es' ? 'posible duplicado (misma identidad de paquete)' : 'possible duplicate (same package identity)'}</li>)}{inventoryQuality.duplicates.length > 20 && <li>{lang === 'es' ? `Y ${inventoryQuality.duplicates.length - 20} posibles duplicados más.` : `And ${inventoryQuality.duplicates.length - 20} more possible duplicates.`}</li>}</ul></section>}{inventoryComparison && <section className="panel comparison-panel"><div className="comparison-heading"><div><h3>{lang === 'es' ? 'Cambios frente a la copia' : 'Changes against backup'}</h3><p>{lang === 'es' ? 'Copia seleccionada comparada con el inventario actual.' : 'Selected backup compared with current inventory.'}</p></div><button className="icon-btn" onClick={() => setInventoryComparison(null)} aria-label={lang === 'es' ? 'Cerrar comparación' : 'Close comparison'}><X size={16}/></button></div><div className="comparison-stats"><div><strong>{inventoryComparison.added.length}</strong><span>{lang === 'es' ? 'Añadidos' : 'Added'}</span></div><div><strong>{inventoryComparison.removed.length}</strong><span>{lang === 'es' ? 'Eliminados' : 'Removed'}</span></div><div><strong>{inventoryComparison.unchanged.length}</strong><span>{lang === 'es' ? 'Sin cambios' : 'Unchanged'}</span></div></div>{(inventoryComparison.added.length+inventoryComparison.removed.length)>0 && <ul>{inventoryComparison.added.map((x,i)=><li key={'a'+i}>+ {x.name} {x.version}</li>)}{inventoryComparison.removed.map((x,i)=><li key={'r'+i}>− {x.name} {x.version}</li>)}</ul>}</section>}<div className="notice"><LockKeyhole size={17}/><span>{t.privacyNote}</span></div>{importMessage && <div className="notice import-feedback" role="status">{importMessage}</div>}{importError && <div className="error-banner" role="alert"><AlertTriangle size={16}/>{importError}</div>}<p className="import-help">{lang === 'es' ? 'Importa el CSV exportado por Quasaric (columnas: name, type, version, vendor, sourcePackage, sourceVersion, architecture, sourceRelationship, sourceRef, sourcePurl, purl, cpe). El fichero se procesa localmente; se admiten hasta 50.000 componentes y archivos CSV de hasta 5 MB y 50.000 filas.' : 'Import a CSV exported by Quasaric (columns: name, type, version, vendor, sourcePackage, sourceVersion, architecture, sourceRelationship, sourceRef, sourcePurl, purl, cpe). The file is processed locally; up to 50,000 components and CSV files up to 5 MB and 50,000 rows are supported.'}</p><section className="panel inventory-list-panel"><PanelHead title={t.inventory} detail={items.length + (lang === 'es' ? ' componentes' : ' components')}/>{items.length ? <>{items.length > INVENTORY_PAGE_SIZE && <div className="inventory-pagination" aria-label={lang === 'es' ? 'Paginación del inventario' : 'Inventory pagination'}><span>{lang === 'es' ? `Mostrando ${(inventoryPage - 1) * INVENTORY_PAGE_SIZE + 1}–${Math.min(inventoryPage * INVENTORY_PAGE_SIZE, items.length)} de ${items.length}` : `Showing ${(inventoryPage - 1) * INVENTORY_PAGE_SIZE + 1}–${Math.min(inventoryPage * INVENTORY_PAGE_SIZE, items.length)} of ${items.length}`}</span><div><button type="button" className="secondary-btn" onClick={() => setInventoryPage(page => Math.max(1, page - 1))} disabled={inventoryPage <= 1}>{lang === 'es' ? 'Anterior' : 'Previous'}</button><span>{inventoryPage} / {inventoryPageCount}</span><button type="button" className="secondary-btn" onClick={() => setInventoryPage(page => Math.min(inventoryPageCount, page + 1))} disabled={inventoryPage >= inventoryPageCount}>{lang === 'es' ? 'Siguiente' : 'Next'}</button></div></div>}<div className="inventory-list">{visibleInventoryItems.map(item => <div className="inventory-row" key={item.id}><div className="component-icon"><IconFor type={item.type}/></div><div className="inventory-name"><strong>{item.name}</strong><span>{t[item.type] || item.type} {item.vendor ? '· ' + item.vendor : ''} {item.sourcePackage ? '· src: ' + item.sourcePackage : ''} {item.sourceVersion ? '· src ver: ' + item.sourceVersion : ''} {item.architecture ? '· arch: ' + item.architecture : ''} {item.sourceRelationship ? '· relation: ' + item.sourceRelationship : ''}</span></div><div className="inventory-version"><span>{t.version}</span><strong>{item.version || '—'}</strong></div><span className="tag tag-neutral">{t.ready}</span><button className="icon-btn danger-hover" onClick={() => persist(items.filter(x => x.id !== item.id))} aria-label={t.remove}><Trash2 size={16}/></button></div>)}</div></> : <div className="empty-state large"><div className="empty-icon"><ClipboardList size={22}/></div><strong>{t.empty}</strong><span>{t.emptyHint}</span><button className="primary-btn" onClick={() => openAdd()}><Plus size={16}/>{t.addComponent}</button></div>}</section>{analyzing && <section className="panel analysis-progress"><strong>{lang === 'es' ? 'Consultando fuentes públicas…' : 'Querying public sources…'}</strong><span>{analysisProgress.completed} / {analysisProgress.total} {lang === 'es' ? 'componentes consultados' : 'components queried'}</span><div className="progress-track"><i style={{ width: (analysisProgress.total ? analysisProgress.completed / analysisProgress.total * 100 : 0) + '%' }}/></div><button type="button" className="secondary-btn" onClick={() => analysisAbortRef.current?.abort()}>{lang === 'es' ? 'Cancelar análisis' : 'Cancel analysis'}</button></section>}{analysisError && <div className="error-banner" role="alert"><AlertTriangle size={16}/>{analysisError}</div>}{analysisHistoryWarning && <div className="error-banner" role="alert"><AlertTriangle size={16}/>{t.historyStorageWarning}</div>}{analysis && <section className="panel results-panel"><PanelHead title={lang === 'es' ? 'Resultados de correlación' : 'Correlation results'} detail={new Date(analysis.analyzedAt).toLocaleString(lang === 'es' ? 'es-ES' : 'en-US')}/><p className="result-disclaimer">{analysis.disclaimer}</p><div className="source-status">{Object.entries(analysis.sources).map(([source,status]) => <span key={source}><i className={status === 'queried' ? 'source-ok' : 'source-warn'}/>{sourceNameLabel(source)}: {sourceStatusLabel(status)}</span>)}</div>{analysis?.purlAdvisories?.length > 0 && <section className="source-advisory-list"><h3>{lang === 'es' ? 'Avisos OSV sin CVE asociado' : 'OSV advisories without a CVE'}</h3><p>{lang === 'es' ? 'Avisos asociados al PURL explícito del inventario. Se muestran por separado y requieren revisión; no constituyen una confirmación de aplicabilidad.' : 'Advisories associated with an explicit inventory PURL. Listed separately for review; they do not confirm applicability.'}</p>{analysis.purlAdvisories.map((advisory,index) => <article className="source-evidence-item" key={advisory.id + '-' + advisory.component.id + '-' + index}><strong>{advisory.id}</strong><span>{advisory.component.name}{advisory.component.version ? ' @ ' + advisory.component.version : ''}</span><span>{advisory.summary || (lang === 'es' ? 'Sin resumen disponible.' : 'No summary available.')}</span><span>{lang === 'es' ? 'Estado: requiere revisión' : 'Status: needs review'}</span>{advisory.published && <span>{lang === 'es' ? 'Publicado: ' : 'Published: '}{advisory.published}</span>}{safeExternalUrl(advisory.url) && <a href={safeExternalUrl(advisory.url)} target="_blank" rel="noreferrer">{lang === 'es' ? 'Abrir aviso OSV' : 'Open OSV advisory'}</a>}{advisory.references?.map((url,refIndex) => safeExternalUrl(url) && <a href={safeExternalUrl(url)} target="_blank" rel="noreferrer" key={url + refIndex}>{lang === 'es' ? 'Referencia adicional' : 'Additional reference'} {refIndex + 1}</a>)}</article>)}</section>}{analysis.errors.length > 0 && <div className="error-banner"><AlertTriangle size={15}/>{analysis.errors.length} {lang === 'es' ? 'errores de consulta; los resultados pueden estar incompletos.' : 'source errors; results may be incomplete.'}<ul className="source-error-list">{analysis.errors.map((error,index) => <li key={(error.source || 'source') + '-' + (error.component || error.cveId || '') + '-' + index}><strong>{error.source || (lang === 'es' ? 'Fuente' : 'Source')}</strong>{(error.component || error.cveId) ? ' · ' + (error.component || error.cveId) : ''}: {error.message}</li>)}</ul></div>}{analysis.limits?.length > 0 && <div className="error-banner"><AlertTriangle size={15}/>{lang === 'es' ? `NVD ha alcanzado el límite de ${analysis.limits[0]?.maxResults ?? 6000} resultados en ${analysis.limits.length} consulta(s). Los hallazgos son parciales y pueden faltar CVE; revisa NVD directamente.` : `NVD reached the ${analysis.limits[0]?.maxResults ?? 6000}-result cap in ${analysis.limits.length} quer(ies). Findings are partial and CVEs may be missing; review NVD directly.`}</div>}{analysis.findings.length ? <div className="table-wrap" role="region" tabIndex={0} aria-label={lang === 'es' ? 'Tabla desplazable' : 'Scrollable table'}><table><thead><tr><th>CVE</th><th>{lang === 'es' ? 'Severidad' : 'Severity'}</th><th>CVSS</th><th>EPSS</th><th>KEV</th><th>{lang === 'es' ? 'Aplicabilidad' : 'Applicability'}</th></tr></thead><tbody>{analysis.findings.map(f => <tr key={f.id}><td><strong className="cve-id"><a href={`https://nvd.nist.gov/vuln/detail/${f.id}`} target="_blank" rel="noreferrer">{f.id}</a></strong><span className="finding-title">{f.description}</span>{f.vector && <span className="finding-title">CVSS vector: {f.vector}</span>}{safeExternalUrl(f.references?.[0]?.url) && <span className="finding-title"><a href={safeExternalUrl(f.references[0].url)} target="_blank" rel="noreferrer">{lang === 'es' ? 'Referencia / aviso del fabricante' : 'Reference / vendor advisory'}</a></span>}{(f.kev === true) && f.kevRequiredAction && <span className="finding-title">{lang === 'es' ? 'Acción CISA: ' : 'CISA action: '}{f.kevRequiredAction}</span>}</td><td>{severityLabel(f.severity)}</td><td className="score">{f.cvss ?? '—'}</td><td>{f.epss == null ? '—' : (f.epss * 100).toFixed(2) + '%'}</td><td>{(f.kev === true) ? <span className="tag tag-red">CISA KEV</span> : '—'}{(f.kev === true) && f.kevDueDate && <span className="finding-title">{lang === 'es' ? 'Fecha límite: ' : 'Due: '}{f.kevDueDate}</span>}</td><td><span className="tag tag-amber">{({ possible: lang === 'es' ? 'Posible' : 'Possible', affected: lang === 'es' ? 'Afectado según Ubuntu OSV' : 'Affected per Ubuntu OSV', patched_candidate: lang === 'es' ? 'Parche candidato · verificar' : 'Patch candidate · verify', unaffected: lang === 'es' ? 'No afectado según Ubuntu OSV' : 'Not affected per Ubuntu OSV', needs_review: lang === 'es' ? 'Verificar' : 'Review' })[f.applicabilityStatus] || (lang === 'es' ? 'Verificar' : 'Review')}</span><span className="finding-title">{f.components.map(x => x.component.name + ' — ' + (x.applicability.status === 'affected' ? (lang === 'es' ? 'afectado' : 'affected') : x.applicability.status === 'patched_candidate' ? (lang === 'es' ? 'parche candidato' : 'patch candidate') : x.applicability.status === 'unaffected' ? (lang === 'es' ? 'no afectado' : 'not affected') : (lang === 'es' ? 'verificar' : 'review'))).join(', ')}</span>{f.components.filter(x => x.ubuntuOsv).map(x => <span className="finding-title" key={'osv-' + x.component.id}>Ubuntu OSV · {x.component.name}: {({ affected: lang === 'es' ? 'afectado' : 'affected', patched_candidate: lang === 'es' ? 'parche candidato' : 'patch candidate', unaffected: lang === 'es' ? 'no afectado' : 'not affected', needs_review: lang === 'es' ? 'requiere revisión' : 'needs review' })[x.ubuntuOsv.status] || x.ubuntuOsv.status}</span>)}{f.components.filter(x => x.ubuntuVex).map(x => <span className="finding-title" key={x.component.id}>OpenVEX · {x.component.name}: {({ fixed: lang === 'es' ? 'fijo según VEX' : 'fixed per VEX', affected: lang === 'es' ? 'afectado según VEX' : 'affected per VEX', not_affected: lang === 'es' ? 'no afectado según VEX' : 'not affected per VEX', under_investigation: lang === 'es' ? 'en investigación' : 'under investigation', needs_review: lang === 'es' ? 'requiere revisión' : 'needs review', unavailable: lang === 'es' ? 'no disponible' : 'unavailable' })[x.ubuntuVex.status] || x.ubuntuVex.status}{x.ubuntuVex.documentTimestamp && <> · {new Date(x.ubuntuVex.documentTimestamp).toLocaleString(lang === 'es' ? 'es-ES' : 'en-US')}</>}{safeExternalUrl(x.ubuntuVex.documentUrl) && <> · <a href={safeExternalUrl(x.ubuntuVex.documentUrl)} target="_blank" rel="noreferrer">{lang === 'es' ? 'Documento Canonical' : 'Canonical document'}</a></>}{x.ubuntuVex.reason && <span> · {x.ubuntuVex.reason}</span>}{x.ubuntuVex.consistency?.status === 'conflicting' && <span> · <strong>{lang === 'es' ? 'CONFLICTO ENTRE FUENTES' : 'SOURCE CONFLICT'}</strong>: {x.ubuntuVex.consistency.reason}</span>}</span>)}{f.components.map(x => <details className="source-evidence-details" key={'evidence-' + x.component.id}><summary>{lang === 'es' ? 'Trazabilidad de evidencias' : 'Evidence traceability'} · {x.component.name} ({x.evidence?.length || 0})</summary>{x.evidence?.length ? x.evidence.map((entry, index) => <div className="source-evidence-item" key={entry.source + '-' + index}><strong>{sourceNameLabel(entry.source)}</strong><span>{lang === 'es' ? 'Estado' : 'Status'}: {evidenceStatusLabel(entry.status)}</span>{entry.evidenceType === 'source_package' && <><span>{lang === 'es' ? 'Paquete fuente consultado' : 'Queried source package'}: {entry.sourcePackage} @ {entry.sourceVersion}</span>{entry.binaryPackage && <span>{lang === 'es' ? 'Binario inventariado (no confirmado por esta evidencia)' : 'Inventoried binary (not confirmed by this evidence)'}: {entry.binaryPackage}</span>}</>}{entry.evidenceType === 'source_package' && <span>{lang === 'es' ? 'Tipo de relación' : 'Relationship type'}: {lang === 'es' ? 'evidencia de paquete fuente; aplicabilidad binaria pendiente de revisión' : 'source-package evidence; binary applicability requires review'}</span>}{entry.confidence && <span>{lang === 'es' ? 'Confianza' : 'Confidence'}: {entry.confidence === 'medium' ? (lang === 'es' ? 'media' : 'medium') : entry.confidence}</span>}{entry.advisoryId && <span>{lang === 'es' ? 'Identificador' : 'Identifier'}: {entry.advisoryId}</span>}{entry.publishedAt && <span>{lang === 'es' ? 'Publicado' : 'Published'}: {entry.publishedAt}</span>}{entry.updatedAt && <span>{lang === 'es' ? 'Actualizado' : 'Updated'}: {entry.updatedAt}</span>}{entry.documentTimestamp && <span>{lang === 'es' ? 'Fecha del documento' : 'Document timestamp'}: {entry.documentTimestamp}</span>}{entry.documentVersion != null && <span>{lang === 'es' ? 'Versión del documento' : 'Document version'}: {entry.documentVersion}</span>}{entry.packageStates?.map((state, stateIndex) => <span key={'rh-state-' + stateIndex}>{lang === 'es' ? 'Estado de paquete Red Hat' : 'Red Hat package state'}: {state.fixState || '—'}{state.packageName ? ' · ' + (lang === 'es' ? 'paquete' : 'package') + ': ' + state.packageName : ''}{state.impact ? ' · ' + (lang === 'es' ? 'impacto' : 'impact') + ': ' + state.impact : ''}</span>)}{entry.affectedReleases?.map((release, releaseIndex) => <span key={'rh-release-' + releaseIndex}>{lang === 'es' ? 'Errata Red Hat' : 'Red Hat erratum'}: {release.advisory || '—'}{release.releasedOn ? ' · ' + release.releasedOn : ''}{release.package?.name ? ' · ' + release.package.name : ''}{release.package?.version ? ' @ ' + release.package.version : ''}</span>)}{entry.officialSourceStatus && <span>{lang === 'es' ? 'Fuente oficial' : 'Official source'}: {entry.officialSourceStatus === 'verified' ? (lang === 'es' ? 'verificada' : 'verified') : entry.officialSourceStatus === 'unavailable' ? (lang === 'es' ? 'no disponible; se conserva OSV' : 'unavailable; OSV retained') : 'OSV'}</span>}{entry.fixedVersions?.map((version, versionIndex) => <span key={'fixed-version-' + versionIndex}>{entry.evidenceType === 'source_package' ? (lang === 'es' ? 'Versión corregida publicada del fuente (no trasladable al binario)' : 'Published fixed source version (not transferable to binary)') : (lang === 'es' ? 'Versión corregida publicada' : 'Published fixed version')}: {version}</span>)}{entry.affectedRanges?.map((range, rangeIndex) => <span key={'osv-range-' + rangeIndex}>{lang === 'es' ? 'Rango OSV' : 'OSV range'}: {range.type || '—'}{range.events?.map((event, eventIndex) => <span key={'osv-event-' + eventIndex}>{event.fixed ? (lang === 'es' ? ' · corregida: ' : ' · fixed: ') + event.fixed : ''}{event.last_affected ? (lang === 'es' ? ' · última afectada: ' : ' · last affected: ') + event.last_affected : ''}</span>)}</span>)}{entry.architectureMatch && <span>{lang === 'es' ? 'Coincidencia de arquitectura' : 'Architecture match'}: {entry.architectureMatch === 'exact' ? (lang === 'es' ? 'exacta' : 'exact') : entry.architectureMatch === 'not_specified' ? (lang === 'es' ? 'no especificada por el proveedor' : 'not specified by vendor') : (lang === 'es' ? 'no indicada en inventario' : 'not provided by inventory')}</span>}{entry.evidenceType === 'source_package_relationship' && <span>{lang === 'es' ? 'Tipo de evidencia: relación explícita paquete fuente → binario; requiere revisión' : 'Evidence type: explicit source-to-binary relationship; review required'}</span>}{entry.relatedBinaryProducts?.map((product, productIndex) => <span key={'csaf-related-binary-' + productIndex}>{lang === 'es' ? 'Binario relacionado' : 'Related binary'}: {product.name || product.productId}</span>)}{entry.productStatuses?.map((status, statusIndex) => <span key={'csaf-status-' + statusIndex}>{lang === 'es' ? 'Estado de producto CSAF' : 'CSAF product status'}: {evidenceStatusLabel(status)}</span>)}{entry.remediations?.map((remediation, remediationIndex) => <span key={'csaf-remediation-' + remediationIndex}>{lang === 'es' ? 'Remediación CSAF' : 'CSAF remediation'}: {remediation.category || '—'}{remediation.details ? ' · ' + remediation.details : ''}</span>)}{entry.products?.map((product, productIndex) => <span key={'csaf-product-' + productIndex}>{lang === 'es' ? 'Producto CSAF' : 'CSAF product'}: {product.name || product.productId}</span>)}{entry.product && <span>{entry.product.name || '—'} {entry.product.version ? '@ ' + entry.product.version : ''}{entry.product.architecture ? ' · ' + entry.product.architecture : ''}{entry.product.ecosystem ? ' · ' + entry.product.ecosystem : ''}{entry.product.sourcePackage ? ' · src: ' + entry.product.sourcePackage : ''}{entry.product.sourceVersion ? ' ' + entry.product.sourceVersion : ''}</span>}{entry.reason && <span>{entry.reason}</span>}{safeExternalUrl(entry.url) && <a href={safeExternalUrl(entry.url)} target="_blank" rel="noreferrer">{lang === 'es' ? 'Abrir fuente' : 'Open source'}</a>}{entry.references?.map((url, refIndex) => safeExternalUrl(url) && <a href={safeExternalUrl(url)} target="_blank" rel="noreferrer" key={url + refIndex}>{lang === 'es' ? 'Referencia adicional' : 'Additional reference'} {refIndex + 1}</a>)}</div>) : <span>{lang === 'es' ? 'No hay evidencias fuente adjuntas a este componente.' : 'No source evidence is attached to this component.'}</span>}</details>)}</td></tr>)}</tbody></table></div> : <div className="empty-state"><strong>{lang === 'es' ? 'No se han obtenido candidatos con los filtros actuales.' : 'No candidate matches were returned.'}</strong><span>{lang === 'es' ? 'Esto no demuestra que los componentes estén libres de vulnerabilidades.' : 'This does not prove that the components are vulnerability-free.'}</span></div>}</section>}{analysis?.purlAdvisories?.length > 0 && <section className="panel results-panel"><PanelHead title={lang === 'es' ? 'Avisos OSV sin CVE asociado' : 'OSV advisories without a CVE'} detail={analysis.purlAdvisories.length + (lang === 'es' ? ' avisos' : ' advisories')}/><p className="result-disclaimer">{lang === 'es' ? 'Avisos identificados mediante el PURL explícito del SBOM. No tienen CVE asociado en OSV y requieren revisión manual; no se consideran hallazgos confirmados ni afectados.' : 'Advisories identified through the explicit SBOM PURL. They have no CVE alias in OSV and require manual review; they are not treated as confirmed or affected findings.'}</p><div className="source-advisory-list">{analysis.purlAdvisories.map((advisory,index)=><article className="source-evidence-item" key={advisory.id + '-' + advisory.component.id + '-' + index}><strong>{advisory.id || (lang === 'es' ? 'Aviso OSV' : 'OSV advisory')}</strong><span>{advisory.component.name} {advisory.component.version ? '@ ' + advisory.component.version : ''}</span><span className="tag tag-amber">{lang === 'es' ? 'Requiere revisión' : 'Needs review'}</span>{advisory.summary && <span>{advisory.summary}</span>}{advisory.published && <span>{lang === 'es' ? 'Publicado: ' : 'Published: '}{advisory.published}</span>}{advisory.modified && <span>{lang === 'es' ? 'Actualizado: ' : 'Modified: '}{advisory.modified}</span>}{safeExternalUrl(advisory.url) && <a href={safeExternalUrl(advisory.url)} target="_blank" rel="noreferrer">{lang === 'es' ? 'Abrir aviso OSV' : 'Open OSV advisory'}</a>}{advisory.references?.map((url,refIndex)=>safeExternalUrl(url) && <a href={safeExternalUrl(url)} target="_blank" rel="noreferrer" key={url + refIndex}>{lang === 'es' ? 'Referencia adicional' : 'Additional reference'} {refIndex+1}</a>)}</article>)}</div></section>}<div className="inventory-bottom"><span>{items.length} {lang === 'es' ? 'componentes en este inventario local' : 'components in this local inventory'}</span><button className="secondary-btn" onClick={exportCsv} disabled={!items.length}><Download size={15}/>{t.export}</button></div></>}

          {active === 'vulnerabilities' && <><div className="page-heading"><div><div className="eyebrow">{t.workspace}</div><h1>{t.vulnerabilities}</h1><p>{t.sourceNotice}</p></div></div>{!analysis ? <section className="panel empty-state vulnerability-empty-state"><div className="empty-icon"><ShieldCheck size={21}/></div><strong>{lang === 'es' ? 'Aún no hay resultados reales.' : 'There are no live results yet.'}</strong><span>{lang === 'es' ? 'Los hallazgos aparecerán aquí después de añadir componentes y ejecutar un análisis. No mostramos CVE de ejemplo como si fueran resultados de tu inventario.' : 'Findings will appear here after you add components and run an analysis. We do not show sample CVEs as if they came from your inventory.'}</span><button className="primary-btn" onClick={() => { setActive('inventory'); openAdd(); }}><Plus size={15}/>{t.addComponent}</button></section> : <><div className="result-disclaimer">{lang === 'es' ? 'Resultados del último análisis en este navegador. Son candidatos que requieren verificación, no confirmaciones.' : 'Results from the latest analysis in this browser. These are candidates requiring verification, not confirmations.'}</div><section className="panel findings-panel"><div className="findings-toolbar"><div className="search-field"><Search size={16}/><input aria-label={t.search} value={query} onChange={e => setQuery(e.target.value)} placeholder={t.search}/></div><label className="severity-filter-label"><span>{lang === 'es' ? 'Severidad' : 'Severity'}</span><select className="severity-filter" value={severityFilter} onChange={event => setSeverityFilter(event.target.value)}><option value="all">{t.all}</option><option value="critical">{lang === 'es' ? 'Crítica' : 'Critical'}</option><option value="high">{lang === 'es' ? 'Alta' : 'High'}</option><option value="medium">{lang === 'es' ? 'Media' : 'Medium'}</option><option value="low">{lang === 'es' ? 'Baja' : 'Low'}</option>{analysis && <option value="kev">KEV</option>}<option value="unknown">{lang === 'es' ? 'Desconocida' : 'Unknown'}</option></select></label></div><div className="table-wrap" role="region" tabIndex={0} aria-label={lang === 'es' ? 'Tabla desplazable' : 'Scrollable table'}><table><thead><tr><th>CVЕ ID / {t.component}</th><th>{t.severity}</th><th>CVSS</th><th>{t.priorityLabel}</th><th>{t.remediation}</th><th>{t.status}</th><th>{lang === 'es' ? 'Detalle' : 'Details'}</th></tr></thead><tbody>{filtered.map(f => <tr key={f.id}><td><strong className="cve-id">{f.live ? <a href={`https://nvd.nist.gov/vuln/detail/${f.id}`} target="_blank" rel="noreferrer">{f.id}</a> : f.id}</strong><span className="finding-title">{f.title}</span><span className="finding-title">{f.component}</span></td><td><span className={'severity-text ' + f.severity.toLowerCase()}>{severityLabel(f.severity)}</span></td><td className="score">{f.score}</td><td>{f.riskPriority ? <span className={'tag ' + (f.riskPriority.band === 'critical' || f.riskPriority.band === 'high' ? 'tag-red' : f.riskPriority.band === 'moderate' ? 'tag-amber' : 'tag-neutral')}>{f.riskPriority.score}/100 · {riskBandLabel(f.riskPriority.band)}</span> : '—'}</td><td>{f.remediation?.map(item => <div className="finding-title" key={item.component.id}>{item.component.name}: {item.guidance.status === 'update_candidate' ? t.updateTo + ' ' + item.guidance.targetVersion : item.guidance.status === 'fix_candidate_present' ? t.fixCandidate : t.reviewVendor}{safeExternalUrl(item.guidance.references[0]) && <> · <a href={safeExternalUrl(item.guidance.references[0])} target="_blank" rel="noreferrer">{lang === 'es' ? 'fuente' : 'source'}</a></>}</div>)}</td><td><span className={'tag ' + (f.state === 'KEV' ? 'tag-red' : 'tag-amber')}>{f.state === 'KEV' ? 'KEV' : (lang === 'es' ? 'Candidato' : 'Candidate')}</span></td><td>{f.live && <button type="button" className="secondary-btn finding-detail-btn" onClick={() => openFindingDetails(prioritizedFindings.find(item => item.id === f.id) || null)}>{lang === 'es' ? 'Ver ficha' : 'View details'}</button>}</td></tr>)}</tbody></table>{!filtered.length && <div className="empty-state">{t.noResults}</div>}</div></section></>}</>}

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
              {analysis && <section className="print-report-section">
                <h3>{lang === 'es' ? 'Cobertura y calidad de las fuentes' : 'Source coverage and quality'}</h3>
                <p className="print-report-notice">{lang === 'es' ? 'El estado indica el resultado de la consulta, no que la fuente cubra todos los productos o vulnerabilidades.' : 'Status describes the query outcome; it does not mean the source covers every product or vulnerability.'}</p>
                {Object.keys(analysis.sources || {}).length > 0
                  ? <div className="print-report-table-wrap" role="region" tabIndex={0} aria-label={lang === 'es' ? 'Cobertura de fuentes' : 'Source coverage'}><table className="print-report-table"><thead><tr><th>{lang === 'es' ? 'Fuente' : 'Source'}</th><th>{lang === 'es' ? 'Estado de consulta' : 'Query status'}</th></tr></thead><tbody>{Object.entries(analysis.sources).map(([source, status]) => <tr key={source}><td>{sourceNameLabel(source)}</td><td>{sourceStatusLabel(status)}</td></tr>)}</tbody></table></div>
                  : <p className="print-report-empty">{lang === 'es' ? 'No hay metadatos de cobertura disponibles.' : 'No source coverage metadata is available.'}</p>}
                {analysis.errors?.length > 0 && <><h4>{lang === 'es' ? 'Errores de consulta' : 'Query errors'} ({analysis.errors.length})</h4><ul>{analysis.errors.map((error, index) => <li key={(error.source || 'source') + '-' + index}><strong>{error.source || (lang === 'es' ? 'Fuente' : 'Source')}</strong>{error.component ? ' · ' + error.component : ''}: {error.message || (lang === 'es' ? 'Error sin detalle' : 'Unspecified error')}</li>)}</ul></>}
                {analysis.limits?.length > 0 && <><h4>{lang === 'es' ? 'Límites alcanzados' : 'Reached limits'} ({analysis.limits.length})</h4><ul>{analysis.limits.map((limit, index) => <li key={(limit.source || 'source') + '-' + index}>{limit.source || 'Source'}{limit.component ? ' · ' + limit.component : ''}: {lang === 'es' ? 'límite de resultados alcanzado' : 'result cap reached'}{limit.totalResults != null ? ' (' + limit.totalResults + ')' : ''}</li>)}</ul></>}
                {analysis.disclaimer && <p className="print-report-notice">{analysis.disclaimer}</p>}
              </section>}
              <section className="print-report-section">
                <h3>{t.reportInventory} ({items.length})</h3>
                {items.length ? <div className="print-report-table-wrap" role="region" tabIndex={0} aria-label={lang === 'es' ? 'Tabla del informe desplazable' : 'Scrollable report table'}><table className="print-report-table"><thead><tr><th>{t.component}</th><th>{t.reportType}</th><th>{t.reportVersion}</th><th>{t.reportVendor}</th></tr></thead><tbody>{items.map(item => <tr key={item.id}><td>{item.name}</td><td>{item.type}</td><td>{item.version || '—'}</td><td>{item.vendor || '—'}</td></tr>)}</tbody></table></div> : <p className="print-report-empty">{t.reportNoComponents}</p>}
              </section>
              <section className="print-report-section">
                <h3>{t.reportFindings} ({analysis?.findings?.length || 0})</h3>
                {analysis?.findings?.length ? <div className="print-report-table-wrap" role="region" tabIndex={0} aria-label={lang === 'es' ? 'Tabla del informe desplazable' : 'Scrollable report table'}><table className="print-report-table"><thead><tr><th>{t.reportCve}</th><th>{t.reportDescription}</th><th>{t.reportSeverity}</th><th>{t.reportScore}</th><th>{t.reportEpss}</th><th>{t.reportKev}</th><th>{t.reportApplicability}</th><th>{t.riskScore}</th><th>{t.reportComponents}</th><th>{t.remediation}</th><th>{t.reportSources}</th></tr></thead><tbody>{prioritizedFindings.map(finding => {
                  const sources = [...new Set(finding.components.flatMap(component => (component.evidence || []).map(evidence => evidence.source).filter(Boolean)))];
                  return <tr key={finding.id}><td className="print-report-cve">{finding.id}</td><td>{finding.description || '—'}</td><td>{severityLabel(finding.severity)}</td><td>{finding.cvss ?? '—'}</td><td>{finding.epss ?? '—'}</td><td>{(finding.kev === true) ? (lang === 'es' ? 'Sí' : 'Yes') : (lang === 'es' ? 'No' : 'No')}</td><td>{applicabilityLabel(finding.applicabilityStatus) || '—'}</td><td>{finding.riskPriority.score}/100 · {riskBandLabel(finding.riskPriority.band)}</td><td>{finding.components.map(component => component.component.name + ' ' + (component.component.version || '')).join('; ')}</td><td>{finding.remediation.map(item => item.component.name + ': ' + (item.guidance.targetVersion ? t.updateTo + ' ' + item.guidance.targetVersion : item.guidance.status === 'fix_candidate_present' ? t.fixCandidate : t.reviewVendor)).join('; ')}</td><td>{sources.map(sourceNameLabel).join(', ') || '—'}</td></tr>;
                })}</tbody></table></div> : <p className="print-report-empty">{analysis ? t.reportNoFindings : t.reportNoAnalysis}</p>}
              </section>
              {latestComparison && <section className="print-report-section"><h3>{t.comparePrint}</h3><p className="print-report-empty">{t.compareAdded}: {latestComparison.counts.added} · {t.compareResolved}: {latestComparison.counts.resolved} · {t.compareRetained}: {latestComparison.counts.retained} · {t.compareChanged}: {latestComparison.counts.changed}</p></section>}
              {posture.snapshotCount > 0 && <section className="print-report-section">
                <h3>{t.postureReport}</h3>
                <p className="print-report-notice">{t.postureReportCaveat}</p>
                <h4>{t.postureReportTimeline}</h4>
                <div className="print-report-table-wrap" role="region" tabIndex={0} aria-label={lang === 'es' ? 'Tabla del informe desplazable' : 'Scrollable report table'}><table className="print-report-table"><thead><tr><th>{t.reportGenerated}</th><th>{t.postureCves}</th><th>{t.postureExposures}</th><th>{t.postureKev}</th><th>{t.postureRisk}</th></tr></thead><tbody>{posture.timeline.map((point, index) => <tr key={point.id || index}><td>{new Date(point.analyzedAt).toLocaleString(lang === 'es' ? 'es-ES' : 'en-US')}</td><td>{point.uniqueCves}</td><td>{point.exposures}</td><td>{point.kevCves}</td><td>{point.riskScore}</td></tr>)}</tbody></table></div>
                <h4>{t.postureReportObservations}</h4>
                <p className="print-report-empty">{t.postureReportLimit}</p>
                {posture.dwell.length ? <div className="print-report-table-wrap" role="region" tabIndex={0} aria-label={lang === 'es' ? 'Tabla del informe desplazable' : 'Scrollable report table'}><table className="print-report-table"><thead><tr><th>{t.reportCve}</th><th>{t.compareComponent}</th><th>{t.postureFirst}</th><th>{t.postureLast}</th><th>{t.postureSnapshots}</th><th>{t.status}</th></tr></thead><tbody>{posture.dwell.slice(0, 30).map(item => <tr key={item.key}><td>{item.cve}{(item.kev === true) ? ' · KEV' : ''}</td><td>{item.componentName}</td><td>{new Date(item.firstObservedAt).toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-US')}</td><td>{new Date(item.lastObservedAt).toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-US')}</td><td>{item.snapshotsSeen}</td><td>{item.presentInLatest ? t.posturePresent : t.postureAbsent}</td></tr>)}</tbody></table></div> : <p className="print-report-empty">{t.postureNoDwell}</p>}
              </section>}
              <footer className="print-report-footer">Quasaric · {window.location.origin}</footer>
            </section>
            <section className="panel report-card"><div className="report-icon"><FileDown size={23}/></div><div><h3>{lang === 'es' ? 'Exportar inventario' : 'Export inventory'}</h3><p>{lang === 'es' ? 'Descarga los componentes que has añadido en formato CSV.' : 'Download your declared components as CSV.'}</p></div><button className="secondary-btn" onClick={exportCsv} disabled={!items.length}><Download size={16}/>{lang === 'es' ? 'Inventario CSV' : 'Inventory CSV'}</button></section>
            <section className="panel report-card"><div className="report-icon"><ShieldAlert size={23}/></div><div><h3>{lang === 'es' ? 'Exportar hallazgos' : 'Export findings'}</h3><p>{lang === 'es' ? 'Descarga los candidatos CVE del último análisis con CVSS, EPSS, KEV y evidencias por fuente.' : 'Download candidate CVEs from the latest analysis with CVSS, EPSS, KEV and source evidence.'}</p></div><button className="secondary-btn" onClick={exportFindingsCsv} disabled={!analysis?.findings?.length}><Download size={16}/>{lang === 'es' ? 'Hallazgos CSV' : 'Findings CSV'}</button></section>
            <section className="panel report-card"><div className="report-icon"><ShieldCheck size={23}/></div><div><h3>{lang === 'es' ? 'Paquete de auditoría (JSON)' : 'Audit package (JSON)'}</h3><p>{lang === 'es' ? 'Exporta inventario, hallazgos, evidencias completas por componente, estado de cada fuente, errores, límites de consulta, prioridad, postura y comparación. Útil para revisión técnica e integración externa.' : 'Export inventory, findings, full per-component evidence, each source status, errors, query limits, triage priority, posture and comparison for technical review or external processing.'}</p></div><button className="secondary-btn" onClick={exportAuditReport} disabled={!analysis}><Download size={16}/>{lang === 'es' ? 'Informe JSON' : 'Audit JSON'}</button></section>
            <section className="panel report-card"><div className="report-icon"><Database size={23}/></div><div><h3>{lang === 'es' ? 'Historial de análisis' : 'Analysis history'}</h3><p>{lang === 'es' ? 'Exporta tus últimos 10 análisis o integra una copia en este navegador. La importación conserva el historial local, elimina duplicados y mantiene los 10 análisis más recientes.' : 'Export your latest 10 analyses or merge a backup into this browser. Import preserves local history, removes duplicates and keeps the 10 most recent analyses.'}</p></div><div className="heading-actions"><button className="secondary-btn" onClick={exportAnalysisHistory} disabled={!analysisHistory.length}><Download size={16}/>{lang === 'es' ? 'Exportar historial' : 'Export history'}</button><label className="secondary-btn import-file-btn">{lang === 'es' ? 'Importar historial' : 'Import history'}<input type="file" accept=".json,application/json" onChange={handleAnalysisHistoryImport} aria-label={lang === 'es' ? 'Importar copia del historial de análisis' : 'Import analysis history backup'}/></label></div></section>
            {historyBackupMessage && <div className="notice import-feedback" role="status">{historyBackupMessage}</div>}
            {historyBackupError && <div className="error-banner" role="alert"><AlertTriangle size={16}/>{historyBackupError}</div>}

          </>}

          {active === 'settings' && <><div className="page-heading"><div><div className="eyebrow">{t.workspace}</div><h1>{t.settings}</h1><p>{lang === 'es' ? 'Preferencias de idioma, apariencia y datos locales.' : 'Language, appearance, and local data preferences.'}</p></div></div><section className="panel settings-panel"><h3>{t.language}</h3><p>{lang === 'es' ? 'Selecciona el idioma de la interfaz.' : 'Choose the interface language.'}</p><div className="setting-options"><button className={lang === 'es' ? 'selected' : ''} onClick={() => setLang('es')}>Español {lang === 'es' && <Check size={16}/>}</button><button className={lang === 'en' ? 'selected' : ''} onClick={() => setLang('en')}>English {lang === 'en' && <Check size={16}/>}</button></div><div className="settings-divider"/><h3>{lang === 'es' ? 'Apariencia' : 'Appearance'}</h3><p>{lang === 'es' ? 'Elige el tema visual de Quasaric.' : 'Choose the Quasaric interface theme.'}</p><div className="setting-options theme-options"><button className={theme === 'light' ? 'selected' : ''} onClick={() => setTheme('light')}><Sun size={16}/>{lang === 'es' ? 'Claro' : 'Light'} {theme === 'light' && <Check size={16}/>}</button><button className={theme === 'dark' ? 'selected' : ''} onClick={() => setTheme('dark')}><Moon size={16}/>{lang === 'es' ? 'Oscuro' : 'Dark'} {theme === 'dark' && <Check size={16}/>}</button></div><div className="settings-divider"/><h3>{lang === 'es' ? 'Datos del navegador' : 'Browser data'}</h3><p>{lang === 'es' ? 'El inventario se almacena localmente en este navegador.' : 'Your inventory is stored locally in this browser.'}</p><button className="danger-btn" onClick={() => { if (confirm(lang === 'es' ? '¿Eliminar todo el inventario local?' : 'Delete the entire local inventory?')) persist([]); }}><Trash2 size={15}/>{lang === 'es' ? 'Borrar inventario local' : 'Clear local inventory'}</button></section></>}
          {active === 'settings' && <section className="panel settings-panel trust-center">
            <div className="settings-divider"/>
            <div className="eyebrow">{lang === 'es' ? 'TRANSPARENCIA' : 'TRANSPARENCY'}</div>
            <h2>{lang === 'es' ? 'Centro de confianza' : 'Trust center'}</h2>
            <p>{lang === 'es' ? 'Qué hace Quasaric, qué datos intervienen y cómo interpretar los resultados.' : 'What Quasaric does, which data is involved, and how to interpret results.'}</p>
            <div className="settings-divider"/>
            <h3>{lang === 'es' ? 'Privacidad y datos' : 'Privacy and data'}</h3>
            <p>{lang === 'es' ? 'El inventario y el historial de hasta 10 análisis se guardan en el almacenamiento local de este navegador. No se envía el inventario completo ni se necesita una cuenta. Al analizar, el navegador consulta servicios públicos: esas peticiones pueden revelar tu dirección IP y los términos consultados. Según la fuente, pueden incluir identificadores CVE o datos de paquete fuente y release de Ubuntu. No introduzcas nombres de clientes, datos personales, credenciales, tokens ni secretos.' : 'Your inventory and up to 10 analysis snapshots are stored in this browser. The complete inventory is not uploaded and no account is required. During analysis, your browser contacts public services; those requests may expose your IP address and queried terms. Depending on the source, these may include CVE identifiers or Ubuntu source-package and release data. Do not enter customer names, personal data, credentials, tokens, or secrets.'}</p>
            <h3>{lang === 'es' ? 'Metodología y fuentes' : 'Methodology and sources'}</h3>
            <p>{lang === 'es' ? 'Quasaric relaciona los componentes y versiones que declaras con evidencias publicadas por NVD, FIRST EPSS, CISA KEV, Ubuntu OSV y Canonical OpenVEX. Cada fuente conserva su significado: CVSS mide severidad técnica, EPSS estima probabilidad de explotación en 30 días y KEV identifica vulnerabilidades incluidas por CISA en su catálogo de explotación conocida. La puntuación de triage combina señales para ordenar revisiones; no es una probabilidad ni un veredicto.' : 'Quasaric correlates the components and versions you declare with evidence from NVD, FIRST EPSS, CISA KEV, Ubuntu OSV, and Canonical OpenVEX. Each source retains its own meaning: CVSS measures technical severity, EPSS estimates the probability of exploitation in the next 30 days, and KEV identifies vulnerabilities listed by CISA as known exploited. The triage score combines signals to order reviews; it is not a probability or verdict.'}</p>
            <ul>
              <li><a href="https://nvd.nist.gov/developers/vulnerabilities" target="_blank" rel="noreferrer">NVD · CVE y CPE</a></li>
              <li><a href="https://www.first.org/epss/" target="_blank" rel="noreferrer">FIRST · EPSS</a></li>
              <li><a href="https://www.cisa.gov/known-exploited-vulnerabilities-catalog" target="_blank" rel="noreferrer">CISA · Known Exploited Vulnerabilities</a></li>
              <li><a href="https://documentation.ubuntu.com/security/security-updates/osv/" target="_blank" rel="noreferrer">Ubuntu · OSV</a></li>
              <li><a href="https://github.com/canonical/ubuntu-security-notices" target="_blank" rel="noreferrer">Canonical · Ubuntu Security Notices / OpenVEX</a></li>
            </ul>
            <h3>{lang === 'es' ? 'Limitaciones y uso responsable' : 'Limitations and responsible use'}</h3>
            <p>{lang === 'es' ? 'Quasaric no escanea redes o equipos, no detecta software automáticamente y no aplica parches. La cobertura depende de las fuentes, de la precisión de los datos declarados y de las reglas de correlación. CPE ambiguos, backports, builds, plugins y dependencias pueden requerir comprobaciones adicionales. Una coincidencia es un candidato que debe validarse con el aviso del fabricante y el entorno real. Que no aparezcan resultados no demuestra que el sistema sea seguro; que un hallazgo deje de aparecer tampoco confirma su corrección. No uses esta versión como única base para decisiones de producción.' : 'Quasaric does not scan networks or hosts, discover software automatically, or apply patches. Coverage depends on source availability, the accuracy of declared data, and correlation rules. Ambiguous CPEs, backports, builds, plugins, and dependencies may need additional checks. A match is a candidate that must be validated against the vendor advisory and the real environment. No results do not prove a system is secure; a finding disappearing does not confirm it was fixed. Do not use this version as the sole basis for production decisions.'}</p>
            <h3>{lang === 'es' ? 'Contacto' : 'Contact'}</h3>
            <p>{lang === 'es' ? 'Para consultas o para comunicar un problema:' : 'For questions or to report an issue:'} <a href="mailto:contacto@quasaric.com">contacto@quasaric.com</a>.</p>
          </section>}
          <footer className="footer"><span>© {new Date().getFullYear()} Quasaric · {t.footer}</span></footer>
        </div>
      </main>

      {selectedFinding && <div className="modal-backdrop finding-detail-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setSelectedFinding(null); }}><section ref={selectedFindingDialogRef} className="modal finding-detail-modal" role="dialog" tabIndex={-1} aria-modal="true" aria-labelledby="finding-detail-title"><div className="modal-head"><div><div className="eyebrow">QUASARIC · {selectedFinding.id}</div><h2 id="finding-detail-title">{lang === 'es' ? 'Detalle de vulnerabilidad' : 'Vulnerability details'}</h2></div><button type="button" className="icon-btn finding-detail-close" onClick={() => setSelectedFinding(null)} aria-label={lang === 'es' ? 'Cerrar detalle' : 'Close details'}><X size={18}/></button></div><p className="finding-detail-description">{selectedFinding.description || (lang === 'es' ? 'Sin descripción disponible en las fuentes consultadas.' : 'No description available from queried sources.')}</p><div className="finding-detail-metrics"><div><span>CVSS</span><strong>{selectedFinding.cvss ?? '—'}</strong></div><div><span>EPSS</span><strong>{selectedFinding.epss ?? '—'}</strong></div><div><span>{lang === 'es' ? 'Prioridad' : 'Priority'}</span><strong>{selectedFinding.riskPriority?.score ?? '—'}/100</strong></div><div><span>KEV</span><strong>{selectedFinding.kev ? (lang === 'es' ? 'Sí' : 'Yes') : 'No'}</strong></div></div><div className="finding-detail-section"><h3>{lang === 'es' ? 'Componentes y aplicabilidad' : 'Components and applicability'}</h3>{(selectedFinding.components || []).map((assessment,index)=><article className="finding-evidence-card" key={assessment.component?.id || assessment.component?.name || index}><div className="finding-evidence-heading"><strong>{assessment.component?.name || (lang === 'es' ? 'Componente' : 'Component')} {assessment.component?.version || ''}</strong><span className="tag tag-neutral">{assessment.applicabilityStatus || assessment.status || (lang === 'es' ? 'Revisión necesaria' : 'Review required')}</span></div><p>{assessment.reason || assessment.applicabilityReason || (lang === 'es' ? 'La aplicabilidad debe verificarse con la versión, distribución y aviso del fabricante.' : 'Applicability must be verified against the version, distribution and vendor advisory.')}</p>{(assessment.evidence || []).length > 0 && <ul>{assessment.evidence.map((evidence,evidenceIndex)=><li key={evidence.id || evidence.url || evidenceIndex}><strong>{evidence.source || (lang === 'es' ? 'Fuente' : 'Source')}:</strong> {evidence.status || evidence.title || (lang === 'es' ? 'Evidencia consultada' : 'Evidence queried')} {safeExternalUrl(evidence.url) && <a href={safeExternalUrl(evidence.url)} target="_blank" rel="noreferrer">{lang === 'es' ? 'Abrir fuente' : 'Open source'}</a>}</li>)}</ul>}</article>)}</div><div className="finding-detail-section"><h3>{lang === 'es' ? 'Orientación de remediación' : 'Remediation guidance'}</h3>{(selectedFinding.remediation || []).map((item,index)=><article className="finding-evidence-card" key={item.component?.id || index}><div className="finding-evidence-heading"><strong>{item.component?.name || (lang === 'es' ? 'Componente' : 'Component')}</strong><span className={'tag ' + (item.guidance?.status === 'update_candidate' ? 'tag-amber' : 'tag-neutral')}>{item.guidance?.status === 'update_candidate' ? (lang === 'es' ? 'Actualización candidata' : 'Update candidate') : item.guidance?.status === 'fix_candidate_present' ? (lang === 'es' ? 'Posible corrección' : 'Fix candidate') : (lang === 'es' ? 'Revisión manual' : 'Manual review')}</span></div><p>{item.guidance?.reason || (lang === 'es' ? 'Consulta el aviso oficial y valida el paquete instalado.' : 'Consult the official advisory and validate the installed package.')}</p>{item.guidance?.currentVersion && <p>{lang === 'es' ? 'Versión instalada:' : 'Installed version:'} <strong>{item.guidance.currentVersion}</strong></p>}{item.guidance?.targetVersion && <p>{lang === 'es' ? 'Versión objetivo candidata:' : 'Candidate target version:'} <strong>{item.guidance.targetVersion}</strong></p>}{(item.guidance?.references || []).map((url,urlIndex)=>safeExternalUrl(url) && <a className="finding-source-link" key={urlIndex} href={safeExternalUrl(url)} target="_blank" rel="noreferrer">{lang === 'es' ? 'Consultar aviso oficial' : 'View advisory'}</a>)}</article>)}</div><p className="finding-detail-caveat">{lang === 'es' ? 'La prioridad es una ayuda de clasificación, no una probabilidad de explotación. La aplicabilidad y las versiones candidatas deben verificarse con el fabricante y en el entorno real. Una actualización candidata no confirma que el sistema esté corregido.' : 'Priority is a triage aid, not an exploitation probability. Applicability and candidate versions must be verified with the vendor and in the real environment. An update candidate does not confirm that the system is fixed.'}</p><div className="modal-actions"><button type="button" className="secondary-btn" onClick={() => setSelectedFinding(null)}>{lang === 'es' ? 'Cerrar' : 'Close'}</button></div></section></div>}
      {showAdd && <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) setShowAdd(false); }}><form ref={addDialogRef} className="modal" role="dialog" tabIndex={-1} aria-modal="true" aria-labelledby="add-component-title" onSubmit={addItem}><div className="modal-head"><div><div className="eyebrow">QUASARIC</div><h2 id="add-component-title">{t.addComponent}</h2></div><button type="button" className="icon-btn" onClick={() => setShowAdd(false)} aria-label={lang === 'es' ? 'Cerrar diálogo' : 'Close dialog'}><X size={18}/></button></div><label>{t.componentName}<input required autoFocus value={form.name} onChange={e => { const name = e.target.value; setForm(current => ({ ...current, name, type: suggestedComponentType(name) || current.type })); }} placeholder="e.g. PHP, NGINX"/></label><label>{t.chooseType}<select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>{types.map(type => <option key={type} value={type}>{t[type]}</option>)}</select></label>{suggestedType && suggestedType !== form.type && <div className="modal-note"><AlertTriangle size={15}/>{lang === 'es' ? `Tipo recomendado para ${form.name}: ${t[suggestedType]}. Puedes elegir otro tipo antes de añadir.` : `Recommended type for ${form.name}: ${t[suggestedType]}. You can choose a different type before adding.`}</div>}<label>{t.versionLabel}<input value={form.version} onChange={e => setForm({ ...form, version: e.target.value })} placeholder="e.g. 1.24.0"/></label><label>{t.vendor}<input value={form.vendor} onChange={e => setForm({ ...form, vendor: e.target.value })} placeholder={form.name.trim().toLowerCase() === 'ubuntu' ? 'Ubuntu:24.04:LTS' : 'e.g. Ubuntu:24.04:LTS'}/></label>{addFormError && <div className="error-banner" role="alert">{addFormError}</div>}<label>{lang === 'es' ? 'PURL (opcional)' : 'PURL (optional)'}<input maxLength={2048} value={form.purl} onChange={e => { setForm({ ...form, purl: e.target.value }); setAddFormError(''); }} placeholder="pkg:npm/example@1.0.0"/></label><label>{lang === 'es' ? 'CPE 2.3 (opcional)' : 'CPE 2.3 (optional)'}<input maxLength={2048} value={form.cpe} onChange={e => setForm({ ...form, cpe: e.target.value })} placeholder="cpe:2.3:a:vendor:product:1.0:*:*:*:*:*:*:*"/></label>{(/ubuntu|almalinux|rocky linux|suse|opensuse|sles/i.test(form.vendor) || (/(ubuntu|almalinux|rocky linux|suse|opensuse|sles)/i.test(form.name) && form.type === 'os')) && <><label>{t.sourcePackageLabel}<input value={form.sourcePackage || ''} onChange={e => setForm({ ...form, sourcePackage: e.target.value })} placeholder="e.g. openssl (source package)"/></label><label>{t.sourceVersionLabel}<input value={form.sourceVersion || ''} onChange={e => setForm({ ...form, sourceVersion: e.target.value })} placeholder="e.g. 3.0.2-0ubuntu1.18"/></label><label>{t.architectureLabel}<input value={form.architecture || ''} onChange={e => setForm({ ...form, architecture: e.target.value })} placeholder="e.g. amd64"/></label><div className="modal-note modal-help-note"><BookOpen size={16}/><div><p>{t.sourcePackageHelp} <button type="button" className="inline-help-link" onClick={() => { setShowAdd(false); setActive('help'); }}>{lang === 'es' ? 'Abrir guía de versiones' : 'Open version guide'}</button></p></div></div></>}<div className="modal-note"><LockKeyhole size={15}/>{t.privacyNote}</div><div className="modal-actions"><button type="button" className="secondary-btn" onClick={() => setShowAdd(false)}>{t.cancel}</button><button type="submit" className="primary-btn" disabled={!form.name.trim()}><Plus size={16}/>{t.add}</button></div></form></div>}
    </div>
  );
}

function trendLabel(value, t) { return value > 0 ? '+' + value + ' · ' + t.postureIncrease : value < 0 ? value + ' · ' + t.postureDecrease : t.postureStable; }

function Metric({ icon: Icon, label, value, hint }) { return <div className="metric-card"><div className="metric-top"><span>{label}</span><div className="metric-icon"><Icon size={17}/></div></div><strong className="metric-value">{value}</strong><span className="metric-hint">{hint}</span></div>; }
function PanelHead({ title, detail, action }) { return <div className="panel-head"><div><h2>{title}</h2>{detail && <span>{detail}</span>}</div>{action}</div>; }
function IconFor({ type }) { const Icon = iconFor(type); return <Icon size={18}/>; }
function ComponentChip({ item }) { return <div className="component-chip"><div className="component-icon"><IconFor type={item.type}/></div><div><strong>{item.name}</strong><span>{item.version || 'Version —'}</span></div><span className="chip-type">{typeNames[item.type]}</span></div>; }

export default App;