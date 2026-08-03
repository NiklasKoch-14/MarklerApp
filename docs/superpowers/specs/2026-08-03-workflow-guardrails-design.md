# Workflow-Guardrails — Logikfehler verhindern, ohne zu bevormunden

**Datum**: 2026-08-03
**Status**: entworfen, nicht umgesetzt
**Betrifft**: `backend/.../rules` (neu), `ClientService`, `PropertyService`, `ViewingService`,
`CallNoteService`, `GlobalExceptionHandler`, `frontend/src/app/core/interceptors`

---

## Ausgangslage

Die App führt fünf Statusfelder, die den Arbeitsablauf eines Maklers abbilden:

| Feld | Werte |
|---|---|
| `PropertyStatus` | AVAILABLE, RESERVED, SOLD, RENTED, WITHDRAWN, UNDER_CONSTRUCTION |
| `Client.PipelineStage` (Käufer) | PROSPECT, ACTIVE_SEARCH, VIEWING, WON, LOST |
| `Client.SellerPipelineStage` | LEAD, VALUATION, PITCH, MANDATE, SOLD, LOST |
| `Viewing.ViewingStatus` | SCHEDULED, COMPLETED, CANCELLED |
| `CallNote.followUpRequired` / `followUpDate` | Boolean / Datum |

**Regeln dafür gibt es heute keine.** `ClientService.updatePipelineStage()` schreibt den Wert
ungeprüft; `ViewingService` prüft ausschließlich, ob Kunde und Objekt demselben Agenten gehören.
Jede Kombination ist erlaubt. Konkret möglich und heute nicht verhindert:

- eine Besichtigung für ein bereits verkauftes Objekt anlegen
- ein Mietobjekt (`ListingType.RENT`) auf `SOLD` setzen
- eine Besichtigung als `COMPLETED` markieren, deren Termin in der Zukunft liegt
- einen Kunden von `PROSPECT` direkt auf `WON` ziehen, ohne je einen Termin
- einen Eigentümer auf `MANDATE` setzen, ohne dass ihm ein einziges Objekt gehört
- ein Objekt auf `SOLD` setzen und drei geplante Besichtigungen verwaisen lassen
- `followUpRequired = true` ohne Datum speichern

Diese Zustände sind nicht nur unsauber — sie verfälschen die Auswertungen (Trichter, Akquisekanal),
die auf ebendiesen Feldern rechnen.

## Zielkonflikt und Entscheidung

Ein Zustandsautomat mit fester Übergangstabelle würde alles davon verhindern und dabei den Makler
entmündigen: Wer versehentlich `SOLD` klickt, muss es zurücknehmen können. Die Entscheidung ist
deshalb **zweistufig**:

- **BLOCK** (`422`) für fachlich Unmögliches. Nicht übersteuerbar. Ein Mietobjekt *ist* nicht
  verkauft, ein Termin morgen *hat* nicht stattgefunden.
- **WARN** (`409`) für alles Unwahrscheinliche. Der Dialog benennt das Problem und die Folgen,
  der Makler bestätigt mit einem Klick und arbeitet weiter.

Die Freiheit bleibt also vollständig erhalten — sie kostet nur eine bewusste Bestätigung.

---

## Architektur

### Regel-Engine (`com.marklerapp.crm.rules`)

| Baustein | Aufgabe |
|---|---|
| `WorkflowRule` | Interface: `RuleCode code()`, `Severity severity()`, `Optional<RuleViolation> evaluate(RuleContext ctx)` |
| `RuleContext` | Entität im Zustand *vorher*, die beabsichtigte Änderung, die für Querprüfungen nötigen Repositories |
| `RuleViolation` | Code, Severity, `messageKey` + `params`, betroffene Datensätze, optionaler Kaskaden-Vorschlag |
| `CascadeAction` | Was mitgeht: `CANCEL_VIEWINGS`, `ADVANCE_OWNER_STAGE`, `CLOSE_FOLLOWUPS` — je mit den betroffenen IDs |
| `WorkflowGuard` | Wählt die für die Änderung zuständigen Regeln, wertet sie aus, liefert ein `GuardResult` |

Jede Regel ist eine eigene Klasse mit einem eigenen Unit-Test. Das ist der Punkt der Aufteilung:
eine Regel lässt sich lesen, ändern und löschen, ohne die anderen siebzehn zu verstehen.

**Der Text bleibt im Frontend.** Eine `RuleViolation` trägt `messageKey` und `params`, nie einen
fertigen Satz — sonst wären die Meldungen am i18n-System vorbei hartcodiert.

### Vertrag Backend ↔ Frontend

Die Update-DTOs bekommen ein optionales Feld `acknowledgedRules: string[]`.

