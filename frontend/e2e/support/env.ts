import * as path from 'path';

/** Zentrale Testkonfiguration: alles, was ein Lauf gegen eine andere Umgebung braucht. */

export const API_URL = process.env['E2E_API_URL'] ?? 'http://localhost:8085/api/v1';

/** Angemeldeter Zustand aus auth.setup.ts, den beide Browser-Projekte wiederverwenden. */
export const AUTH_STATE_FILE = path.join(__dirname, '..', '.auth', 'agent.json');

/**
 * Eigener Test-Agent statt eines Seed-Accounts: der Lauf soll sich nicht darauf
 * verlassen, dass jemand die Datenbank vorbereitet hat. Wird in auth.setup.ts
 * angelegt, falls es ihn noch nicht gibt.
 */
export const TEST_AGENT = {
  email: process.env['E2E_EMAIL'] ?? 'e2e.agent@marklerapp.test',
  password: process.env['E2E_PASSWORD'] ?? 'E2eTest1234!',
  firstName: 'E2E',
  lastName: 'Agent',
} as const;

/** Eindeutiger Suffix pro Lauf, damit Testdaten frueherer Laeufe nicht kollidieren. */
export function uniqueSuffix(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}
