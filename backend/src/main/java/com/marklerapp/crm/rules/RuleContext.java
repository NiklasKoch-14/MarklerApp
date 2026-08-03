package com.marklerapp.crm.rules;

/**
 * Alles, was eine Regel zur Bewertung braucht — Zustand vorher, beabsichtigte Aenderung
 * und die bereits geladenen Nachbardaten. Regeln greifen nie selbst auf Repositories zu:
 * das macht sie ohne Mocks testbar und haelt die Ladelogik an einer Stelle.
 */
public sealed interface RuleContext permits PropertyStatusChange, ViewingChange {
}
