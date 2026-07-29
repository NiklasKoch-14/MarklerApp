import { test as setup, expect } from './support/test';
import { AUTH_STATE_FILE, TEST_AGENT } from './support/env';

/**
 * Meldet den Test-Agenten einmal pro Lauf ueber die echte Login-Maske an und
 * legt den Zustand ab. Die Smoke-Tests starten damit angemeldet, statt sechsmal
 * denselben Login zu wiederholen.
 *
 * `api` sorgt nebenbei dafuer, dass es den Agenten ueberhaupt gibt.
 */
setup('Test-Agent anmelden und Sitzung sichern', async ({ page, api }) => {
  expect(api).toBeDefined();

  await page.goto('/auth/login');

  await page.locator('form input[type="email"]').fill(TEST_AGENT.email);
  await page.locator('form input[type="password"]').fill(TEST_AGENT.password);
  await page.locator('form button[type="submit"]').click();

  await expect(page).toHaveURL(/\/dashboard/);

  // Sprache festnageln: ohne explizite Wahl entscheidet die Browser-Locale, und
  // eine halb deutsche, halb englische Oberflaeche macht Textpruefungen wacklig.
  await page.evaluate(() => localStorage.setItem('app-language', 'de'));

  await page.context().storageState({ path: AUTH_STATE_FILE });
});