| Fall | Antwort | Verhalten |
|---|---|---|
| kein Verstoß | `200` | speichern |
| BLOCK-Verstoß | `422` | ablehnen, keine Wiederholung möglich |
| WARN-Verstoß, nicht quittiert | `409` | ablehnen, Payload mit Warnungen und Kaskaden-Vorschau |
| WARN-Verstoß, quittiert | `200` | speichern **und Kaskade in derselben Transaktion ausführen** |

```json
{
  "type": "WORKFLOW_WARNING",
  "violations": [
    {
      "code": "PROPERTY_SOLD_WITH_OPEN_VIEWINGS",
      "severity": "WARN",
      "messageKey": "workflow.rule.propertySoldWithOpenViewings",
      "params": { "count": 3 },
      "affected": [
        { "type": "VIEWING", "id": "…", "label": "12.08. 14:00 — Müller" }
      ],
      "cascade": {
        "action": "CANCEL_VIEWINGS",
        "messageKey": "workflow.cascade.cancelViewings",
        "ids": ["…"]
      }
    }
  ]
}
```

Der Normalfall — keine Regelverletzung — kostet keinen zusätzlichen Request. Eine Vorab-Prüfung
per eigenem Endpunkt wurde verworfen, weil sie jeden Dialogaufruf mit einem Roundtrip belastet und
die Regeln zweimal ausführt.

### Frontend: ein Interceptor, sonst nichts

`frontend/src/app/core/interceptors/workflow-guard.interceptor.ts` fängt jede `409`-Antwort mit
`type: WORKFLOW_WARNING`, öffnet einen `WorkflowWarningDialogComponent` und wiederholt bei
Bestätigung denselben Request mit gesetztem `acknowledgedRules`.

**Kein Feature-Component wird angefasst.** Jeder heutige und jeder künftige Aufruf, der eine Regel
verletzen kann, bekommt Dialog und Kaskadenvorschau ohne eigenes Zutun. Eine `422` erzeugt
stattdessen eine Fehlermeldung ohne Wiederholungsoption.

Der Dialog folgt dem bestehenden `ConfirmDialogComponent`: pro Warnung ein Absatz mit
übersetztem Text, darunter die betroffenen Datensätze als Liste, unten `.form-actions` mit
„Trotzdem speichern" (`.btn-primary`, `ri-check-line`) und „Abbrechen" (`.btn-secondary`,
`ri-close-line`). Styling nach ADR 0001 — Farben nur über CSS-Variablen.

### Übersteuerungen protokollieren

Neue Tabelle `workflow_override_log` (`rule_code`, `entity_type`, `entity_id`, `agent_id`,
`created_at`). Wird eine Warnung von fast allen Nutzern weggeklickt, ist die Regel falsch gewählt
und nicht der Nutzer — ohne dieses Log ist das eine Ratefrage. Kostet eine Flyway-Migration und
ein Insert pro quittierter Warnung.

---

## Regelkatalog

🔴 = BLOCK (`422`, nicht übersteuerbar) · 🟡 = WARN (`409`, bestätigbar)

### Stufe 1 — Objekt & Besichtigung

| Code | Sev | Bedingung | Kaskade |
|---|---|---|---|
| `PROPERTY_RENT_MARKED_SOLD` | 🔴 | `listingType = RENT` und Zielstatus `SOLD` (spiegelbildlich `SALE` → `RENTED`) | — |
| `VIEWING_FOR_CLOSED_PROPERTY` | 🔴 | neue Besichtigung für Objekt in `SOLD`/`RENTED`/`WITHDRAWN` | — |
| `VIEWING_COMPLETED_IN_FUTURE` | 🔴 | Zielstatus `COMPLETED`, `viewingDate` in der Zukunft | — |
| `VIEWING_SCHEDULED_IN_PAST` | 🟡 | neuer Termin als `SCHEDULED` mit Datum in der Vergangenheit — Nacherfassung ist legitim, deshalb nur Warnung | — |
| `PROPERTY_SOLD_WITH_OPEN_VIEWINGS` | 🟡 | Zielstatus `SOLD`/`RENTED`, es gibt `SCHEDULED`-Termine | `CANCEL_VIEWINGS` |
| `PROPERTY_REOPENED` | 🟡 | `SOLD`/`RENTED` → `AVAILABLE`/`RESERVED` | — |
| `PROPERTY_RESERVED_WITHOUT_VIEWING` | 🟡 | Zielstatus `RESERVED`, kein einziger `COMPLETED`-Termin | — |

### Stufe 2 — Käufer-Pipeline

