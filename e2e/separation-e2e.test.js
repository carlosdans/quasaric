import { test, expect } from '@playwright/test';

test.setTimeout(120000);

test('ONNX Separation Test', async ({ page }) => {
  const logs = [];
  page.on('console', msg => logs.push('[Console] ' + msg.text()));
  page.on('pageerror', err => logs.push('[Page Error] ' + err.message));

  // Navigate
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
  logs.push('[Step 1] Page loaded');

  // Navigate to player
  const tryButton = page.locator('button:has-text("🎵")').or(page.locator('a:has-text("Probar Quasaric")'));
  await tryButton.first().click();
  await page.waitForTimeout(1000);
  logs.push('[Step 2] Player loaded');

  // Generate test WAV and upload directly in browser context
  const success = await page.evaluate(() => {
    return new Promise((resolve, reject) => {
      const sampleRate = 44100;
      const duration = 15;
      const numSamples = sampleRate * duration;
      
      // Create WAV buffer
      const buffer = new ArrayBuffer(44 + numSamples * 4);
      const view = new DataView(buffer);
      
      // WAV header
      view.setUint8(0, 0x52); view.setUint8(1, 0x49); view.setUint8(2, 0x46); view.setUint8(3, 0x46);
      view.setUint32(4, 44 + numSamples * 4, true);
      view.setUint8(8, 0x57); view.setUint8(9, 0x41); view.setUint8(10, 0x56); view.setUint8(11, 0x45);
      view.setUint8(12, 0x66); view.setUint8(13, 0x6D); view.setUint8(14, 0x74); view.setUint8(15, 0x20);
      view.setUint32(16, 16, true);
      view.setUint16(20, 1, true);
      view.setUint16(22, 2, true);
      view.setUint32(24, sampleRate, true);
      view.setUint32(28, sampleRate * 4, true);
      view.setUint16(32, 4, true);
      view.setUint16(34, 16, true);
      view.setUint8(36, 0x64); view.setUint8(37, 0x61); view.setUint8(38, 0x74); view.setUint8(39, 0x61);
      view.setUint32(40, numSamples * 4, true);
      
      // Audio data: 440Hz + 880Hz tones
      for (let i = 0; i < numSamples; i++) {
        const t = i / sampleRate;
        const sample = 0.3 * (Math.sin(440 * 2 * Math.PI * t) + 0.5 * Math.sin(880 * 2 * Math.PI * t));
        view.setInt16(44 + i * 4, sample * 0x7FFF, true);
        view.setInt16(44 + i * 4 + 2, sample * 0x7FFF, true);
      }
      
      // Create file input and upload
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'audio/*';
      
      const blob = new Blob([buffer], { type: 'audio/wav' });
      const file = new File([blob], 'test_audio.wav', { type: 'audio/wav' });
      
      input.files = [file];
      document.body.appendChild(input);
      input.click();
      
      setTimeout(() => {
        document.body.removeChild(input);
        resolve(true);
      }, 100);
    });
  });

  console.log('Audio upload completed');
  logs.push('[Step 3] WAV uploaded');

  await page.waitForTimeout(1000);

  // Click separate
  const separateBtn = page.locator('button:has-text("🎛️")');
  await separateBtn.waitFor({ state: 'visible', timeout: 15000 });
  await separateBtn.click();
  logs.push('[Step 4] Separation started');

  // Wait for ONNX pipeline
  await page.waitForTimeout(60000);
  logs.push('[Step 5] Waited 60s for inference');

  // Check for stems
  const stemSelectors = '[data-stem], .stem-item, .stem-name, [role="slider"]';
  const stemCount = await page.locator(stemSelectors).all().then(arr => arr.length);
  logs.push('[Step 6] Stem count: ' + stemCount);

  console.log('Console logs:', logs);
  
  const report = { timestamp: new Date().toISOString(), url: page.url(), logs, stem_count: stemCount };
  fs.writeFileSync('separation-report.json', JSON.stringify(report, null, 2));
  console.log('Report saved to separation-report.json');

  expect(stemCount).toBeGreaterThan(0);
  logs.push('[Step 7] SEPARATION COMPLETED SUCCESSFULLY');
});
