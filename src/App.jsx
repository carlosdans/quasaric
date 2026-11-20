import { useEffect, useState } from 'react';
import { getTranslations, resolveLanguage } from './i18n.js';

function getInitialLanguage() {
  try {
    const saved = window.localStorage.getItem('quasaric-language');
    return resolveLanguage(saved, navigator.languages?.length ? navigator.languages : [navigator.language]);
  } catch {
    return resolveLanguage(null, typeof navigator === 'undefined' ? [] : [navigator.language]);
  }
}

export default function App() {
  const [language, setLanguage] = useState(getInitialLanguage);
  const t = getTranslations(language);

  useEffect(() => {
    document.documentElement.lang = language;
    document.title = t.pageTitle;
    document.querySelector('meta[name="description"]')?.setAttribute('content', t.pageDescription);
    document.querySelector('meta[property="og:title"]')?.setAttribute('content', t.pageTitle);
    document.querySelector('meta[property="og:description"]')?.setAttribute('content', t.pageDescription);
    document.querySelector('meta[name="twitter:title"]')?.setAttribute('content', t.pageTitle);
    document.querySelector('meta[name="twitter:description"]')?.setAttribute('content', t.pageDescription);
    try {
      window.localStorage.setItem('quasaric-language', language);
    } catch {
      // Language switching still works when browser storage is unavailable.
    }
  }, [language, t]);

  return (
    <main>
      <header className="topbar">
        <a className="brand" href="/" aria-label="Quasaric">
          <span className="brand-mark">Q</span>
          <span>quasaric</span>
        </a>
        <div className="topbar-actions">
          <span className="status"><span className="status-dot" /> {t.status}</span>
          <div className="language-switch" role="group" aria-label={t.languageLabel}>
            <button type="button" onClick={() => setLanguage('es')} aria-pressed={language === 'es'}>ES</button>
            <button type="button" onClick={() => setLanguage('en')} aria-pressed={language === 'en'}>EN</button>
          </div>
        </div>
      </header>

      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">{t.eyebrow}</p>
          <h1>{t.headlineFirst}<br /><span>{t.headlineSecond}</span></h1>
          <p className="intro">{t.intro}</p>
          <a className="primary-link" href="#vision">{t.explore} <span aria-hidden="true">↘</span></a>
        </div>

        <div className="music-card" aria-label={t.practice}>
          <div className="card-top"><span>{t.practice}</span><span className="equalizer"><i /><i /><i /><i /><i /></span></div>
          <div className="staff">
            <div className="staff-lines" />
            <div className="falling-notes">
              <span className="note note-one">♪</span>
              <span className="note note-two">♫</span>
              <span className="note note-three">♪</span>
              <span className="note note-four">♬</span>
              <span className="note note-five">♪</span>
            </div>
            <div className="keyboard">
              {Array.from({ length: 14 }, (_, index) => <span className="key" key={index} />)}
            </div>
          </div>
          <div className="card-bottom"><span>{t.listen}</span><span>{t.learn}</span><span>{t.play}</span></div>
        </div>
      </section>

      <section className="vision" id="vision">
        <div className="section-heading">
          <p className="eyebrow">{t.visionEyebrow}</p>
          <h2>{t.visionTitleFirst}<br />{t.visionTitleSecond}</h2>
          <p>{t.visionSubtitle}</p>
        </div>
        <div className="idea-list">
          {t.ideas.map((idea) => (
            <article className="idea" key={idea.number}>
              <span className="idea-number">{idea.number}</span>
              <div><h3>{idea.title}</h3><p>{idea.description}</p></div>
              <span className="idea-tag">{idea.tag}</span>
            </article>
          ))}
        </div>
      </section>

      <footer>
        <a className="brand footer-brand" href="/"><span className="brand-mark">Q</span><span>quasaric</span></a>
        <span>{t.footer}</span>
        <span>© {new Date().getFullYear()} Quasaric</span>
      </footer>
    </main>
  );
}
