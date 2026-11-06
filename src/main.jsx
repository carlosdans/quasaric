import React, { Suspense, lazy, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import LandingPage from './LandingPage.jsx';
import LegalPage from './LegalPage.jsx';

const App = lazy(() => import('./App.jsx'));

function readLanguage() {
  try { return localStorage.getItem('quasaric-language') === 'en' ? 'en' : 'es'; }
  catch { return 'es'; }
}

class AppErrorBoundary extends React.Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      const english = document.documentElement.lang === 'en';
      return (
        <main role="alert" aria-labelledby="app-error-title" style={{ minHeight: '100vh', display: 'grid', alignContent: 'center', justifyItems: 'center', gap: 16, padding: 24, background: '#090d16', color: '#e8edf7', fontFamily: 'system-ui,sans-serif', textAlign: 'center' }}>
          <div aria-hidden="true" style={{ width: 48, height: 48, display: 'grid', placeItems: 'center', border: '1px solid #36517a', borderRadius: 12, color: '#a9c3ff', fontSize: 22, fontWeight: 800 }}>Q</div>
          <h1 id="app-error-title">{english ? 'Quasaric could not load this view' : 'Quasaric no ha podido cargar esta vista'}</h1>
          <p>{english
            ? 'Reload the page to try again. If your inventory was saved locally, it will be restored.'
            : 'Recarga la página para volver a intentarlo. Si el inventario se guardó localmente, se restaurará.'}</p>
          <button type="button" onClick={() => window.location.reload()} style={{ padding: '11px 18px', border: 0, borderRadius: 8, background: '#e8efff', color: '#0b1423', fontWeight: 700, cursor: 'pointer' }}>
            {english ? 'Reload Quasaric' : 'Recargar Quasaric'}
          </button>
        </main>
      );
    }
    return this.props.children;
  }
}

function Root() {
  const [lang, setLang] = useState(readLanguage);
  const [isAppRoute, setIsAppRoute] = useState(() => window.location.hash === '#app');
  const [path, setPath] = useState(() => window.location.pathname);
  const legalRoutes = ['/aviso-legal', '/privacidad', '/cookies'];
  const isLegalRoute = legalRoutes.includes(path);

  useEffect(() => {
    try { localStorage.setItem('quasaric-language', lang); } catch { /* storage may be unavailable */ }
    if (isLegalRoute) return;
    document.documentElement.lang = lang;
    const english = lang === 'en';
    document.title = english ? 'Quasaric — Vulnerability Intelligence' : 'Quasaric — Inteligencia de vulnerabilidades';
    const description = english
      ? 'Correlate your technology inventory with known vulnerabilities and public risk signals. Local-first analysis, traceable evidence and a transparent methodology.'
      : 'Relaciona tu inventario tecnológico con vulnerabilidades conocidas y señales públicas de riesgo. Análisis local-first, evidencias trazables y metodología transparente.';
    document.querySelector('meta[name="description"]')?.setAttribute('content', description);
    document.querySelector('meta[property="og:title"]')?.setAttribute('content', document.title);
    document.querySelector('meta[property="og:description"]')?.setAttribute('content', description);
    document.querySelector('meta[name="twitter:title"]')?.setAttribute('content', document.title);
    document.querySelector('meta[name="twitter:description"]')?.setAttribute('content', description);
    document.querySelector('meta[property="og:locale"]')?.setAttribute('content', english ? 'en_US' : 'es_ES');
  }, [lang, isLegalRoute]);

  useEffect(() => {
    const syncRoute = () => {
      setIsAppRoute(window.location.hash === '#app');
      setPath(window.location.pathname);
      setLang(readLanguage());
    };
    window.addEventListener('hashchange', syncRoute);
    window.addEventListener('popstate', syncRoute);
    return () => { window.removeEventListener('hashchange', syncRoute); window.removeEventListener('popstate', syncRoute); };
  }, []);

  const openApp = () => {
    if (window.location.hash !== '#app') window.location.hash = 'app';
    setIsAppRoute(true);
  };

  return (
    <AppErrorBoundary>
      {isLegalRoute ? (
        <LegalPage path={path} lang={lang} onLanguageChange={setLang} />
      ) : isAppRoute ? (
        <Suspense fallback={<main role="status" aria-live="polite" style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#090d16', color: '#e8edf7', fontFamily: 'system-ui,sans-serif' }}>{lang === 'es' ? 'Cargando Quasaric…' : 'Loading Quasaric…'}</main>}>
          <App />
        </Suspense>
      ) : (
        <LandingPage lang={lang} onLanguageChange={setLang} onOpenApp={openApp} />
      )}
    </AppErrorBoundary>
  );
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);
