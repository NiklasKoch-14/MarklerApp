import { APIRequestContext, request as playwrightRequest } from '@playwright/test';
import { API_URL, TEST_AGENT } from './env';

/**
 * Duenner REST-Client fuer alles, was *nicht* der Prueflingt ist: Testdaten
 * anlegen und hinterher wieder wegraeumen. Die Ablaeufe selbst laufen im Browser.
 *
 * Absolute URLs statt `baseURL`, weil Playwright relative Pfade per `new URL()`
 * aufloest und dabei den `/api/v1`-Praefix verlieren wuerde.
 */
export class ApiClient {
  private constructor(
    private readonly ctx: APIRequestContext,
    private readonly token: string,
  ) {}

  static async create(): Promise<ApiClient> {
    const ctx = await playwrightRequest.newContext();

    // Registrierung ist absichtlich fehlertolerant: ab dem zweiten Lauf existiert
    // der Agent bereits und das Backend antwortet mit 400/409.
    await ctx.post(`${API_URL}/auth/register`, {
      data: {
        firstName: TEST_AGENT.firstName,
        lastName: TEST_AGENT.lastName,
        email: TEST_AGENT.email,
        password: TEST_AGENT.password,
        languagePreference: 'DE',
      },
      failOnStatusCode: false,
    });

    const login = await ctx.post(`${API_URL}/auth/login`, {
      data: { email: TEST_AGENT.email, password: TEST_AGENT.password },
    });
    if (!login.ok()) {
      throw new Error(
        `Login des Test-Agents fehlgeschlagen (${login.status()}): ${await login.text()}\n` +
          `Laeuft das Backend unter ${API_URL}?`,
      );
    }
    const body = (await login.json()) as { accessToken: string };
    return new ApiClient(ctx, body.accessToken);
  }

  async dispose(): Promise<void> {
    await this.ctx.dispose();
  }

  private get headers(): Record<string, string> {
    return { Authorization: `Bearer ${this.token}` };
  }

  async createClient(data: Record<string, unknown>): Promise<ClientRecord> {
    const res = await this.ctx.post(`${API_URL}/clients`, { headers: this.headers, data });
    if (!res.ok()) {
      throw new Error(`Kunde anlegen fehlgeschlagen (${res.status()}): ${await res.text()}`);
    }
    return (await res.json()) as ClientRecord;
  }

  async createProperty(data: Record<string, unknown>): Promise<PropertyRecord> {
    const res = await this.ctx.post(`${API_URL}/properties`, { headers: this.headers, data });
    if (!res.ok()) {
      throw new Error(`Immobilie anlegen fehlgeschlagen (${res.status()}): ${await res.text()}`);
    }
    return (await res.json()) as PropertyRecord;
  }

  async createCallNote(data: Record<string, unknown>): Promise<{ id: string }> {
    const res = await this.ctx.post(`${API_URL}/call-notes`, { headers: this.headers, data });
    if (!res.ok()) {
      throw new Error(`Gespraechsnotiz anlegen fehlgeschlagen (${res.status()}): ${await res.text()}`);
    }
    return (await res.json()) as { id: string };
  }

  /** Aufraeumen darf einen bereits gruenen Lauf nicht nachtraeglich rot faerben. */
  async deleteClient(id: string): Promise<void> {
    await this.ctx.delete(`${API_URL}/clients/${id}`, { headers: this.headers, failOnStatusCode: false });
  }

  async deleteProperty(id: string): Promise<void> {
    await this.ctx.delete(`${API_URL}/properties/${id}`, { headers: this.headers, failOnStatusCode: false });
  }
}

export interface ClientRecord {
  id: string;
  firstName: string;
  lastName: string;
}

export interface PropertyRecord {
  id: string;
  title: string;
}

/** Kunde mit Suchprofil — nur solche Kunden nimmt das Matching ueberhaupt in die Auswahl. */
export function buyerWithSearchCriteria(suffix: string): Record<string, unknown> {
  return {
    firstName: 'Match',
    lastName: `Kaeufer ${suffix}`,
    email: `match.${suffix}@marklerapp.test`,
    clientType: 'BUYER',
    pipelineStage: 'ACTIVE_SEARCH',
    legalBasis: 'CONTRACT_INITIATION',
    addressCity: 'Berlin',
    searchCriteria: {
      minSquareMeters: 60,
      maxSquareMeters: 120,
      minRooms: 2,
      maxRooms: 4,
      minBudget: 300000,
      maxBudget: 400000,
      propertyTypes: ['APARTMENT'],
      restrictToSearchRadius: false,
    },
  };
}

/** Passendes Objekt zum Suchprofil aus `buyerWithSearchCriteria`. */
export function matchingApartment(suffix: string): Record<string, unknown> {
  return {
    title: `Matching-Testobjekt ${suffix}`,
    propertyType: 'APARTMENT',
    listingType: 'SALE',
    status: 'AVAILABLE',
    addressStreet: 'Teststrasse',
    addressHouseNumber: '1',
    addressCity: 'Berlin',
    addressPostalCode: '10115',
    addressCountry: 'Deutschland',
    livingAreaSqm: 80,
    rooms: 3,
    price: 350000,
  };
}
