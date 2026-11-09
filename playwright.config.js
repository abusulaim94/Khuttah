import {defineConfig} from '@playwright/test';

export default defineConfig({
  testDir: './tests/browser',
  fullyParallel: false,
  workers: 1,
  timeout: 45000,
  use: {baseURL: 'http://127.0.0.1:5175', headless: true, channel: process.platform === 'win32' ? 'chrome' : undefined, viewport: {width: 1440, height: 1000}, trace: 'retain-on-failure'},
  webServer: {command: 'npm run dev -- --port 5175 --strictPort', url: 'http://127.0.0.1:5175', reuseExistingServer: !process.env.CI},
});
