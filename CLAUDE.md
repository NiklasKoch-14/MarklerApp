# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**Stand**: 2026-08-03 · **GitHub**: `NiklasKoch-14/MarklerApp`

Deutsches Immobilien-CRM für selbstständige Makler. Spring Boot 3.3.6 (Java 17) + Angular 17,
zweisprachig de/en, DSGVO-konform. Wird schrittweise zu einer mandantenfähigen Stripe-SaaS
umgebaut — Roadmap in `PLAN.md`.

---

## Befehle

```bash
# Lokale Entwicklung (dev-Profil: SQLite, kein Flyway)
cd backend  && mvn spring-boot:run          # :8085, Swagger unter /swagger-ui.html
cd frontend && npm install && npm start     # :4200

# Vollständiger Stack (PostgreSQL 15, Flyway aktiv)
docker compose -f docker-compose.dev.yml up --build
```

### Tests

**Auf diesem Rechner gibt es kein lokales Maven und kein JDK.** Backend-Tests laufen im Container:

```bash
docker run --rm -v "$PWD/backend":/app -v "$HOME/.m2":/root/.m2 -w /app \
  maven:3.9-eclipse-temurin-17 mvn test

# Einzelne Testklasse
docker run --rm -v "$PWD/backend":/app -v "$HOME/.m2":/root/.m2 -w /app \
  maven:3.9-eclipse-temurin-17 mvn -q test -Dtest=PropertyServiceTest
```

`backend/target/` gehört danach root. Das ist erwartet — nicht reparieren, notfalls
`sudo rm -rf backend/target`.

```bash
# Frontend (Karma/Jasmine)
cd frontend && npx ng test --watch=false --browsers=ChromeHeadless
cd frontend && npx ng test --watch=false --browsers=ChromeHeadless --include='**/geo.util.spec.ts'

# E2E (Playwright) — braucht ein laufendes Backend auf :8085, startet ng serve selbst
cd frontend && npm run e2e:pw:desktop
E2E_PORT=4300 npm run e2e:pw:desktop        # falls :4200 belegt ist
npx playwright install chromium webkit      # einmalig
sudo npx playwright install-deps webkit     # Systembibliotheken für Mobile Safari
```

### Lint — grün heißt „keine Fehler", nicht „keine Befunde"

```bash
cd frontend && npm run lint
```

Läuft seit #49 gegen `frontend/.eslintrc.json` und liefert einen echten Exit-Code. Zwei Dinge
sind beim Lesen der Ausgabe wichtig:

