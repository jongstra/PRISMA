import { defineConfig } from '@playwright/test';

// The browser smoke tests in e2e/ (npm run test-e2e): they build the app, serve the build on port 4173 (next to the dev
// server on 5173), and use it in the installed Chrome, without opening a window.
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:4173',
    channel: 'chrome', // the installed Chrome, so Playwright does not need to download a browser
    viewport: { width: 1400, height: 900 },
    trace: 'retain-on-failure', // after a failure: npx playwright show-trace test-results/<test>/trace.zip
  },
  webServer: {
    command: 'npm run build && npm run preview -- --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: false,
  },
});
