import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const main = await readFile(new URL('../src/main.jsx', import.meta.url), 'utf8');
const styles = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8');

test('the application is protected by a localized React error boundary', () => {
  assert.match(main, /class AppErrorBoundary extends React\.Component/);
  assert.match(main, /static getDerivedStateFromError/);
  assert.match(main, /<AppErrorBoundary>[\s\S]*?<App \/>[\s\S]*?<\/AppErrorBoundary>/);
  assert.match(main, /document\.documentElement\.lang === 'en'/);
  assert.match(main, /window\.location\.reload\(\)/);
  assert.match(main, /role="alert" aria-labelledby="app-error-title"/);
});

test('the error fallback remains visible and keyboard accessible', () => {
  assert.match(styles, /\.app-error\{/);
  assert.match(styles, /\.app-error button:focus-visible\{/);
});
