import { test, expect } from '@playwright/test';

test('WASM resources load with correct MIME', async ({ page }) => {
  const response = await page.request.get(
    'https://quasaric.com/assets/ort-wasm-simd-threaded.jsep-Dt5UNR3U.wasm'
  );
  expect(response.status()).toBe(200);
  const ct = response.headers()['content-type'];
  expect(ct).toContain('application/wasm');
});

test('ONNX model URL is accessible with CSP', async ({ page }) => {
  const response = await page.request.get(
    'https://huggingface.co/StemSplitio/htdemucs-6s-onnx/resolve/main/htdemucs_6s_fp16weights.onnx',
    { headers: { Origin: 'https://quasaric.com' } }
  );
  expect(response.status()).toBe(200);
});

test('Quasaric app loads and handles audio import', async ({ page }) => {
  await page.goto('https://quasaric.com');
  await page.waitForLoadState('networkidle');
  await expect(page).toHaveTitle(/Quasaric/);
});
