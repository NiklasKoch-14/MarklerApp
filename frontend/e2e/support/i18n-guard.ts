import { expect, Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Setzt die i18n-Regel aus CLAUDE.md automatisiert durch: wenn ngx-translate
 * einen Key nicht aufloesen kann, rendert es den Key selbst — auf dem Schirm
 * steht dann `clients.foo.bar` statt "Kunden".
 *
 * Ein reiner Punkt-Pattern-Test wuerde an Text wie "z.B." oder "marklerapp.de"
 * haengenbleiben. Deshalb muss das erste Segment ein echter Top-Level-Namespace
 * aus de.json sein — damit bleiben nur Treffer uebrig, die wirklich Keys sind.
 */

const DE_JSON = path.join(__dirname, '..', '..', 'src', 'assets', 'i18n', 'de.json');

const namespaces: string[] = (() => {
  const raw = JSON.parse(fs.readFileSync(DE_JSON, 'utf8')) as Record<string, unknown>;
  return Object.keys(raw);
})();

export async function findRawI18nKeys(page: Page): Promise<string[]> {
  return page.evaluate((ns: string[]) => {
    const known = new Set(ns);
    const keyLike = /^[a-z][a-zA-Z0-9]*(?:\.[a-zA-Z0-9_]+)+$/;
    const found = new Set<string>();

    const check = (raw: string): void => {
      for (const token of raw.split(/\s+/)) {
        const trimmed = token.replace(/^[^a-zA-Z0-9]+/, '').replace(/[^a-zA-Z0-9_.]+$/, '');
        if (!keyLike.test(trimmed)) continue;
        if (!known.has(trimmed.split('.')[0])) continue;
        found.add(trimmed);
      }
    };

    check(document.body.innerText ?? '');

    // Platzhalter sind sichtbarer Text, stehen aber nicht in innerText.
    document.querySelectorAll<HTMLElement>('[placeholder]').forEach(el => {
      if (el.offsetParent === null) return;
      check(el.getAttribute('placeholder') ?? '');
    });

    return [...found];
  }, namespaces);
}

/** Schlaegt fehl, sobald ein unaufgeloester Uebersetzungsschluessel sichtbar ist. */
export async function expectNoRawI18nKeys(page: Page, context = ''): Promise<void> {
  const keys = await findRawI18nKeys(page);
  expect(
    keys,
    `Unaufgeloeste Uebersetzungsschluessel sichtbar${context ? ` (${context})` : ''} auf ${page.url()}`,
  ).toEqual([]);
}
