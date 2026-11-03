import React, { useState } from 'react';
import {
  ArrowRight, ArrowUpRight, Check, ChevronRight, Database, FileCheck2,
  Fingerprint, Globe2, Layers3, LockKeyhole, Menu, ShieldCheck, SlidersHorizontal,
  Sparkles, Workflow, X
} from 'lucide-react';
import './landing.css';

const content = {
  es: {
    nav: [['#product', 'Producto'], ['#workflow', 'Cómo funciona'], ['#trust', 'Confianza'], ['#faq', 'Preguntas frecuentes']],
    open: 'Abrir la plataforma', eyebrow: 'VULNERABILITY INTELLIGENCE · LOCAL-FIRST',
    headline: 'Entiende tu exposición.\\nDecide con evidencias.',
    intro: 'Relaciona las tecnologías que utilizas con vulnerabilidades conocidas y señales públicas de riesgo. Sin escaneos, sin subir tu inventario y sin convertir una coincidencia en un veredicto.',
    primary: 'Explorar la plataforma', secondary: 'Cómo funciona', note: 'Empieza con un componente. No necesitas crear una cuenta.',
    proof: [['Local-first', 'Tu inventario permanece en tu navegador'], ['Fuentes públicas', 'Evidencias identificables y consultables'], ['Análisis explicable', 'Criterios y límites visibles']],
    sectionLabel: 'UNA VISIÓN MÁS CLARA', productTitle: 'De una lista de componentes a una visión de exposición.',
    productIntro: 'Quasaric correlaciona un inventario que tú declaras con fuentes públicas de vulnerabilidades. El objetivo no es prometer certeza automática: es ayudarte a entender qué se ha encontrado, por qué y qué falta por verificar.',
    features: [
      [Layers3, 'Inventario tecnológico', 'Añade componentes y versiones manualmente o importa CSV, CycloneDX y SPDX. Conserva arquitectura, identificadores y relaciones de procedencia cuando están declaradas.'],
      [ShieldCheck, 'Correlación conservadora', 'Contrasta productos, CPE, PURL y rangos de versión. Cuando faltan datos o una versión no puede ordenarse con seguridad, el resultado queda pendiente de revisión.'],
      [SlidersHorizontal, 'Priorización explicable', 'Consulta por separado CVSS, EPSS, CISA KEV y aplicabilidad. La puntuación de triage ayuda a ordenar el trabajo; no es una probabilidad de explotación.'],
      [FileCheck2, 'Evidencias y remediación', 'Revisa fuentes, avisos y versiones candidatas por componente. Las propuestas nunca se presentan como prueba de que un parche esté instalado.'],
      [Workflow, 'Historial y postura', 'Compara análisis guardados localmente y observa cambios en las exposiciones detectadas, sin confundir una ausencia posterior con una remediación confirmada.'],
      [Database, 'Informes portables', 'Exporta inventario y hallazgos a CSV o genera un informe imprimible desde el navegador. Tus datos no necesitan una cuenta ni un workspace remoto.']
    ],
    workflowLabel: 'FLUJO DE TRABAJO', workflowTitle: 'Tú aportas el contexto. Quasaric organiza la evidencia.',
    workflowIntro: 'Un proceso deliberadamente sencillo y transparente, pensado para análisis asistidos y revisión humana.',
    steps: [
      ['01', 'Declara tu tecnología', 'Introduce el producto, distribución, versión y, cuando proceda, arquitectura o paquete fuente. También puedes importar un SBOM.'],
      ['02', 'Consulta fuentes públicas', 'Quasaric consulta los identificadores necesarios desde tu navegador. No envía el inventario completo a los proveedores.'],
      ['03', 'Revisa antes de actuar', 'Examina la aplicabilidad, las señales, los errores de cobertura y las referencias originales. Valida los candidatos con el fabricante.']
    ],
    sourcesLabel: 'COBERTURA CON FUENTES ABIERTAS', sourcesTitle: 'Evidencia de distintas fuentes. Sin mezclar sus significados.',
    sourcesIntro: 'Las fuentes aportan señales diferentes. Quasaric las conserva diferenciadas para que puedas entender su alcance y sus limitaciones.',
    sources: [['NVD', 'CVE, CPE y rangos publicados'], ['FIRST EPSS', 'Estimación de probabilidad de explotación'], ['CISA KEV', 'Catálogo de vulnerabilidades explotadas conocidas'], ['OSV', 'Avisos por paquete y ecosistema'], ['Ubuntu / Canonical', 'OSV, avisos y documentos OpenVEX'], ['Red Hat / SUSE', 'Datos de seguridad y evidencia del fabricante']],
    trustLabel: 'PRIVACIDAD Y MÉTODO', trustTitle: 'Tus datos bajo tu control. Las conclusiones, bajo revisión.',
    trustIntro: 'Quasaric está diseñada para funcionar como una aplicación estática y local-first.',
    trustPoints: [
      ['Inventario local', 'Los componentes, preferencias e historial se guardan en el almacenamiento del navegador. No hay cuentas, backend propio ni base de datos central.'],
      ['Consultas mínimas', 'Las fuentes públicas reciben los identificadores que se consultan, no el inventario completo. El proveedor externo puede ver tu dirección IP y los identificadores solicitados.'],
      ['Sin escaneos activos', 'No realiza reconocimiento de red, explotación ni pruebas sobre tus sistemas. Tú declaras los componentes y sus versiones.'],
      ['Resultados prudentes', 'Una coincidencia no confirma por sí sola una vulnerabilidad. Una versión corregida publicada no demuestra que esté instalada. La ausencia de resultados tampoco demuestra seguridad.']
    ],
    limitation: 'Importante: Quasaric es una herramienta de apoyo a la revisión. No sustituye los avisos del fabricante, una auditoría, un escáner especializado ni un proceso de gestión de vulnerabilidades validado.',
    faqLabel: 'PREGUNTAS FRECUENTES', faqTitle: 'Antes de empezar.',
    faqs: [
      ['¿Quasaric escanea mis servidores?', 'No. Analiza los componentes y versiones que introduces. No realiza conexiones de reconocimiento, pruebas activas ni explotación.'],
      ['¿Dónde se guarda mi inventario?', 'En el almacenamiento local de tu navegador. No se crea una cuenta ni se envía el inventario completo a un servidor de Quasaric.'],
      ['¿Qué información sale del navegador?', 'Al consultar fuentes públicas se envían los identificadores necesarios, como CVE o PURL. Esas fuentes pueden ver tu IP y los identificadores consultados.'],
      ['¿Un resultado confirma que soy vulnerable?', 'No necesariamente. Es una correlación que requiere revisar producto, versión, distribución, arquitectura y evidencia del fabricante. Quasaric muestra estados conservadores cuando faltan datos.'],
      ['¿Quasaric confirma que un parche está instalado?', 'No. Puede mostrar versiones corregidas publicadas o candidatos de remediación, pero no comprueba el estado real de tus sistemas.'],
      ['¿Necesito una cuenta?', 'No. La aplicación funciona localmente en el navegador y no requiere registro.']
    ],
    finalTitle: 'Empieza por lo que conoces.\\nInvestiga lo que importa.',
    finalText: 'Añade una tecnología y explora cómo Quasaric relaciona tu inventario con evidencia pública.',
    finalCta: 'Abrir Quasaric', footerLine: 'Inteligencia de vulnerabilidades con transparencia sobre los datos y sus límites.',
    footerProduct: 'Producto', footerLegal: 'Método y privacidad',
    footerDisclaimer: 'Quasaric no garantiza la detección exhaustiva ni la ausencia de vulnerabilidades.'
  },
  en: {
    nav: [['#product', 'Product'], ['#workflow', 'How it works'], ['#trust', 'Trust'], ['#faq', 'FAQ']],
    open: 'Open the platform', eyebrow: 'VULNERABILITY INTELLIGENCE · LOCAL-FIRST',
    headline: 'Understand exposure.\\nDecide with evidence.',
    intro: 'Correlate the technologies you use with known vulnerabilities and public risk signals. No scanning, no inventory uploads, and no turning a match into a verdict.',
    primary: 'Explore the platform', secondary: 'How it works', note: 'Start with one component. No account required.',
    proof: [['Local-first', 'Your inventory stays in your browser'], ['Public sources', 'Traceable, inspectable evidence'], ['Explainable analysis', 'Visible criteria and limitations']],
    sectionLabel: 'A CLEARER PICTURE', productTitle: 'From a component list to an exposure view.',
    productIntro: 'Quasaric correlates an inventory you provide with public vulnerability sources. The goal is not to promise automatic certainty: it is to help you understand what was found, why, and what still needs verification.',
    features: [
      [Layers3, 'Technology inventory', 'Add components and versions manually or import CSV, CycloneDX and SPDX. Preserve architecture, identifiers and declared provenance relationships.'],
      [ShieldCheck, 'Conservative correlation', 'Compare products, CPEs, PURLs and version ranges. When data is missing or a version cannot be safely ordered, the result stays pending review.'],
      [SlidersHorizontal, 'Explainable prioritisation', 'Review CVSS, EPSS, CISA KEV and applicability separately. The triage score helps order work; it is not an exploitation probability.'],
      [FileCheck2, 'Evidence and remediation', 'Review sources, advisories and candidate versions per component. Suggestions are never presented as proof that a patch is installed.'],
      [Workflow, 'History and posture', 'Compare analyses saved locally and observe changes in detected exposures, without treating a later absence as confirmed remediation.'],
      [Database, 'Portable reports', 'Export inventory and findings to CSV or create a printable report in your browser. Your data needs no account or remote workspace.']
    ],
    workflowLabel: 'WORKFLOW', workflowTitle: 'You provide the context. Quasaric organises the evidence.',
    workflowIntro: 'A deliberately simple and transparent process for assisted analysis and human review.',
    steps: [
      ['01', 'Describe your technology', 'Enter the product, distribution, version and, where relevant, architecture or source package. You can also import an SBOM.'],
      ['02', 'Query public sources', 'Quasaric requests the necessary identifiers from your browser. It does not send your full inventory to providers.'],
      ['03', 'Review before acting', 'Inspect applicability, signals, coverage errors and original references. Validate candidates with the vendor.']
    ],
    sourcesLabel: 'OPEN-SOURCE COVERAGE', sourcesTitle: 'Evidence from different sources. Their meanings stay distinct.',
    sourcesIntro: 'Each source contributes a different signal. Quasaric keeps them separate so you can understand their scope and limitations.',
    sources: [['NVD', 'CVE, CPE and published version ranges'], ['FIRST EPSS', 'Estimated probability of exploitation'], ['CISA KEV', 'Known Exploited Vulnerabilities catalog'], ['OSV', 'Package and ecosystem advisories'], ['Ubuntu / Canonical', 'OSV, security notices and OpenVEX documents'], ['Red Hat / SUSE', 'Security data and vendor evidence']],
    trustLabel: 'PRIVACY AND METHOD', trustTitle: 'Your data stays under your control. Conclusions stay reviewable.',
    trustIntro: 'Quasaric is designed to run as a static, local-first application.',
    trustPoints: [
      ['Local inventory', 'Components, preferences and history are stored in your browser. There are no accounts, proprietary backend or central database.'],
      ['Minimal queries', 'Public sources receive the identifiers being queried, not your full inventory. External providers may see your IP address and requested identifiers.'],
      ['No active scanning', 'It does not perform network reconnaissance, exploitation or tests against your systems. You declare the components and versions.'],
      ['Cautious results', 'A match alone does not confirm a vulnerability. A published fixed version does not prove it is installed. No results do not prove security.']
    ],
    limitation: 'Important: Quasaric is a review aid. It does not replace vendor advisories, an audit, a specialised scanner or a validated vulnerability-management process.',
    faqLabel: 'FREQUENTLY ASKED QUESTIONS', faqTitle: 'Before you get started.',
    faqs: [
      ['Does Quasaric scan my servers?', 'No. It analyses the components and versions you enter. It does not perform reconnaissance connections, active tests or exploitation.'],
      ['Where is my inventory stored?', 'In your browser local storage. No account is created and your full inventory is not sent to a Quasaric server.'],
      ['What information leaves my browser?', 'Queries to public sources send the necessary identifiers, such as CVEs or PURLs. Those sources may see your IP address and the identifiers queried.'],
      ['Does a result confirm that I am vulnerable?', 'Not necessarily. It is a correlation that requires checking the product, version, distribution, architecture and vendor evidence. Quasaric uses conservative states when data is missing.'],
      ['Does Quasaric confirm that a patch is installed?', 'No. It can show published fixed versions or remediation candidates, but it does not inspect the actual state of your systems.'],
      ['Do I need an account?', 'No. The application runs locally in your browser and does not require registration.']
    ],
    finalTitle: 'Start with what you know.\\nInvestigate what matters.',
    finalText: 'Add a technology and explore how Quasaric relates your inventory to public evidence.',
    finalCta: 'Open Quasaric', footerLine: 'Vulnerability intelligence with transparency about data and limitations.',
    footerProduct: 'Product', footerLegal: 'Method and privacy',
    footerDisclaimer: 'Quasaric does not guarantee exhaustive detection or the absence of vulnerabilities.'
  }
};

