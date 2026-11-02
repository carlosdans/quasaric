import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const app = await readFile(new URL('../src/App.jsx', import.meta.url), 'utf8');

test('vulnerability detail dialog traps focus and closes with Escape', () => {
  assert.match(app, /selectedFindingDialogRef/);
  assert.match(app, /openFindingDetails\s*=\s*finding\s*=>/);
  assert.match(app, /event\.key === 'Escape'[\s\S]*?setSelectedFinding\(null\)/);
  assert.match(app, /event\.key !== 'Tab'[\s\S]*?focusableElements/);
  assert.match(app, /finding-detail-close/);
  assert.match(app, /aria-modal="true" aria-labelledby="finding-detail-title"/);
  assert.match(app, /selectedFindingTriggerRef\.current\.focus\(\)/);
});

test('vulnerability search input has an accessible name', () => {
  assert.match(app, /<input aria-label=\{t\.search\} value=\{query\}/);
});


test('manual component validation errors are announced inside the add dialog', () => {
  assert.match(app, /const \[addFormError, setAddFormError\] = useState\(''\)/);
  assert.match(app, /setAddFormError\(lang === 'es' \? 'El PURL debe ser una Package URL válida/);
  assert.match(app, /\{addFormError && <div className="error-banner" role="alert">\{addFormError\}<\/div>\}/);
  assert.match(app, /Could not save the inventory\. Check browser storage/);
});


test('mobile navigation is modal, keyboard-trapped and restores focus', () => {
  assert.match(app, /const \[mobileNav, setMobileNav\] = useState\(false\)/);
  assert.match(app, /role=\{mobileNav \? 'dialog' : undefined\}/);
  assert.match(app, /aria-modal=\{mobileNav \? 'true' : undefined\}/);
  assert.match(app, /event\.key === 'Escape'[\s\S]*?setMobileNav\(false\)/);
  assert.match(app, /event\.key !== 'Tab'[\s\S]*?focusableElements/);
  assert.match(app, /sidebar\?\.querySelector\('\.mobile-close'\)\?\.focus\(\)/);
  assert.match(app, /mobileNavTriggerRef\.current\.focus\(\)/);
  assert.match(app, /<main id="main-content" className="main-area" tabIndex=\{-1\} inert=\{mobileNav\}>/);
});


test('workspace label does not imply a user account or cloud workspace', () => {
  assert.match(app, /lang === 'es' \? 'Espacio local' : 'Local workspace'/);
  assert.doesNotMatch(app, /<span>Personal workspace<\/span>/);
});


test('add-component dialog traps focus, closes with Escape and restores focus', () => {
  assert.match(app, /const \[showAdd, setShowAdd\] = useState\(false\)/);
  assert.match(app, /const openAdd = \(\) => \{[\s\S]*?addTriggerRef\.current = document\.activeElement/);
  assert.match(app, /if \(!showAdd\) return undefined/);
  assert.match(app, /event\.key === 'Escape'[\s\S]*?setShowAdd\(false\)/);
  assert.match(app, /event\.key !== 'Tab'[\s\S]*?addDialogRef/);
  assert.match(app, /addTriggerRef\.current\?\.isConnected\) addTriggerRef\.current\.focus\(\)/);
  assert.match(app, /ref=\{addDialogRef\} className="modal" role="dialog" tabIndex=\{-1\} aria-modal="true"/);
});


test('keyboard users can skip repeated navigation and focus the main content', () => {
  assert.match(app, /<a className="skip-link" href="#main-content">/);
  assert.match(app, /<main id="main-content" className="main-area" tabIndex=\{-1\}/);
});


test('Spanish dashboard severity legend is localized', () => {
  assert.match(app, /lang === 'es' \? 'Crítica' : 'Critical'/);
  assert.match(app, /lang === 'es' \? 'Alta' : 'High'/);
  assert.match(app, /lang === 'es' \? 'Media' : 'Medium'/);
  assert.match(app, /lang === 'es' \? 'Baja' : 'Low'/);
});

test('KEV presence and backup controls have localized Spanish labels', () => {
  assert.match(app, /lang === 'es' \? 'Sí' : 'Yes'/);
  assert.match(app, /aria-label=\{lang === 'es' \? 'Restaurar copia JSON' : 'Restore JSON backup'\}/);
  assert.match(app, /aria-label=\{lang === 'es' \? 'Comparar copia JSON' : 'Compare JSON backup'\}/);
  assert.match(app, /aria-label=\{lang === 'es' \? 'Cerrar comparación' : 'Close comparison'\}/);
});


test('document language follows the selected interface language', () => {
  assert.match(app, /document\.documentElement\.lang = lang/);
  assert.match(app, /\}, \[lang\]\)/);
});


test('severity values are localized in the vulnerability list and printable report', () => {
  assert.match(app, /const severityLabel = severity =>/);
  assert.match(app, /\{severityLabel\(f\.severity\)\}/);
  assert.match(app, /\{severityLabel\(finding\.severity\)\}/);
});


test('correlation result severity uses the localized severity label', () => {
  assert.match(app, /<td>\{severityLabel\(f\.severity\)\}<\/td>/);
});


test('overview applicability and candidate statuses are localized', () => {
  assert.match(app, /const applicabilityLabel = status =>/);
  assert.match(app, /applicabilityLabel\(f\.applicabilityStatus\)/);
  assert.match(app, /f\.state === 'KEV' \? 'KEV' : \(lang === 'es' \? 'Candidato' : 'Candidate'\)/);
});


test('source names and query statuses are localized for Spanish users', () => {
  assert.match(app, /const sourceNameLabel = source =>/);
  assert.match(app, /const sourceStatusLabel = status =>/);
  assert.match(app, /sourceNameLabel\(source\)\}: \{sourceStatusLabel\(status\)\}/);
  assert.match(app, /partial_or_unavailable: lang === 'es' \? 'parcial o no disponible'/);
});
