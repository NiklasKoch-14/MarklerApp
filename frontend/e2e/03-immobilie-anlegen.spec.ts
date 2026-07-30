import { test, expect, expectNoRawI18nKeys } from './support/test';
import { uniqueSuffix } from './support/env';

/** Smoke 3: Immobilie inkl. Pflichtfeldern anlegen -> erscheint in der Liste. */
test.describe('Immobilie anlegen', () => {
  const createdPropertyIds: string[] = [];

  test.afterAll(async ({ api }) => {
    for (const id of createdPropertyIds) {
      await api.deleteProperty(id);
    }
  });

  test('legt eine Immobilie mit allen Pflichtfeldern an und findet sie in der Liste', async ({ page }) => {
    const suffix = uniqueSuffix();
    const title = `Testobjekt ${suffix}`;

    await page.goto('/properties/new');
    await expectNoRawI18nKeys(page, 'Immobilienformular');

    // Pflichtfelder laut PropertyFormComponent: Titel, Typ, Vermarktungsart,
    // Strasse, Stadt, PLZ.
    await page.locator('#title').fill(title);
    await page.locator('#propertyType').selectOption('APARTMENT');
    await page.locator('#listingType').selectOption('SALE');
    await page.locator('#addressStreet').fill('Teststrasse');
    await page.locator('#addressCity').fill('Berlin');
    await page.locator('#addressPostalCode').fill('10115');
    await page.locator('#price').fill('350000');

    const submit = page.locator('form button[type="submit"]');
    await expect(submit).toBeEnabled();
    await submit.click();

    await expect(page).toHaveURL(/\/properties\/[0-9a-f-]{36}$/);
    createdPropertyIds.push(page.url().split('/').pop()!);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(title);
    await expectNoRawI18nKeys(page, 'Immobilien-Detailseite');

    await page.goto('/properties');
    await page.locator('.search-box input').fill(title);

    const row = page.locator('table.data tbody tr', { hasText: title });
    await expect(row).toHaveCount(1);
  });
});
