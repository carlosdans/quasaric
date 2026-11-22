// Playwright configuration for Quasaric tests
module.exports = {
  testDir: './tests',
  testMatch: '**/*.playwright.test.js',
  timeout: 60000,
  use: {
    baseURL: 'https://quasaric.com',
    headless: true,
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,
  },
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
  ],
};