**Der Bestand erzeugt rund 200 Warnungen, und das ist Absicht.** Vier Regeln stehen auf `warn`
statt `error`, weil sie am Bestand zusammen 203-mal anschlagen und das Gate sonst von Tag eins
an rot gewesen wäre — 151 Barrierefreiheits-Befunde (#55) und 52 `any` (#54). Die Begründung
steht als Kommentar an jeder Regel in der Konfiguration. Wer eine dieser Regeln abräumt, hebt
sie am Ende auf `error`. **Neue Warnungen dieser Art sind trotzdem Befunde** — die Zahl soll
sinken, nicht steigen.

**Lint ersetzt den Build nicht.** ESLint prüft keine Angular-Template-Typen. Ein `(click)="f($event)"`
gegen ein `f()` ohne Parameter fällt weder ESLint noch `tsc --noEmit` auf, sondern erst hier:

```bash
cd frontend && npx ng build --configuration production
```

Vor einem PR laufen beide.

---

## Architektur

### Backend: Controller → Service → Repository

15 Controller, 27 Services, 20 Entities, 41 DTOs, 9 MapStruct-Mapper. Zwei Muster tragen fast
alles und sind beim Schreiben neuer Endpunkte verbindlich:

**Agent-Scoping ist die Mandantentrennung.** Es gibt noch keine `Organization` — jede Zeile
gehört einem `Agent`, und *jede* Service-Methode nimmt eine `agentId` entgegen und prüft sie
über `OwnershipValidator` (`validateClientOwnership`, `validatePropertyOwnership`,
`validateViewingOwnership`, `validateCallNoteOwnership`, `validateOwnerAssignment`). Eine
Methode ohne diese Prüfung ist ein Datenleck zwischen Maklerbüros, kein Schönheitsfehler.

**Controller erben von `BaseController`** und holen den Agenten über `getAgentIdFromAuth(auth)`
bzw. `getAgentFromAuth(auth)` aus dem Spring-Security-Principal. Nie selbst casten.

```java
@RequestMapping("/properties")      // RICHTIG — context-path /api/v1 wird vorangestellt
@RequestMapping("/api/properties")  // FALSCH — doppeltes Präfix
```

### Persistenz: drei Profile, drei Verhalten

| Profil | Datenbank | Schema |
|---|---|---|
| `dev` (Default) | SQLite, `./data/realestate_crm.db` | `ddl-auto: update`, **Flyway aus** |
| `docker` | PostgreSQL 15 im Compose-Stack | Flyway, `ddl-auto: none` |
| `prod` | Supabase PostgreSQL 17 (Session Pooler) | Flyway, `ddl-auto: none` |

Die Konsequenz, die regelmäßig überrascht: **Migrationen laufen im lokalen `dev`-Profil nie.**
Ein Fehler in einer `V*.sql` fällt erst im Docker-Stack oder in Produktion auf. Wer eine
Migration schreibt, testet sie über `docker-compose.dev.yml`, nicht über `mvn spring-boot:run`.

35 Migrationen in `backend/src/main/resources/db/migration/`.

### Frontend: Standalone-Komponenten

`frontend/src/app/{core,features,layout,shared}`. Acht Feature-Bereiche: `analytics`, `auth`,
`call-notes`, `client-management`, `dashboard`, `property-management`, `settings`,
`viewing-management`. Zustand über BehaviorSubjects in `core/services`, reaktive Formulare,
`core/interceptors` für querschnittliche HTTP-Belange.

`shared/components` enthält die wiederverwendbaren Bausteine — darunter `confirm-dialog`,
`command-palette`, `location-picker-map`, `file-attachment-manager`.

---

## Konventionen, die nicht aus dem Code ablesbar sind

### i18n ist Pflicht

```html
<!-- FALSCH -->
<button>Add Property</button>
<!-- RICHTIG -->
<button>{{ 'properties.add' | translate }}</button>
{{ outcome | translateEnum:'callOutcome' }}
```

`frontend/src/assets/i18n/de.json` und `en.json` werden **immer gemeinsam** gepflegt und müssen
identische Schlüsselbäume haben. Enums werden ausschließlich über die `translateEnum`-Pipe
übersetzt, **nie** in einer Service-Methode formatiert.

Auch das Backend erzeugt keine Anzeigetexte: strukturierte Fehler tragen `messageKey` + `params`,
das Frontend löst auf. Ein deutscher oder englischer Satz in einer Java-Datei ist ein Befund.

### Styling — drei Systeme, drei Zuständigkeiten (ADR 0001)

Volle Begründung mit Zahlen: `docs/adr/0001-styling-architektur.md`.

| Wofür | Womit |
|---|---|
| Farben | **nur** CSS-Variablen — `bg-surface`, `text-body-2`, `border-border`, `bg-page`, `text-error`. Themefähig, **kein `dark:` nötig** |
| Layout, Abstand, Typografie | Tailwind — `flex`, `grid`, `gap-3`, `text-13`, `font-semibold` |
| Wiederkehrende Bausteine | Klassen in `styles.scss` — `.surface-card`, `.kv-row`, `.section-label`, `.btn-primary`, `.form-input` |
| Berechnete Werte | `[style.x]`-Binding |

**Nie** `bg-white`, `text-gray-*`, `border-gray-*` in neuem Code — eingefrorene Hellmodus-Farben,
im Dark Mode falsch. Schriftgrade sind projekteigene Tokens `text-11` … `text-26`; Tailwinds
Standardskala passt nicht (`text-sm` = 14px, das Projekt benutzt 278× 13px). Neue Farben kommen
als CSS-Variable in `styles.scss` und werden in `tailwind.config.js` verlinkt — **keine Hex-Werte
in der Tailwind-Config**.

Statisches `style="…"` mit konstanten Werten ist ein Review-Befund. Bestand wird
**opportunistisch** migriert (wer die Datei anfasst, stellt die berührten Stellen um), kein
Sammel-Refactor. `ConfirmDialogComponent` ist noch voller Inline-Styles — Vorbild für Struktur
und Verhalten, **nicht** fürs Styling.

### Buttons & Icons

Nie einen Button inline stylen — `.btn-primary` (gefülltes `--primary`) oder `.btn-secondary`.
Aktionszeile **unter** dem Formular, in einer Gruppe, in `.form-actions` (rechtsbündig) oder
`.form-actions form-actions--centered` (Dialoge). **Der primäre Button steht zuerst im Markup** —
er sitzt links, was die übliche LTR-Konvention bewusst umkehrt.

Ein Icon pro Operation:

| Operation | Icon |
|---|---|
| Bearbeiten | `ri-pencil-line` |
| Hinzufügen | `ri-add-line` |
| Schließen / Abbrechen | `ri-close-line` |
| Bestätigen / Speichern | `ri-check-line` |
| Löschen | `ri-delete-bin-line` |

`ri-checkbox-circle-line`/`-fill` bleiben **Statusanzeigen** und sind nie Button-Icons.
Destruktive Bestätigungen behalten `.btn-primary`, überschreiben aber `background` mit der
Signalfarbe — Teal auf einem Löschen läse sich wie eine Routinebestätigung.

**Kein `window.confirm()` / `alert()`.** Dafür gibt es `ConfirmDialogComponent`.

### Schutzmechanismen, die nicht ausgehebelt werden dürfen

Drei Vorkehrungen fangen je eine reale Fehlerklasse ab. Wer sie beim Anpassen abschwächt,
entfernt genau den Schutz, für den sie gebaut wurden:

- **`UpdateFieldParityTest`** — reflektiert über gemeinsame Feldnamen von Request-DTO und
  Entität, befüllt sie und schlägt fehl, wenn ein Wert bei der handgeschriebenen Kopie
  verlorengeht. Entstand aus dem Bug „Suchort wurde beim Bearbeiten nie gespeichert". Ein Feld
  bewusst nicht kopieren? In die Ausschlussliste, **mit Kommentar** — nicht den Scan verengen.
- **`PropertySearchCriteriaMapper`** trägt `unmappedTargetPolicy = ERROR`. Ein neues Feld ohne
  Verdrahtung bricht den Build statt still zu verschwinden.
- **`JacksonConfig`** wandelt leere Strings für Enums und Daten zu `null` — das Frontend sendet
  `""` für optionale Enums. Siehe `EmptyDateCoercionTest`.

### UUIDs in Migrationen

PostgreSQL erzwingt striktes Hex (0-9, a-f). SQLite akzeptierte beliebige Strings. **Nie
Buchstabenpräfixe wie p/i/n/s** — die sind kein Hex. Stattdessen b/e/d/a. Jede literale UUID in
einer neuen `V*.sql` vorher prüfen.

---

## Betriebswissen (Railway + Supabase)

Wissen, das in keinem Code steht und beim Neuaufsetzen teuer wäre.

### Supabase-Verbindung

- Der **direkte DB-Host** (`db.<ref>.supabase.co:5432`) ist **IPv6-only** → Railway erreicht ihn nicht.
- Richtige Pooler-URL: Supabase Dashboard → **Connect** → Direct → **Session pooler**.
  Aktuell `aws-1-eu-central-1.pooler.supabase.com:5432`.
- **Username-Format am Pooler**: `postgres.{project-ref}` — nicht bloß `postgres`.
- SSL ist Pflicht: `?sslmode=require` an jede JDBC-URL.
- Flyway benutzt dieselbe HikariCP-DataSource — kein separates `FLYWAY_URL` nötig.

### `application.yml`, prod-Profil

```yaml
spring:
  jpa:
    defer-datasource-initialization: false  # MUSS das 'true' des Basis-Profils überschreiben,
                                            # sonst Zirkelbezug mit Flyway
  flyway:
    postgresql:
      transactional-lock: false             # nötig für PGBouncer (Session Pooler)
```

### Flyway + PostgreSQL 17

`flyway-core` allein reicht in Flyway 10.x nicht. `flyway-database-postgresql` muss dabei sein
(Version verwaltet der Spring-Boot-Parent).

### Dockerfile

Railway nimmt immer die Repo-Wurzel als Build-Kontext. Das `Dockerfile` dort kopiert `backend/`
manuell. `ENV SPRING_PROFILES_ACTIVE=prod` muss **im Dockerfile** stehen — Railway setzt es nicht.

### Mail

`spring-boot-starter-mail` wurde am 2026-06-22 entfernt: `MailHealthIndicator` ließ Railways
Health-Check scheitern, solange kein SMTP konfiguriert ist. `PasswordResetService` erzeugt weiter
Tokens in der DB; der Versand ist ein späteres kostenpflichtiges Feature.

---

## Zusammenarbeit mit diesem Nutzer

- **Sprache: Deutsch.** Auch Commit-Nachrichten — aber **ohne Umlaute in der Betreffzeile**
  (Repo-Konvention: „Adress-Vervollstaendigung", „Verkaeufer-Strang").
- **Ein Issue → ein `feature/<beschreibung>`-Branch → ein Pull Request gegen `main`.** Den PR
  **nie selbst mergen**, nie nach `main` pushen. Wird ein Issue nicht fertig, kommt der
  Zwischenstand auf den Branch und der PR beschreibt, was fehlt.
- **Befunde werden echte GitHub-Issues**, keine Chat-Notizen. `gh` ist authentifiziert
  (`~/.local/bin/gh`). Sinnvoll gebündelt, mit Datei-/Zeilenbezug und Abnahmekriterien.
  Gelöstes schließen: `gh issue close <n> --comment "Behoben in <sha>."`
  Gotcha: ASCII-`"` in `--title "..."` bricht das Shell-Quoting — typografische „" benutzen.
- **Der Nutzer hat eine formale HCI-Ausbildung.** UX-Vokabular direkt verwenden (Affordanz,
  Gestaltgesetze, Gulf of Execution, progressive Disclosure) — nicht umschreiben, nicht erklären.
- **Größere Vorhaben laufen als Kette**: brainstorming → Spec in `docs/superpowers/specs/` →
  Plan in `docs/superpowers/plans/` → Umsetzung Task für Task mit Review dazwischen. Der Nutzer
  entscheidet an den Weggabelungen; Zwischenstände werden nicht zur Bestätigung vorgelegt.
- **Verboten**: `git push --force`, `git reset --hard`, `git clean -f`, `git branch -D`.
  **Vorher abstimmen**: Architekturänderungen, Sicherheitskonfiguration, Produktionseinstellungen.

---

## Quality Gates

- Backend kompiliert und startet fehlerfrei; die volle Suite ist grün
- Frontend: `npm run lint` ohne Fehler, `ng build --configuration production` fehlerfrei,
  `ng test` grün
- Keine hartcodierten UI-Strings; `de.json` und `en.json` gemeinsam gepflegt
- Migrationen PostgreSQL-tauglich (gültige Hex-UUIDs, keine SQLite-Syntax), gegen den
  Docker-Stack getestet — nicht gegen `dev`
- Kein `bg-white` / `text-gray-*` / `border-gray-*` und kein statisches `style="…"` in neuem Markup

```bash
# Prüft beides in den geänderten Dateien:
git diff --name-only main | grep -E '\.(html|ts)$' | xargs grep -nE \
  'class="[^"]*(bg-white|text-gray-|border-gray-)|style="[a-z-]+:[^"]*"' 2>/dev/null
```
