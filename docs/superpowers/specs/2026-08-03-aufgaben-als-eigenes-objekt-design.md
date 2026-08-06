# Aufgaben als eigenes Objekt — Entwurf

**Datum**: 2026-08-03
**Status**: entworfen, nicht umgesetzt
**Issue**: #33
**Betrifft**: `entity/Task` (neu), `CallNoteService`, `ClientService`, Dashboard, Kunden- und
Objekt-Detailseite

---

## Ausgangslage

Der USP der App ist „das CRM, das Einzelkämpfern sagt, wen sie heute anrufen müssen". Das
Gedächtnis dafür hängt an einem einzigen Feldpaar in `CallNote`:

```java
@Column(name = "follow_up_required") private Boolean followUpRequired = false;
@Column(name = "follow_up_date")     private LocalDate followUpDate;
```

Drei Lücken folgen daraus:

1. **Ohne Telefonat kein Follow-up.** Eine Aufgabe entsteht nur als Nebenprodukt einer
   Gesprächsnotiz. „Grundbuchauszug anfordern", „Notartermin vorbereiten" haben kein Zuhause.
2. **Kein Objektbezug.** Follow-ups hängen am Kunden, nie an einer Immobilie — obwohl ein
   großer Teil der Maklerarbeit objektbezogen ist.
3. **Keine Zwischenzustände.** Kein Verschieben, keine Historie über Erledigtes.

Erschwerend: `CallNoteRepository.findCallNotesRequiringFollowUp()` und `findOverdueFollowUps()`
sind die einzigen Abfragen, aus denen die Tagesliste entsteht. Jede künftige Auswertung über
„offene Arbeit" müsste an denselben zwei Feldern hängen.

## Entscheidungen

**`Task` wird die alleinige Quelle** für „was steht heute an". Die Alternative — zwei Quellen im
Frontend mischen — wäre risikoärmer gewesen, hätte aber dauerhaft zwei Wahrheiten bedeutet: zwei
Abfragen, zwei Erledigen-Wege, und jede spätere Auswertung müsste beide kennen.

**Das Erledigen richtet sich nach der Art der Aufgabe.** Heute erzwingt das Dashboard beim
Abschließen eines Follow-ups ein Gesprächsergebnis und eine Notiz — sinnvoll für einen Rückruf,
sinnlos für „Grundbuchauszug anfordern". Ein Klick hakt künftig ab; das Gespräch zu notieren ist
die danebenstehende Zusatzoption. Der häufigste Fall kostet einen Klick, der wertvollste bleibt
einen Klick entfernt.

**Kein `priority`, keine Wiederholung.** Für einen Einzelkämpfer *ist* das Fälligkeitsdatum die
Priorität; ein zweites Feld daneben wird entweder nie gesetzt oder alles wird „hoch".
Wiederkehrende Aufgaben brauchen Wiederholungsregel, Instanzerzeugung und einen Umgang mit
übersprungenen Terminen — ein eigenes Thema, wenn sich der Bedarf im Betrieb zeigt.

---

## Datenmodell

```sql
CREATE TABLE tasks (
    id                  UUID PRIMARY KEY,
    agent_id            UUID NOT NULL REFERENCES agents(id),
    client_id           UUID REFERENCES clients(id),
    property_id         UUID REFERENCES properties(id),
    title               VARCHAR(200)  NOT NULL,
    description         VARCHAR(2000),
    due_date            DATE          NOT NULL,
    status              VARCHAR(16)   NOT NULL,   -- OPEN | DONE
    completed_at        TIMESTAMP,
    source_call_note_id UUID REFERENCES call_notes(id),
    created_at          TIMESTAMP     NOT NULL,
    updated_at          TIMESTAMP     NOT NULL
);

CREATE INDEX idx_tasks_agent_due ON tasks (agent_id, status, due_date);
```

Nächste freie Nummer: **V38**.

Der Index bedient genau die heiße Abfrage — *was ist für diesen Agenten offen und fällig*. Beide
Bezüge sind nullable: eine Aufgabe kann an einem Kunden hängen, an einem Objekt, an beidem oder
an keinem von beiden.

`due_date` ist `NOT NULL`. Eine Aufgabe ohne Fälligkeit taucht in keiner Liste auf und ist
deshalb keine Aufgabe, sondern eine Notiz.

**Löschung**: `ClientService.deleteClient()` räumt verknüpfte Daten orchestriert ab und schreibt
ein Audit-Protokoll (DSGVO). Aufgaben müssen dort mit hinein — eine Datenbank-Kaskade allein
würde am Protokoll vorbeilaufen.

---

## Die eine Wahrheit, und wie die Notiz weiter hineinschreibt

`CallNote.followUpRequired` / `followUpDate` bleiben als **Eingabefeld** im bestehenden
Notizformular erhalten, werden aber von keiner Abfrage mehr gelesen. `CallNoteService` spiegelt
sie in eine `Task`:

| Vorgang an der Notiz | Folge für die Aufgabe |
|---|---|
| Follow-up gesetzt | Aufgabe anlegen — Titel aus `subject`, `source_call_note_id` gesetzt, Kunde und Objekt der Notiz übernommen |
| Datum geändert | Fälligkeit der verknüpften **offenen** Aufgabe mitziehen |
| Haken entfernt | verknüpfte **offene** Aufgabe löschen; eine bereits erledigte bleibt als Historie stehen |

