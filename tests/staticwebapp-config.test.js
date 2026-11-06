import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const config = JSON.parse(await readFile(new URL('../staticwebapp.config.json', import.meta.url), 'utf8'));
const vulnerabilitySources = await readFile(new URL('../src/lib/vulnerabilitySources.js', import.meta.url), 'utf8');
const headers = config.globalHeaders ?? {};
const directives = Object.fromEntries((headers['Content-Security-Policy'] ?? '').split(';').map(part=>part.trim()).filter(Boolean).map(part=>{
  const [name,...values]=part.split(/\s+/); return [name,values];
}));
test('Static Web Apps keeps the SPA fallback configured',()=>assert.equal(config.navigationFallback?.rewrite,'/index.html'));
test('security headers remain enabled',()=>{
  assert.equal(headers['X-Content-Type-Options'],'nosniff');
  assert.equal(headers['X-Frame-Options'],'DENY');
  assert.equal(headers['Referrer-Policy'],'strict-origin-when-cross-origin');
  assert.equal(headers['Permissions-Policy'],'camera=(), microphone=(), geolocation=()');
  assert.equal(headers['Strict-Transport-Security'],'max-age=31536000');
  assert.equal(headers['X-Permitted-Cross-Domain-Policies'],'none');
});
test('CSP allows every external vulnerability API used by the application',()=>{
  const connectSources=directives['connect-src']??[];
  for(const source of [
    "'self'",'https://services.nvd.nist.gov','https://api.first.org','https://www.cisa.gov',
    'https://api.osv.dev','https://access.redhat.com','https://raw.githubusercontent.com',
    'https://apollo.build.resf.org','https://ftp.suse.com'
  ]) assert.ok(connectSources.includes(source),`Missing connect-src source: ${source}`);
});
test('CSP retains important restrictions',()=>{
  assert.deepEqual(directives['object-src'],["'none'"]);
  assert.deepEqual(directives['base-uri'],["'self'"]);
  assert.deepEqual(directives['frame-ancestors'],["'none'"]);
  assert.equal(directives['script-src']?.includes("'unsafe-eval'"),false);
});


test('CSP connect-src covers every HTTPS origin used by vulnerability source adapters', () => {
  const connectSources = new Set(directives['connect-src'] ?? []);
  const origins = [...new Set(
    [...vulnerabilitySources.matchAll(/https:\/\/[a-z0-9.-]+/gi)].map(match => match[0].toLowerCase())
  )];
  assert.ok(origins.length > 0, 'Expected to find external source origins.');
  for (const origin of origins) {
    assert.ok(connectSources.has(origin), `CSP connect-src does not allow source adapter origin: ${origin}`);
  }
});
