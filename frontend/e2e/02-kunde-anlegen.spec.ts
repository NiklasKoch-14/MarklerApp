import { test, expect, expectNoRawI18nKeys } from './support/test';
import { uniqueSuffix } from './support/env';

/** Smoke 2: Kunde anlegen -> erscheint in der Liste -> Detailseite laedt. */
test.describe('Kunde anlegen', () => {
  const createdClientIds: string[] = [];

  test.afterAll(async ({ api }) => {
    for (const id of createdClientIds) {
      await api.deleteClient(id);
    }
  });

  test('legt einen Kunden an, findet ihn in der Liste und oeffnet die Detailseite', async ({ page }) => {
    const suffix = uniqueSuffix();
    const firstName = 'Erika';
    const lastName = `Testkundin ${suffix}`;

    await page.goto('/clients/new');
    await expectNoRawI18nKeys(page, 'Kundenformular');

    await page.locator('input[formcontrolname="firstName"]').fill(firstName);
    await page.locator('input[formcontrolname="lastName"]').fill(lastName);
    await page.locator('input[formcontrolname="email"]').fill(`erika.${suffix}@marklerapp.test`);
    await page.locator('input[formcontrolname="phone"]').fill('+49 30 1234567');
    await page.locator('input[formcontrolname="addressPostalCode"]').fill('10115');
    await page.locator('input[formcontrolname="addressCity"]').fill('Berlin');

    await page.locator('form button[type="submit"]').click();

    // Das Formular leitet nach dem Speichern auf die Detailseite um.
    await expect(page).toHaveURL(/\/clients\/[0-9a-f-]{36}$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(`${firstName} ${lastName}`);
    await expectNoRawI18nKeys(page, 'Kunden-Detailseite');

    const clientId = page.url().split('/').pop()!;
    createdClientIds.push(clientId);

    await page.goto('/clients');
    await page.locator('.search-box input').fill(lastName);

    const row = page.locator('table.data tbody tr', { hasText: lastName });
    await expect(row).toHaveCount(1);

    await row.click();
    await expect(page).toHaveURL(new RegExp(`/clients/${clientId}$`));
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(`${firstName} ${lastName}`);
  });
});