Das gewohnte Formular bleibt unangetastet, und trotzdem gibt es nur eine Liste, die zählt.

Der Titel wird **einmal bei der Anlage** aus `subject` übernommen und danach nicht mehr
nachgeführt. Wer die Aufgabe umbenennt, hat einen Grund dafür; ein späterer Betreff-Wechsel an
der Notiz darf ihn nicht überschreiben.

**Backfill** in derselben Migration: jede Notiz mit `follow_up_required = true` und gesetztem
Datum wird eine offene Aufgabe. Titel aus `subject`; ist es leer, greift `'Rückruf'` als
neutraler Titel. `source_call_note_id` wird gesetzt, damit die Herkunft nachvollziehbar bleibt.

Die alten Repository-Methoden `findCallNotesRequiringFollowUp()` und `findOverdueFollowUps()`
verlieren damit ihre Aufrufer und werden entfernt — eine ungenutzte Abfrage auf Feldern, die
niemand mehr liest, ist eine Falle für den Nächsten.

---

## API

```
POST   /tasks                       anlegen
PUT    /tasks/{id}                  ändern
DELETE /tasks/{id}                  löschen
GET    /tasks/due                   heute + überfällig, aufsteigend nach Fälligkeit
GET    /tasks?clientId=…            Aufgaben eines Kunden
GET    /tasks?propertyId=…          Aufgaben eines Objekts
POST   /tasks/{id}/complete         Body optional: { outcome, note }
POST   /tasks/{id}/postpone         Body: { dueDate }
```

`complete` ohne Body hakt ab. Mit `outcome` und `note` legt derselbe Aufruf zusätzlich eine
Gesprächsnotiz an und verknüpft sie — **in einer Transaktion**. Zwei getrennte Aufrufe könnten
halb scheitern und eine erledigte Aufgabe ohne die Notiz hinterlassen, die ihren Wert ausmacht.

Jede Methode nimmt die `agentId` und prüft sie über `OwnershipValidator` — bei `client_id` und
`property_id` zusätzlich, dass der referenzierte Datensatz demselben Agenten gehört. Sonst wäre
die Aufgabe ein Weg, fremde Datensätze zu adressieren.

---

## Frontend

**Dashboard.** Die bestehende Karte mit drei Reitern bleibt; der Reiter „Follow-ups" wird
**„Heute zu tun"** und liest Aufgaben statt Notizen. Der vorhandene Abschluss-Dialog mit
Gesprächsergebnis und Notiz wird wiederverwendet — er hängt künftig am zweiten Knopf.

Pro Zeile: Titel, Fälligkeit, Kunden- bzw. Objektbezug als Deeplink, und drei Aktionen —
abhaken, „Erledigt + Gespräch notieren" (nur bei Kundenbezug), verschieben. Verschieben bietet
„Morgen" und „Nächste Woche" als Schnellwahl plus freie Datumsauswahl.

**Detailseiten.** „+ Aufgabe" auf Kunden- und Objekt-Detailseite, mit vorbelegtem Bezug, plus
die Liste der offenen Aufgaben dieses Datensatzes.

Styling nach ADR 0001, Buttons nach Issue #28, sämtliche Texte über `de.json` und `en.json`.

---

## Folge für #46

Stufe 4 der Workflow-Guardrails hatte zwei Regeln an `CallNote` hängen:

- `FOLLOWUP_REQUIRED_WITHOUT_DATE` (BLOCK) **entfällt ersatzlos** — `due_date` ist `NOT NULL`,
  das Schema macht die Regel überflüssig. Eine Regel, die eine Datenbankbedingung wiederholt,
  ist doppelte Wahrheit.
- `CLIENT_CLOSED_WITH_OPEN_FOLLOWUPS` wird zu `CLIENT_CLOSED_WITH_OPEN_TASKS` — Warnung mit
  Kaskade, die die offenen Aufgaben des Kunden abschließt.

Wird in #46 vermerkt, sobald dieser Entwurf umgesetzt ist.

---

## Tests

- **Service-Tests** für die Spiegelung: Follow-up gesetzt erzeugt eine Aufgabe; Datumsänderung
  zieht mit; Haken entfernt löscht die offene, lässt die erledigte stehen.
- **Ein Test pro Endpunkt-Eigenheit**: `complete` ohne Body hakt nur ab; `complete` mit
  `outcome` legt zusätzlich die Notiz an; ein Rollback lässt beides unverändert.
- **Isolationstest**: ein fremder Agent erreicht weder die Aufgabe noch kann er sie über
  `clientId` an einen fremden Kunden hängen.
- **Löschtest**: `deleteClient` entfernt die Aufgaben des Kunden.
- **Migrationstest**: der Backfill erzeugt für jede offene Follow-up-Notiz genau eine Aufgabe.

Backend-Tests laufen im Container (`maven:3.9-eclipse-temurin-17`), kein lokales Maven/JDK.

## Quality Gates

- `de.json` und `en.json` um alle `tasks.*`-Schlüssel ergänzt, identische Schlüsselbäume
- Migration V38 PostgreSQL-tauglich, gegen den Docker-Stack getestet (im `dev`-Profil läuft
  Flyway nicht — ein Fehler fiele dort nicht auf)
- Kein `bg-white` / `text-gray-*` / `border-gray-*`, kein statisches `style="…"` in neuem Markup
- Jede Service-Methode prüft die Zugehörigkeit über `OwnershipValidator`
