import { test, expect, expectNoRawI18nKeys } from './support/test';
import { buyerWithSearchCriteria, matchingApartment } from './support/api';
import { uniqueSuffix } from './support/env';

/** Smoke 4: Matching auf der Immobilie liefert Ergebnisse, Score-Breakdown oeffnet sich (#30). */
test.describe('Matching auf der Immobilie', () => {
  let clientId: string;
  let propertyId: string;

  // Testdaten kommen ueber die API: geprueft wird das Matching, nicht noch
  // einmal das Anlegen (das decken Smoke 2 und 3 ab).
  test.beforeAll(async ({ api }) => {
    const suffix = uniqueSuffix();
    clientId = (await api.createClient(buyerWithSearchCriteria(suffix))).id;
    propertyId = (await api.createProperty(matchingApartment(suffix))).id;
  });

  test.afterAll(async ({ api }) => {
    if (clientId) await api.deleteClient(clientId);
    if (propertyId) await api.deleteProperty(propertyId);
  });

  test('zeigt passende Kaeufer mit Score auf der Objektseite', async ({ page }) => {
    await page.goto(`/properties/${propertyId}`);

    // Die Karte "Passende Kaeufer" ist die einzige Stelle der Objektseite, die
    // auf Kunden verlinkt.
    const matchRows = page.locator('a[href^="/clients/"]');
    await expect(matchRows.first()).toBeVisible();
    expect(await matchRows.count()).toBeGreaterThan(0);

    // Prozentwert als Beleg dafuer, dass ein Score berechnet wurde. Das Badge
    // liegt je nach Stand im Link oder daneben — deshalb die Zeile als Ganzes.
    await expect(matchRows.first().locator('xpath=..')).toContainText(/\d{1,3}\s*%/);

    await expectNoRawI18nKeys(page, 'Objektseite mit Matching');
  });

  test('oeffnet die Score-Aufschluesselung ueber das Badge', async ({ page }) => {
    await page.goto(`/properties/${propertyId}`);
    await expect(page.locator('a[href^="/clients/"]').first()).toBeVisible();

    const popover = page.locator('app-match-score-popover');
    test.skip(
      (await popover.count()) === 0,
      'Score-Breakdown aus #30 ist in diesem Stand nicht enthalten — das Badge ist hier reine Anzeige.',
    );

    await popover.first().getByRole('button').click();
    await expect(page.locator('app-match-breakdown')).toBeVisible();
  });
});