| Code | Sev | Bedingung | Kaskade |
|---|---|---|---|
| `BUYER_STAGE_SKIPPED` | 🟡 | Vorwärtssprung mit Index-Differenz > 1 innerhalb `PROSPECT`→`ACTIVE_SEARCH`→`VIEWING`→`WON`. `LOST` ist von jeder Stufe aus erlaubt und löst die Regel nie aus | — |
| `BUYER_REOPENED_FROM_CLOSED` | 🟡 | `WON`/`LOST` → frühere Stufe | — |
| `BUYER_WON_WITHOUT_VIEWING` | 🟡 | Zielstufe `WON`, kein `COMPLETED`-Termin | — |
| `BUYER_VIEWING_STAGE_WITHOUT_VIEWING` | 🟡 | Zielstufe `VIEWING`, kein Termin vorhanden — Meldung mit Deeplink „Termin anlegen" | — |
| `BUYER_LOST_WITH_OPEN_VIEWINGS` | 🟡 | Zielstufe `LOST`, `SCHEDULED`-Termine offen | `CANCEL_VIEWINGS` |

### Stufe 3 — Verkäufer-Pipeline

| Code | Sev | Bedingung | Kaskade |
|---|---|---|---|
| `SELLER_MANDATE_WITHOUT_PROPERTY` | 🟡 | Zielstufe `MANDATE`, kein Objekt mit `owner = Kunde` | — |
| `SELLER_SOLD_WITHOUT_SOLD_PROPERTY` | 🟡 | Zielstufe `SOLD`, kein Objekt des Eigentümers in `SOLD`/`RENTED` | — |
| `PROPERTY_SOLD_OWNER_STILL_IN_MANDATE` | 🟡 | Objekt → `SOLD`, Eigentümer steht noch auf `MANDATE` oder früher | `ADVANCE_OWNER_STAGE` |
| `SELLER_STAGE_SKIPPED` | 🟡 | analog `BUYER_STAGE_SKIPPED` über `LEAD`→`VALUATION`→`PITCH`→`MANDATE`→`SOLD` | — |
| `SELLER_REOPENED_FROM_CLOSED` | 🟡 | analog `BUYER_REOPENED_FROM_CLOSED` | — |

### Stufe 4 — Follow-ups & Gesprächsnotizen

| Code | Sev | Bedingung | Kaskade |
|---|---|---|---|
| `FOLLOWUP_REQUIRED_WITHOUT_DATE` | 🔴 | `followUpRequired = true`, `followUpDate = null` — heute erlaubt, reiner Datenfehler | — |
| `CLIENT_CLOSED_WITH_OPEN_FOLLOWUPS` | 🟡 | Kunde → `WON`/`LOST`/`SOLD`, offene Follow-ups vorhanden | `CLOSE_FOLLOWUPS` |

---

## Bewusst nicht enthalten

**„WON ohne verknüpftes Objekt".** Es gibt kein Feld, das festhält, *welches* Objekt ein Käufer
erworben hat — `Property.owner` bildet nur die Verkäuferseite ab. Die Regel setzt eine
Abschluss-Verknüpfung Kunde↔Objekt voraus, die erst geschaffen werden muss. Eigenes Issue.

**Zeitliche Plausibilität über mehrere Datensätze** (etwa: Termin liegt vor dem Anlagedatum des
Kunden). Hoher Aufwand, geringer Ertrag.

**Reihenfolge:** Stufe 4 überschneidet sich mit Issue #33 (Aufgaben/Erinnerungen als eigenes
Objekt). Wird #33 vorher umgesetzt, wandern beide Regeln auf die neue Aufgaben-Entität. Stufe 4
deshalb nach #33 einplanen, nicht davor.

## Tests

- **Pro Regel ein Unit-Test** gegen einen gestubbten `RuleContext` — Verstoß und Nicht-Verstoß.
- **Pro Kaskade ein Integrationstest**: quittierte Warnung speichert *und* führt die Kaskade in
  einer Transaktion aus; ein Rollback lässt beides unverändert.
- **Ein Guard-Test je Stufe**: nicht quittierter WARN liefert `409` mit vollständigem Payload,
  derselbe Request mit `acknowledgedRules` liefert `200`.
- **BLOCK-Test**: `422`, und `acknowledgedRules` ändert daran nichts.
- Backend-Tests laufen im `maven:3.9-eclipse-temurin-17`-Container (kein lokales Maven/JDK).

## Quality Gates

- `de.json` und `en.json` um alle `workflow.rule.*`- und `workflow.cascade.*`-Schlüssel ergänzt
- Flyway-Migration für `workflow_override_log` PostgreSQL-kompatibel (gültige UUIDs)
- Dialog-Markup nach ADR 0001: kein `bg-white`/`text-gray-*`, kein statisches `style="…"`
- Buttons nach Issue #28: `.btn-primary` zuerst im Markup, `ri-check-line` / `ri-close-line`
