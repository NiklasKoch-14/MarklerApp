import { test, expect, expectNoRawI18nKeys } from './support/test';
import { uniqueSuffix } from './support/env';

/** Smoke 5: Gespraechsnotiz mit Follow-up speichern -> taucht im Dashboard auf. */
test.describe('Gespraechsnotiz', () => {
  const createdClientIds: string[] = [];

  test.afterAll(async ({ api }) => {
    for (const id of createdClientIds) {
      await api.deleteClient(id);
    }
  });

  test('speichert eine Notiz am Kunden und zeigt sie samt Follow-up im Dashboard', async ({ page, api }) => {
    const suffix = uniqueSuffix();
    const subject = `Rueckruf ${suffix}`;
    const followUpSubject = `Nachfassen ${suffix}`;

    const client = await api.createClient({
      firstName: 'Notiz',
      lastName: `Kunde ${suffix}`,
      clientType: 'BUYER',
      pipelineStage: 'ACTIVE_SEARCH',
      legalBasis: 'CONTRACT_INITIATION',
    });
    createdClientIds.push(client.id);

    await page.goto(`/clients/${client.id}`);
    await expectNoRawI18nKeys(page, 'Kunden-Detailseite');

    await page.getByRole('button', { name: 'Neue Notiz' }).click();

    const dialog = page.locator('.detail-modal-card');
    await expect(dialog).toBeVisible();
    await expectNoRawI18nKeys(page, 'Notizdialog');

    await dialog.locator('input[type="text"]').first().fill(subject);
    await dialog.locator('textarea').fill('Kunde moechte zwei Objekte besichtigen.');
    await dialog.locator('select').first().selectOption('PHONE_OUTBOUND');

    await dialog.locator('button.btn-primary').click();
    await expect(dialog).toBeHidden();

    // Der Follow-up-Termin laesst sich im Dialog nur setzen, wenn die
    // Spracherkennung einen erkannt hat — ueber Tastatur und Maus gibt es dafuer
    // kein Feld. Der zweite Teil des Ablaufs wird deshalb ueber die API angelegt,
    // geprueft wird wie beim ersten Teil die Anzeige im Dashboard.
    // CallNote lehnt Follow-up-Termine in der Vergangenheit ab (@PrePersist).
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    await api.createCallNote({
      clientId: client.id,
      callDate: new Date().toISOString().slice(0, 19),
      callType: 'PHONE_OUTBOUND',
      subject: followUpSubject,
      notes: 'Angebot nachfassen.',
      followUpRequired: true,
      followUpDate: tomorrow,
      outcome: 'INTERESTED',
    });

    await page.goto('/dashboard');
    await expectNoRawI18nKeys(page, 'Dashboard');

    // Reiter "Offene Nachfassaktionen" ist der Startzustand der Karte.
    await expect(page.getByText(followUpSubject)).toBeVisible();

    await page.locator('button.view-tab', { hasText: /Letzte Aktivit/ }).click();
    await expect(page.getByText(subject)).toBeVisible();
  });
});
