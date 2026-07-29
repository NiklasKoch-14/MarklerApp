import { test as base, expect } from '@playwright/test';
import { ApiClient } from './api';
import { API_URL } from './env';
import { expectNoRawI18nKeys } from './i18n-guard';

/**
 * Erlaubnisliste fuer Fehler, die ein Test bewusst provoziert — etwa das 401
 * beim Login-Test mit falschen Zugangsdaten.
 */
export class ErrorGuard {
  readonly consoleErrors: string[] = [];
  readonly networkFailures: string[] = [];
  private readonly allowedConsole: RegExp[] = [];
  private readonly allowedNetwork: RegExp[] = [];

  allowConsoleError(pattern: RegExp | string): void {
    this.allowedConsole.push(toRegExp(pattern));
  }

  allowNetworkFailure(pattern: RegExp | string): void {
    this.allowedNetwork.push(toRegExp(pattern));
  }

  recordConsoleError(message: string): void {
    if (this.allowedConsole.some(p => p.test(message))) return;
    this.consoleErrors.push(message);
  }

  recordNetworkFailure(message: string): void {
    if (this.allowedNetwork.some(p => p.test(message))) return;
    this.networkFailures.push(message);
  }
}

function toRegExp(pattern: RegExp | string): RegExp {
  return typeof pattern === 'string' ? new RegExp(escapeRegExp(pattern)) : pattern;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

type Fixtures = {
  errors: ErrorGuard;
};

type WorkerFixtures = {
  api: ApiClient;
};

export const test = base.extend<Fixtures, WorkerFixtures>({
  api: [
    async ({}, use) => {
      const client = await ApiClient.create();
      await use(client);
      await client.dispose();
    },
    { scope: 'worker' },
  ],

  errors: async ({}, use) => {
    await use(new ErrorGuard());
  },

  page: async ({ page, errors, baseURL }, use, testInfo) => {
    // Nur eigene Herkuenfte pruefen. Google Fonts, remixicon und das
    // Google-Identity-Skript haengen am Netz des ausfuehrenden Rechners und
    // sagen nichts ueber die Anwendung aus.
    const ownOrigins = [baseURL, API_URL]
      .filter((value): value is string => !!value)
      .map(value => new URL(value).origin);
    const isOwn = (url: string): boolean => {
      try {
        return ownOrigins.includes(new URL(url).origin);
      } catch {
        return false;
      }
    };

    page.on('console', msg => {
      if (msg.type() !== 'error') return;
      // Meldungen aus Fremdskripten (z. B. Google Identity Services, das die
      // Test-Origin nicht kennt) sagen nichts ueber die Anwendung aus.
      const source = msg.location().url;
      if (source && !isOwn(source)) return;
      errors.recordConsoleError(`console.error: ${msg.text()}`);
    });

    page.on('pageerror', error => {
      errors.recordConsoleError(`pageerror: ${error.message}`);
    });

    page.on('requestfailed', request => {
      const url = request.url();
      if (!isOwn(url)) return;
      const failure = request.failure()?.errorText ?? 'unbekannt';
      // Abgebrochene Requests sind der Normalfall beim Navigieren.
      if (failure.includes('ERR_ABORTED')) return;
      errors.recordNetworkFailure(`${request.method()} ${url} — ${failure}`);
    });

    page.on('response', response => {
      const url = response.url();
      if (!isOwn(url)) return;
      if (response.status() < 400) return;
      errors.recordNetworkFailure(`${response.request().method()} ${url} — HTTP ${response.status()}`);
    });

    await use(page);

    if (errors.consoleErrors.length > 0) {
      await testInfo.attach('console-errors.txt', { body: errors.consoleErrors.join('\n') });
    }
    if (errors.networkFailures.length > 0) {
      await testInfo.attach('network-failures.txt', { body: errors.networkFailures.join('\n') });
    }

    if (!page.isClosed()) {
      await expectNoRawI18nKeys(page, 'Endzustand des Tests');
    }

    expect(errors.consoleErrors, 'Konsolenfehler waehrend des Tests').toEqual([]);
    expect(errors.networkFailures, 'Fehlgeschlagene Requests an die eigene Anwendung').toEqual([]);
  },
});

export { expect };
export { expectNoRawI18nKeys };
