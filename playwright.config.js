// Browser tests: `npm test` (serves the repo on :8765 with Python's static server).
// Locally in the Claude cloud container set PW_CHROMIUM=/opt/pw-browsers/chromium-1194/chrome-linux/chrome.
const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: 'tests',
  timeout: 90000,
  fullyParallel: true,
  workers: process.env.CI ? 2 : 4,
  reporter: process.env.CI ? [['list'], ['github']] : 'list',
  use: {
    baseURL: 'http://localhost:8765/',
    viewport: { width: 440, height: 956 },
    serviceWorkers: 'block',
    launchOptions: { executablePath: process.env.PW_CHROMIUM || undefined, args: ['--headless=new'] },
  },
  webServer: {
    command: 'python3 -m http.server 8765',
    url: 'http://localhost:8765/index.html',
    reuseExistingServer: true,
    stderr: 'ignore', // request log
  },
});
