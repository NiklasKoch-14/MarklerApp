import { test, expect, expectNoRawI18nKeys } from './support/test';
import { TEST_AGENT } from './support/env';

/** Smoke 1: Login mit gueltigen und ungueltigen Zugangsdaten. */
test.describe('Login', () => {
  // Dieser Ablauf beginnt bewusst abgemeldet.
  test.use({ storageState: { cookies: [], origins: [] } });

  test('weist falsche Zugangsdaten ab und bleibt auf der Login-Maske', async ({ page, errors }) => {
    // Das 401 ist hier das erwartete Ergebnis, kein Defekt.
    errors.allowNetworkFailure(/\/auth\/login .* HTTP 401$/);
    errors.allowConsoleError(/HTTP Error/);
    errors.allowConsoleError(/Failed to load resource.*401/);

    await page.goto('/auth/login');
    await expectNoRawI18nKeys(page, 'Login-Maske');

    await page.locator('form input[type="email"]').fill('niemand@example.com');
    await page.locator('form input[type="password"]').fill('FalschesPasswort1');
    await page.locator('form button[type="submit"]').click();

    const errorBox = page.locator('form [style*="color-error-soft"]');
    await expect(errorBox).toBeVisible();
    await expect(errorBox).not.toBeEmpty();
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test('meldet mit gueltigen Zugangsdaten an und landet im Dashboard', async ({ page }) => {
    await page.goto('/auth/login');

    await page.locator('form input[type="email"]').fill(TEST_AGENT.email);
    await page.locator('form input[type="password"]').fill(TEST_AGENT.password);
    await page.locator('form button[type="submit"]').click();

    await expect(page).toHaveURL(/\/dashboard/);
    await expectNoRawI18nKeys(page, 'Dashboard nach Login');
  });
});
