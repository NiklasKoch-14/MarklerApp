# MarklerApp Development Guidelines

**Updated**: 2026-06-22 | **Status**: Phase 1.5 complete — Railway backend live

## Project Context

German Real Estate CRM (Spring Boot 17 + Angular 17) being converted into a **multi-tenant Stripe SaaS**.
Plan tiers: Free/Trial · Basic 29€ · Pro 69€ · Agency 149€. Full roadmap in `PLAN.md`.

**GitHub**: NiklasKoch-14/MarklerApp

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Java 17, Spring Boot 3.3.6, JWT auth, Flyway migrations |
| Frontend | Angular 17 standalone components, TypeScript 5+, Tailwind CSS, i18n |
| Database | Supabase (managed PostgreSQL 17.6) — Session Pooler in prod |
| Storage | Supabase Storage (S3-compatible REST API) |
| Hosting | Railway (backend Docker + frontend nginx — ein Dashboard, kein Vercel) |
| Local dev | SQLite (dev profile), Docker Compose (`docker-compose.dev.yml`) |

**Key Paths**:
- Backend: `backend/src/main/java/com/marklerapp/crm/{controller,service,entity,dto,repository,config}`
- Frontend: `frontend/src/app/{core,features,layout,shared}`
- Migrations: `backend/src/main/resources/db/migration/`
- Translations: `frontend/src/assets/i18n/{de,en}.json`

## Implementation Status

| Phase | Status | Notes |
|---|---|---|
| 1.1–1.3 | ✅ Done | Supabase Postgres + Storage integration |
| 1.4 | ✅ Done | Supabase Storage for property images |
| 1.5 | ✅ Done | Railway backend deployment |
| 1.6 | ⏳ Next | Railway frontend (nginx Docker, kein Vercel) |
| 2 | Planned | Multi-tenancy (Organization entity, tenant isolation) |
| 3 | Planned | Plan limits |
| 4 | Planned | Stripe integration |
| 5 | Planned | Registration & onboarding |

---

## Production Deployment (Railway + Supabase)

### Railway Environment Variables (must all be set)

```
DATABASE_URL=jdbc:postgresql://aws-1-eu-central-1.pooler.supabase.com:5432/postgres?sslmode=require
POSTGRES_USER=postgres.kewmoozwpuqzaekjvamg
POSTGRES_PASSWORD=<from Supabase Dashboard → Settings → Database>
SUPABASE_URL=https://kewmoozwpuqzaekjvamg.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<from Supabase Dashboard → Settings → API → service_role>
JWT_SECRET=<min 48 chars random>
CORS_ALLOWED_ORIGINS=https://<vercel-frontend-domain>
SPRING_PROFILES_ACTIVE=prod
JAVA_OPTS=-Xmx400m -Xms200m -XX:+UseG1GC
```

Optional — Google Sign-In (`/auth/google` returns 503 while unset):

```
GOOGLE_CLIENT_ID=<OAuth Client ID from Google Cloud Console>
```

Must match `googleClientId` in `frontend/src/environments/environment.prod.ts`, and the
frontend's domain must be listed under the OAuth client's *Authorized JavaScript origins*.
The Client ID is not a secret — it ships in the frontend bundle by design.

### Supabase Connection — Critical Facts

- **Direct DB host** (`db.kewmoozwpuqzaekjvamg.supabase.co:5432`) is **IPv6-only** → Railway can't reach it.
- **Correct pooler URL**: Get it from Supabase Dashboard → **Connect button** → Direct tab → **Session pooler**.
  Current: `aws-1-eu-central-1.pooler.supabase.com:5432`
- **Username format for pooler**: `postgres.{project-ref}` — NOT just `postgres`.
- **SSL is mandatory**: append `?sslmode=require` to all JDBC URLs.
- Flyway reuses the same HikariCP DataSource — no separate `FLYWAY_URL` needed.

### Dockerfile (root-level)