function Brand() {
  return <a className="landing-brand" href="#top" aria-label="Quasaric home"><span className="landing-brand-mark">Q</span><span>quasaric<span className="landing-brand-dot">.com</span></span></a>;
}

export default function LandingPage({ lang = 'es', onLanguageChange, onOpenApp }) {
  const t = content[lang] || content.es;
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const closeMobileNav = () => setMobileNavOpen(false);
  return (
    <div className="landing-shell" id="top">
      <a className="landing-skip-link" href="#landing-main">{lang === 'es' ? 'Saltar al contenido' : 'Skip to content'}</a>
      <header className="landing-header">
        <div className="landing-header-inner">
          <Brand />
          <nav className={'landing-nav' + (mobileNavOpen ? ' is-mobile-open' : '')} id="landing-navigation" aria-label={lang === 'es' ? 'Navegación principal' : 'Main navigation'}>
            {t.nav.map(([href, label]) => <a key={href} href={href} onClick={closeMobileNav}>{label}</a>)}
          </nav>
          <div className="landing-header-actions">
            <button className="landing-language" onClick={() => onLanguageChange?.(lang === 'es' ? 'en' : 'es')} aria-label={lang === 'es' ? 'Switch to English' : 'Cambiar a español'}><Globe2 size={15}/>{lang.toUpperCase()}</button>
            <button className="landing-mobile-toggle" type="button" aria-controls="landing-navigation" aria-expanded={mobileNavOpen} aria-label={mobileNavOpen ? (lang === 'es' ? 'Cerrar navegación' : 'Close navigation') : (lang === 'es' ? 'Abrir navegación' : 'Open navigation')} onClick={() => setMobileNavOpen(open => !open)}>{mobileNavOpen ? <X size={19}/> : <Menu size={19}/>}</button>
            <button className="landing-open" onClick={onOpenApp}>{t.open}<ArrowUpRight size={16}/></button>
          </div>
        </div>
      </header>
      <main id="landing-main" tabIndex={-1}>
        <section className="landing-hero">
          <div className="landing-hero-grid">
            <div className="landing-hero-copy">
              <div className="landing-eyebrow"><span/> {t.eyebrow}</div>
              <h1>{t.headline.split('\\n').map((line, index) => <React.Fragment key={line}>{index > 0 && <br/>}{line}</React.Fragment>)}</h1>
              <p className="landing-lead">{t.intro}</p>
              <div className="landing-hero-actions">
                <button className="landing-primary" onClick={onOpenApp}>{t.primary}<ArrowRight size={17}/></button>
                <a className="landing-secondary" href="#workflow">{t.secondary}<ChevronRight size={16}/></a>
              </div>
              <p className="landing-note"><LockKeyhole size={14}/>{t.note}</p>
            </div>
            <div className="landing-visual" role="img" aria-label={lang === 'es' ? 'Ilustración conceptual de correlación de vulnerabilidades' : 'Conceptual illustration of vulnerability correlation'}>
              <div className="landing-visual-top"><span><i/> QUASARIC / INTELLIGENCE</span><span>01 — 03</span></div>
              <div className="landing-visual-orbit orbit-a"/><div className="landing-visual-orbit orbit-b"/>
              <div className="landing-visual-core"><ShieldCheck size={42}/><span>Q</span></div>
              <div className="landing-node node-one"><Fingerprint size={17}/><span>CPE / PURL</span></div>
              <div className="landing-node node-two"><Database size={17}/><span>PUBLIC DATA</span></div>
              <div className="landing-node node-three"><SlidersHorizontal size={17}/><span>RISK SIGNALS</span></div>
              <div className="landing-visual-bottom"><span>LOCAL INVENTORY</span><span>TRACEABLE EVIDENCE</span></div>
            </div>
          </div>
          <div className="landing-proof">{t.proof.map(([title, description], index) => <div className="landing-proof-item" key={title}><span>0{index + 1}</span><div><strong>{title}</strong><small>{description}</small></div></div>)}</div>
        </section>

        <section className="landing-section landing-product" id="product">
          <div className="landing-section-heading"><span className="landing-kicker">{t.sectionLabel}</span><h2>{t.productTitle}</h2><p>{t.productIntro}</p></div>
          <div className="landing-feature-grid">{t.features.map(([Icon, title, description], index) => <article className="landing-feature" key={title}><div className="landing-feature-top"><span className="landing-feature-icon"><Icon size={20}/></span><span>0{index + 1}</span></div><h3>{title}</h3><p>{description}</p></article>)}</div>
        </section>

        <section className="landing-section landing-workflow" id="workflow">
          <div className="landing-section-heading"><span className="landing-kicker">{t.workflowLabel}</span><h2>{t.workflowTitle}</h2><p>{t.workflowIntro}</p></div>
          <div className="landing-steps">{t.steps.map(([number, title, description], index) => <article className="landing-step" key={number}><span className="landing-step-number">{number}</span><div><h3>{title}</h3><p>{description}</p></div>{index < 2 && <ArrowRight className="landing-step-arrow" size={20}/>}</article>)}</div>
        </section>

        <section className="landing-section landing-sources">
          <div className="landing-section-heading"><span className="landing-kicker">{t.sourcesLabel}</span><h2>{t.sourcesTitle}</h2><p>{t.sourcesIntro}</p></div>
          <div className="landing-source-grid">{t.sources.map(([name, description]) => <div className="landing-source" key={name}><span><Check size={15}/></span><div><strong>{name}</strong><small>{description}</small></div></div>)}</div>
        </section>

        <section className="landing-section landing-trust" id="trust">
          <div className="landing-section-heading"><span className="landing-kicker">{t.trustLabel}</span><h2>{t.trustTitle}</h2><p>{t.trustIntro}</p></div>
          <div className="landing-trust-grid">{t.trustPoints.map(([title, description], index) => <article className="landing-trust-item" key={title}><span>0{index + 1}</span><div><h3>{title}</h3><p>{description}</p></div></article>)}</div>
          <div className="landing-limitation"><Sparkles size={18}/><p>{t.limitation}</p></div>
        </section>

        <section className="landing-section landing-faq" id="faq">
          <div className="landing-section-heading"><span className="landing-kicker">{t.faqLabel}</span><h2>{t.faqTitle}</h2></div>
          <div className="landing-faq-list">{t.faqs.map(([question, answer]) => <details key={question}><summary>{question}<ChevronRight size={17}/></summary><p>{answer}</p></details>)}</div>
        </section>

        <section className="landing-final">
          <div><span className="landing-kicker">QUASARIC / SECURITY INTELLIGENCE</span><h2>{t.finalTitle.split('\\n').map((line, index) => <React.Fragment key={line}>{index > 0 && <br/>}{line}</React.Fragment>)}</h2><p>{t.finalText}</p></div>
          <button className="landing-primary" onClick={onOpenApp}>{t.finalCta}<ArrowRight size={17}/></button>
        </section>
      </main>
      <footer className="landing-footer">
        <div className="landing-footer-main"><div><Brand/><p>{t.footerLine}</p></div><div className="landing-footer-links"><a href="#product">{t.footerProduct}</a><a href="#trust">{t.footerLegal}</a></div></div>
        <div className="landing-footer-bottom"><span>© {new Date().getFullYear()} Quasaric</span><span>{t.footerDisclaimer}</span></div>
      </footer>
    </div>
  );
}
