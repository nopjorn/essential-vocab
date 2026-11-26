// Browser tests: `npm test` (serves the repo on :8765 with tests/serve.py, Python's static server with a longer queue).
// Locally in the Claude cloud container set PW_CHROMIUM=/opt/pw-browsers/chromium-1243/chrome-linux64/chrome.
const { defineConfig } = require('@playwright/test');

// 1.264.2: every run counts time in UTC, like CI (GitHub runners). Tests build dates with toISOString() (a UTC day) while the app
// counts days in the browser's local time, so on a PC in Thailand (UTC+7) the two were a day apart from midnight to 7 am.
// TZ = this Node process and the workers it starts; timezoneId (below) = the browser.
process.env.TZ = 'UTC';

module.exports = defineConfig({
  testDir: 'tests',
  timeout: 90000,
  fullyParallel: true,
  workers: 4, // 1.264.5: CI too (GitHub's runners for public repos have 4 CPUs; it used 2)
  reporter: process.env.CI ? [['list'], ['github']] : 'list',
  use: {
    baseURL: 'http://localhost:8765/',
    viewport: { width: 440, height: 956 },
    timezoneId: 'UTC',
    serviceWorkers: 'block',
    launchOptions: { executablePath: process.env.PW_CHROMIUM || undefined, args: ['--headless=new'] },
  },
  webServer: {
    command: 'python3 tests/serve.py 8765', // http.server with a long listen queue (1.264.4, see the file)
    url: 'http://localhost:8765/index.html',
    reuseExistingServer: true,
    stderr: 'ignore', // request log
  },
});