Railway always uses the repo root as build context. The `Dockerfile` at repo root copies `backend/` manually.
`ENV SPRING_PROFILES_ACTIVE=prod` must be in the Dockerfile — Railway doesn't set it automatically.

### application.yml — prod profile gotchas

```yaml
spring:
  jpa:
    defer-datasource-initialization: false  # MUST override base-profile's 'true' — causes circular dep with Flyway
  flyway:
    postgresql:
      transactional-lock: false  # Required for PGBouncer (Session Pooler uses PGBouncer)
  datasource:
    hikari:
      data-source-properties:
        sslmode: require  # Belt-and-suspenders SSL enforcement
```

### Flyway + PostgreSQL 17

`flyway-core` alone is not enough in Flyway 10.x. Always include:
```xml
<dependency>
  <groupId>org.flywaydb</groupId>
  <artifactId>flyway-database-postgresql</artifactId>
  <!-- version managed by Spring Boot parent -->
</dependency>
```

### UUID Rules for Migrations

PostgreSQL enforces strict UUID hex format (0-9, a-f only). SQLite accepted any string.
**Never use letter prefixes like p/i/n/s** — they are not hex. Use b/e/d/a instead.

Before writing seed data, validate every UUID in `V*.sql` files.

### Mail / Email

`spring-boot-starter-mail` was **removed** on 2026-06-22.
`MailHealthIndicator` caused Railway health checks to fail when SMTP isn't configured.
`PasswordResetService` still generates tokens in the DB — email delivery is a future paid feature.

---

## Development Commands

```bash
# Local dev (SQLite + H2)
cd backend && mvn spring-boot:run
cd frontend && npm install && npm start
# Access: Frontend:4200, Backend:8085, API Docs:8085/swagger-ui.html

# Docker stack
docker compose -f docker-compose.dev.yml up --build

# Tests
cd frontend && npm test && npm run lint
cd backend && mvn test

# E2E (Playwright) — braucht ein laufendes Backend auf :8085, startet ng serve selbst
cd frontend && npm run e2e:pw                    # beide Projekte
cd frontend && npm run e2e:pw:desktop            # nur Desktop Chromium
E2E_PORT=4300 npm run e2e:pw:desktop             # anderer Port, falls :4200 belegt ist
npx playwright install chromium webkit           # einmalig; webkit braucht zusaetzlich
sudo npx playwright install-deps webkit          # Systembibliotheken fuer Mobile Safari
```

---

## Critical Coding Rules

### i18n MANDATORY — no hardcoded UI strings

```html
<!-- WRONG -->
<button>Add Property</button>
<!-- CORRECT -->
<button>{{ 'properties.add' | translate }}</button>
{{ outcome | translateEnum:'callOutcome' }}
```

Files: `frontend/src/assets/i18n/{de,en}.json` — both must be updated together.

### Controller Endpoint Mapping

```java
@RequestMapping("/properties")   // CORRECT — context-path /api/v1 prefixes automatically
@RequestMapping("/api/properties") // WRONG — double-prefix
```

### Enum Translation

Always use `translateEnum` pipe in templates. NEVER format enums in service methods.

### Jackson Enum Coercion

`JacksonConfig.java` coerces empty strings to null for enums — needed because frontend sends `""` for optional enums.

### Styling — drei Systeme, drei Zuständigkeiten (ADR 0001)

Volle Begründung mit Zahlen: `docs/adr/0001-styling-architektur.md`. Die Kurzform:

| Wofür | Womit |
|---|---|
| Farben | **nur** CSS-Variablen — `bg-surface`, `text-body-2`, `border-border`, `bg-page`, `text-error`, `bg-success-soft`. Sie sind themefähig; **kein `dark:` nötig** |
| Layout, Abstand, Typografie | Tailwind — `flex`, `grid`, `gap-3`, `text-13`, `font-semibold` |
| Wiederkehrende Bausteine | Klassen in `styles.scss` — `.surface-card`, `.kv-row`/`.kv-label`/`.kv-value`, `.section-label`, `.btn-primary`, `.form-input` |
| Berechnete Werte | `[style.x]`-Binding |

