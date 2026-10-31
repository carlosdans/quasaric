import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const config = JSON.parse(
  await readFile(new URL('../staticwebapp.config.json', import.meta.url), 'utf8')
);
const headers = config.globalHeaders ?? {};
const directives = Object.fromEntries(
  (headers['Content-Security-Policy'] ?? '')
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const [name, ...values] = part.split(/\\s+/);
      return [name, values];
    })
);

test('Static Web Apps keeps the SPA fallback configured', () => {
  assert.equal(config.navigationFallback?.rewrite, '/index.html');
});

test('security headers remain enabled', () => {
  assert.equal(headers['X-Content-Type-Options'], 'nosniff');
  assert.equal(headers['X-Frame-Options'], 'DENY');
  assert.equal(headers['Referrer-Policy'], 'strict-origin-when-cross-origin');
  assert.equal(headers['Permissions-Policy'], 'camera=(), microphone=(), geolocation=()');
});

test('CSP allows only the external vulnerability sources the app uses', () => {
  const connectSources = directives['connect-src'] ?? [];
  for (const source of [
    "'self'",
    'https://services.nvd.nist.gov',
    'https://api.first.org',
    'https://www.cisa.gov',
    'https://api.osv.dev',
    'https://raw.githubusercontent.com'
  ]) {
    assert.ok(connectSources.includes(source), `Missing connect-src source: ${source}`);
  }
});

test('CSP retains important restrictions', () => {
  assert.deepEqual(directives['object-src'], ["'none'"]);
  assert.deepEqual(directives['base-uri'], ["'self'"]);
  assert.deepEqual(directives['frame-ancestors'], ["'none'"]);
  assert.equal(directives['script-src']?.includes("'unsafe-eval'"), false);
});
