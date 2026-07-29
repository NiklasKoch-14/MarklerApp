import { test, expect, expectNoRawI18nKeys } from './support/test';
import { uniqueSuffix } from './support/env';

/** Smoke 6: Pipeline-Stage per Kanban aendern -> bleibt nach Reload bestehen. */
test.describe('Pipeline-Kanban', () => {
  const createdClientIds: string[] = [];

  test.afterAll(async ({ api }) => {
    for (const id of createdClientIds) {
      await api.deleteClient(id);
    }
  });

  test('zieht eine Karte in eine andere Phase und haelt sie nach dem Reload', async ({ page, api, isMobile }) => {
    // Das CDK-Drag&Drop haengt an Maus-Events. Auf einem Touch-Viewport laesst
    // es sich mit Playwright nicht ehrlich nachstellen, deshalb hier kein
    // Scheingruen.
    test.skip(!!isMobile, 'Kanban-Drag&Drop ist auf Touch-Viewports nicht per Playwright steuerbar.');

    const suffix = uniqueSuffix();
    const lastName = `Kanban ${suffix}`;

    const client = await api.createClient({
      firstName: 'Phasen',
      lastName,
      clientType: 'BUYER',
      pipelineStage: 'PROSPECT',
      legalBasis: 'CONTRACT_INITIATION',
    });
    createdClientIds.push(client.id);

    await page.goto('/dashboard');
    await page.locator('button.view-tab', { hasText: 'Pipeline' }).click();
    await expectNoRawI18nKeys(page, 'Pipeline-Ansicht');

    const card = page.locator('#pipeline-col-PROSPECT .cdk-drag', { hasText: lastName });
    await expect(card).toHaveCount(1);
    await card.scrollIntoViewIfNeeded();

    const target = page.locator('#pipeline-col-ACTIVE_SEARCH');
    const from = await card.boundingBox();
    const to = await target.boundingBox();
    expect(from, 'Kanban-Karte nicht sichtbar').not.toBeNull();
    expect(to, 'Zielspalte nicht sichtbar').not.toBeNull();

    const stageUpdate = page.waitForResponse(
      response => response.url().includes(`/clients/${client.id}/pipeline-stage`) && response.request().method() === 'PATCH',
    );

    // In mehreren Schritten, weil das CDK erst ab einer Mindestdistanz vom
    // Klick auf Drag umschaltet.
    await page.mouse.move(from!.x + from!.width / 2, from!.y + from!.height / 2);
    await page.mouse.down();
    await page.mouse.move(from!.x + from!.width / 2 + 15, from!.y + from!.height / 2 + 15, { steps: 5 });
    await page.mouse.move(to!.x + to!.width / 2, to!.y + Math.min(40, to!.height / 2), { steps: 20 });
    await page.mouse.up();

    const response = await stageUpdate;
    expect(response.ok(), 'Phasenwechsel wurde nicht gespeichert').toBeTruthy();

    await page.reload();
    // Die Ansicht startet immer auf "Karten"; der Reiter muss erneut gewaehlt werden.
    await page.locator('button.view-tab', { hasText: 'Pipeline' }).click();

    await expect(page.locator('#pipeline-col-ACTIVE_SEARCH .cdk-drag', { hasText: lastName })).toHaveCount(1);
    await expect(page.locator('#pipeline-col-PROSPECT .cdk-drag', { hasText: lastName })).toHaveCount(0);
  });
});
