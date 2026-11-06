import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const landing = await readFile(new URL('../src/LandingPage.jsx', import.meta.url), 'utf8');
const app = await readFile(new URL('../src/App.jsx', import.meta.url), 'utf8');
const styles = await readFile(new URL('../src/landing.css', import.meta.url), 'utf8');
const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');

test('public website explains the product in Spanish and English', () => {
  for (const phrase of ['Entiende tu exposición', 'Understand exposure', 'Preguntas frecuentes', 'FREQUENTLY ASKED QUESTIONS']) assert.ok(landing.includes(phrase), phrase);
  assert.match(landing, /const content = \{\s*es:/);
  assert.match(landing, /en:/);
});

test('public website describes local-first privacy and conservative limitations', () => {
  assert.match(landing, /Tu inventario permanece en tu navegador/);
  assert.match(landing, /Your inventory stays in your browser/);
  assert.match(landing, /No realiza reconocimiento de red/);
  assert.match(landing, /does not perform network reconnaissance/);
  assert.match(landing, /La ausencia de resultados tampoco demuestra seguridad/);
  assert.match(landing, /No results do not prove security/);
});

test('public website has navigation, a working app entry and accessible FAQ', () => {
  assert.match(landing, /href="#product"/);
  assert.match(landing, /onClick=\{onOpenApp\}/);
  assert.match(landing, /<details key=\{question\}>/);
  assert.match(app, /window\.location\.hash !== '#app'/);
  assert.match(app, /window\.location\.hash = 'app'/);
  assert.match(app, /Web pública/);
});

test('public website is responsive and respects reduced-motion preferences', () => {
  assert.match(styles, /@media\(max-width:700px\)/);
  assert.match(styles, /prefers-reduced-motion:reduce/);
  assert.match(styles, /:focus-visible/);
});

test('document exposes search and social metadata with structured software information', () => {
  assert.match(html, /name="description"/);
  assert.match(html, /property="og:title"/);
  assert.match(html, /name="twitter:card"/);
  assert.match(html, /application\/ld\+json/);
  assert.match(html, /"@type": "SoftwareApplication"/);
});


test('public and application footers do not expose email or GitHub links', () => {
  const landingStart = landing.indexOf('<footer className="landing-footer">');
  const landingFooter = landing.slice(landingStart, landing.indexOf('</footer>', landingStart));
  const appStart = app.indexOf('<footer className="footer">');
  const appFooter = app.slice(appStart, app.indexOf('</footer>', appStart));
  for (const footer of [landingFooter, appFooter]) {
    assert.equal(footer.includes('mailto:'), false);
    assert.equal(footer.includes('github.com'), false);
  }
  assert.ok(landingFooter.includes('href="#product"'));
  assert.ok(landingFooter.includes('href="#trust"'));
});

test('vulnerability correlation engine is lazy-loaded only when analysis runs', () => {
  assert.doesNotMatch(app, /^import\\s+\\{\\s*analyzeInventory\\s*\\}\\s+from\\s+['"]\\.\\/lib\\/correlation\\.js['"]/m);
  assert.match(app, /await import\\(['"]\\.\\/lib\\/correlation\\.js['"]\\)/);
});
