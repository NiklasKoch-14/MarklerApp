import { defineConfig, devices } from '@playwright/test';
import { AUTH_STATE_FILE } from './e2e/support/env';

/**
 * E2E-Grundgeruest (Issue #44).
 *
 * Voraussetzung fuer einen Lauf ist ein erreichbares Backend — per Default der
 * Dev-Stack aus docker-compose.dev.yml auf :8085. Der Angular-Dev-Server wird
 * ueber `webServer` selbst gestartet, ausser E2E_BASE_URL zeigt schon auf einen
 * laufenden Server.
 */

const PORT = Number(process.env['E2E_PORT'] ?? 4200);
const BASE_URL = process.env['E2E_BASE_URL'] ?? `http://localhost:${PORT}`;
const IS_CI = !!process.env['CI'];

export default defineConfig({
  testDir: './e2e',
  outputDir: './test-results',

  // Die Smoke-Tests teilen sich einen Backend-Account, und Dashboard-Listen
  // zeigen nur die juengsten N Eintraege. Parallele Worker wuerden sich dort
  // gegenseitig aus der Liste draengen, deshalb bewusst seriell.
  fullyParallel: false,
  workers: 1,

  forbidOnly: IS_CI,
  retries: IS_CI ? 1 : 0,
  timeout: 90_000,
  expect: { timeout: 15_000 },

  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
  ],

  use: {
    baseURL: BASE_URL,
    locale: 'de-DE',
    timezoneId: 'Europe/Berlin',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },

  projects: [
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
      use: { browserName: 'chromium' },
    },
    {
      name: 'desktop-chromium',
      dependencies: ['setup'],
      testIgnore: /auth\.setup\.ts/,
      use: {
        browserName: 'chromium',
        viewport: { width: 1440, height: 900 },
        storageState: AUTH_STATE_FILE,
      },
    },
    {
      // Mobile-First-Positionierung: der iPhone-Viewport ist kein Extra, sondern
      // der Haupt-Anwendungsfall.
      name: 'mobile-safari',
      dependencies: ['setup'],
      testIgnore: /auth\.setup\.ts/,
      use: {
        ...devices['iPhone 13'],
        storageState: AUTH_STATE_FILE,
      },
    },
  ],

  webServer: process.env['E2E_BASE_URL']
    ? undefined
    : {
        command: `npm start -- --port ${PORT} --host 127.0.0.1`,
        url: BASE_URL,
        reuseExistingServer: !IS_CI,
        timeout: 240_000,
        stdout: 'ignore',
        stderr: 'pipe',
      },
});