**Nie** `bg-white`, `text-gray-*`, `border-gray-*` in neuem Code — das sind eingefrorene
Hellmodus-Farben und im Dark Mode falsch. `tailwind.config.js` führt keine eigenen Hex-Werte
mehr; neue Farben kommen als CSS-Variable dazu und werden dort verlinkt.

Die Schriftgrade des Projekts sind Tailwind-Tokens: `text-11` … `text-26`. Tailwinds
Standardskala passt nicht (`text-sm` = 14px, das Projekt benutzt 278× 13px).

```html
<!-- RICHTIG: statisches Styling in Klassen, Datenwerte per Binding -->
<div class="surface-card">
  <div class="kv-row"><span class="kv-label">Preis</span><span class="kv-value">…</span></div>
</div>
<div class="funnel-fill" [style.width.%]="s.widthPct" [style.background]="s.color"></div>

<!-- FALSCH: konstantes Styling inline -->
<div style="background:var(--surface);border:1px solid var(--border);border-radius:14px;">
<span style="font-size:13px;font-weight:600;color:var(--text);">
```

Statisches `style="…"` mit konstanten Werten ist ein Review-Befund. Bestand wird
**opportunistisch** migriert (wer die Datei anfasst, stellt die berührten Stellen um) —
kein Sammel-Refactor. Eine neue Klasse in `styles.scss` braucht mindestens eine
Aufrufstelle; ungenutzte Klassen löschen.

### Buttons & Icons (Issue #28)

Never style a button inline — use `.btn-primary` (filled `--primary`) or `.btn-secondary`
(light surface + neutral `--border`), both in `styles.scss`.

Action rows go **below** the form, in one group, wrapped in `.form-actions`
(right-aligned) or `.form-actions form-actions--centered` (dialogs). **The primary
button comes first in the markup** — it sits on the left, deliberately inverting the
usual LTR convention.

One icon per operation, no exceptions:

| Operation | Icon |
|---|---|
| Edit | `ri-pencil-line` |
| Add / create | `ri-add-line` |
| Close / cancel | `ri-close-line` |
| Confirm / save | `ri-check-line` |
| Delete | `ri-delete-bin-line` |

`ri-checkbox-circle-line`/`-fill` stay **status indicators** and are never button icons.
Destructive confirmations keep `.btn-primary` but override `background` with the signal
colour — teal on a delete would read as a routine confirmation.

---

## Git Workflow

```bash
# Feature branches for major phases
git checkout main && git pull
git checkout -b feature/description
# ... commits ...
git push -u origin feature/description   # No PR creation
```

**Prohibited**: `git push --force`, `git reset --hard`, `git clean -f`, `git branch -D`
**Confirm first**: architectural changes, security configs, production settings

---

## Code Conventions

- **Backend**: Controller → Service → Repository, singular entity names, DTOs with "Dto" suffix
- **Frontend**: Standalone components, reactive forms, BehaviorSubjects for state, Tailwind utilities
- **Database**: snake_case columns, Flyway migrations only (no `ddl-auto: update` in prod), strategic indexes
- **Security**: JWT tokens, role-based access, GDPR audit logging
- **Comments**: Only when WHY is non-obvious. No docstrings rehashing what the code says.

## Quality Gates

- Backend compiles and starts without errors
- No hardcoded UI strings
- Both `de.json` and `en.json` updated
- Flyway migrations are PostgreSQL-compatible (valid UUIDs, no SQLite-specific syntax)
- Kein `bg-white` / `text-gray-*` / `border-gray-*` in neuem Markup (ADR 0001)
- Kein statisches `style="…"` in neuem Markup — Klassen oder `[style.x]`-Binding

```bash
# Prüft beides in den geänderten Dateien:
git diff --name-only main | grep -E '\.(html|ts)$' | xargs grep -nE \
  'class="[^"]*(bg-white|text-gray-|border-gray-)|style="[a-z-]+:[^"]*"' 2>/dev/null
```
