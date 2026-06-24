# MarklerApp → SaaS Plan

> Ziel: Aus dem bestehenden Makler-CRM ein **Multi-Tenant SaaS** mit **Stripe-Abos** machen.
> Architektur-Entscheidung: **Hybrid** — Spring Boot bleibt, **Supabase** liefert Postgres + Storage.
> Diese Datei wird Schritt für Schritt abgehakt. Reihenfolge = empfohlene Umsetzungsreihenfolge.

**Stand:** 2026-06-22 (Phase 1 in Arbeit) · **Legende:** `[ ]` offen · `[x]` erledigt · `[~]` teilweise

---

## Phase 0 — Aufräumen & Schlankmachen ✅ (abgeschlossen)

- [x] Doku-Ballast entfernt (`*_SUMMARY.md`, `HEALTH_*.md`, `BUG_FIXES_SUMMARY.md`, `QUICK_COMMANDS.md`, `START_PRODUCTION.md`, `DEPLOYMENT_CHECKLIST.md`, `fix_image_upload.sql`, `build_output.txt`)
- [x] Spec-Kit-Scaffolding entfernt (`.specify/`, `.claude/commands/speckit.*.md`) — `specs/001-realestate-crm/` als Doku behalten
- [x] Ollama-Integration entfernt (Backend: `OllamaService`, `OllamaConfig`, `AsyncSummaryService`, `AiSummaryDto`, AI-Endpoint, Client-AI-Felder, MapStruct-Mappings)
- [x] Ollama aus `docker-compose.yml` + `docker-compose.dev.yml` + `application.yml` + `.env.production` entfernt
- [x] Frontend-AI-Summary entfernt (`call-notes.service.ts`, `client-detail.component.ts`, i18n-Keys de/en)
- [x] `CallNoteSummaryService` (regelbasierte Summaries) **behalten** — keine externe AI-Abhängigkeit
- [ ] **Offen (Doku-Restbereinigung):** Ollama-Erwähnungen in `docs/PRODUCTION_DEPLOYMENT.md`, `docs/PROJECT_STRUCTURE.md`, `specs/.../tasks.md` (historisch, nicht funktional) bei Gelegenheit entfernen
- [ ] **Build-Verifikation nachholen:** lokal ist `mvn` nicht installiert → Backend-Compile noch nicht verifiziert. Vor Weiterarbeit `mvn -q clean test` (oder Docker-Build) laufen lassen

---

## Phase 1 — Supabase-Hybrid-Fundament

> Supabase ersetzt die selbstgehostete Postgres-DB und den Bild-Storage. Spring Boot bleibt und wird separat gehostet.

### 1.1 Supabase-Projekt
- [ ] Supabase-Projekt anlegen (Region: EU/Frankfurt für DSGVO)
- [ ] DB-Passwort + Connection-Strings sichern (Session **5432** und Transaction-Pooler **6543**)
- [ ] EU-Region bestätigen (Auftragsverarbeitung/DSGVO-relevant)

### 1.2 Datenbank-Anbindung (Spring Boot → Supabase)
- [x] Flyway aktiviert (statt `ddl-auto`) — alle Profile umgestellt
- [x] **Runtime (App):** Transaction-Pooler-URL-Struktur in `application.yml` (`prod`-Profil mit `DATABASE_URL` + `prepareThreshold=0`)
- [x] HikariCP-Pool an Supavisor angepasst (`maximum-pool-size: 10`)
- [x] **Migrationen/DDL:** Flyway nutzt `FLYWAY_URL` (Session, Port 5432) — unabhängig von Runtime-URL

### 1.3 Schema-Migration: ddl-auto → Flyway (kritisch für SaaS) ✅
- [x] `ddl-auto: validate` in docker + prod Profil gesetzt (kein auto-create mehr)
- [x] Vorhandene Flyway-Migrationen V1–V11 repariert:
  - V3: fehlende Spalten in `property_images` ergänzt (`file_path`, `alt_text`, `width`, `height`)
  - V6: tatsächlich GDPR-Spalten hinzugefügt (war vorher leer/kommentiert)
  - V10-Duplikat: doppelter Versionskonflikt bereinigt → `V12__add_performance_indexes.sql`  
  - V12: falsche Tabellennamen und Spaltenname `property_status` korrigiert
- [x] Dev von SQLite auf Postgres (Docker) umgestellt — `docker` Profil, Flyway aktiv
- [x] `.env.docker` + `.env.supabase.template` erstellt
- [ ] **Backend-Compile + Flyway-Lauf auf lokalem Docker verifizieren** (läuft gerade)

### 1.4 Bild-Storage → Supabase Storage
- [ ] Supabase Storage Bucket `property-images` anlegen (Policies: nur eigener Tenant) — manuell im Dashboard
- [x] `SupabaseStorageService` implementiert (REST Client, `@ConditionalOnProperty` — inaktiv ohne gesetztes `SUPABASE_URL`)
- [x] `PropertyImageService` umgebaut: lädt zu Supabase hoch wenn `SupabaseStorageService` aktiv; Fallback auf Base64-in-DB für dev/docker
- [x] Signierte URLs für Bildauslieferung (`getSignedUrl`); Fallback: Base64 Data-URL für Altdaten
- [x] Upload-Limits + erlaubte MIME-Types beibehalten (`ValidationConstants`)
- [x] Flyway V13: neue Spalten `storage_path` + `thumbnail_storage_path`; Altdaten bleiben lesbar
- [x] `SupabaseStorageProperties` (@ConfigurationProperties), `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` in `.env.supabase.template`

### 1.5 Backend-Hosting
- [ ] Hosting wählen — **Empfehlung: Railway** (Hobby ~5 $/Mo, beste DX für Spring Boot; Render-Free hat Cold-Starts, Fly.io hat keinen Free-Tier mehr)
- [ ] `backend/Dockerfile` deployen, Env-Vars setzen (DB-URL, JWT_SECRET, CORS, Storage-Keys)
- [ ] Healthcheck `/api/v1/actuator/health` einbinden

### 1.6 Frontend-Hosting (Railway nginx — kein Vercel)

> Entscheidung (2026-06-24): Kein dritter Service. Angular läuft als zweiter Railway-Service mit nginx.
> nginx proxied `/api/` intern zum Backend → Angular nutzt relative URL `/api/v1` → kein Build-Time-URL nötig.

- [x] `frontend/Dockerfile` — nginx multi-stage build, `envsubst` injiziert `BACKEND_URL` zur Laufzeit
- [x] `frontend/nginx.conf` — proxy `/api/` → `${BACKEND_URL}`, Angular SPA-Routing, Gzip, Security-Header
- [x] `frontend/src/environments/environment.prod.ts` — `apiUrl: '/api/v1'` (relativ, war Vercel-URL)
- [ ] Zweiten Railway-Service `frontend` anlegen (gleiche Railway-App wie Backend-Service)
  - Source: `frontend/` Verzeichnis
  - Dockerfile: `frontend/Dockerfile`
  - Env-Var: `BACKEND_URL=https://<deine-railway-backend-domain>`
- [ ] CORS im Backend (`CORS_ALLOWED_ORIGINS`) auf Frontend-Railway-Domain setzen
- [ ] Healthcheck Railway → `/health` (nginx gibt 200 zurück)

---

## Phase 2 — Multi-Tenancy (Fundament fürs Abrechnen)

> **Defer-Entscheidung (2026-06-24):** Erst umsetzen wenn der erste externe Makler sagt "ich will einen Kollegen hinzufügen".
> Bis dahin: eine Instanz, ein Makler, Fokus auf Kernfeature (Gesprächsnotizen + Kundenkontakt).

> Heute: ein Makler pro Instanz. Für SaaS braucht jede Maklerfirma ihren eigenen Daten-Silo.

- [ ] Neue Entity `Organization` (Maklerfirma = Abo-Inhaber): `id, name, slug, plan_tier, stripe_customer_id, stripe_subscription_id, trial_ends_at, status`
- [ ] `Agent` bekommt `organization_id` (FK) + Rolle (`OWNER`, `AGENT`)
- [ ] Alle tenant-bezogenen Entities (`Client`, `Property`, `CallNote`, `FileAttachment`, ...) bekommen `organization_id`
- [ ] Flyway-Migration für `organizations` + FK-Spalten + Backfill bestehender Daten
- [ ] **Tenant-Isolation erzwingen:** Hibernate-Filter / `@Where` oder Service-Layer-Filter pro `organization_id` (kein Cross-Tenant-Zugriff)
- [ ] `OwnershipValidator` auf Organisationsebene erweitern (nicht nur Agent)
- [ ] Optional: Postgres Row-Level-Security als zweite Verteidigungslinie
- [ ] Tests: Tenant-A darf Daten von Tenant-B niemals sehen/ändern

---

## Phase 3 — Abo-Tiers & Usage-Limits

> **Vereinfacht (2026-06-24):** Start mit 2 Tiers. Basic + Pro kommen wenn der erste Kunde sagt
> "ich bräuchte mehr Kunden/Objekte". Agency-Tier erst wenn Multi-Tenancy (Phase 2) gebaut ist.

| Feature | Free (14-Tage-Trial) | Pro 49€/Mo |
|---|---|---|
| Makler/Nutzer | 1 | 1 |
| Kunden | 20 | unbegrenzt |
| Objekte | 10 | unbegrenzt |
| Gesprächsnotizen | unbegrenzt | unbegrenzt |
| GDPR-Export | ✅ | ✅ |

- [ ] `PlanTier`-Enum + Limit-Definitionen zentral (Konfiguration, nicht hartcodiert verstreut)
- [ ] `PlanLimitService`: prüft Limits vor jedem Create (Clients/Properties/Agents)
- [ ] Bei Limit erreicht → HTTP **402 Payment Required** mit klarer Fehlermeldung
- [ ] Frontend: Usage-Banner („18/20 Kunden — Upgrade für mehr")
- [ ] Frontend: Feature-Gating (Pro/Agency-Features ausgrauen + Upsell)

---

## Phase 4 — Stripe-Integration (Monetarisierung)

> **Defer-Entscheidung (2026-06-24):** Stripe erst einbauen wenn der erste Kunde manuell zahlt
> (Überweisung oder PayPal-Link). Kein Stripe ohne echten zahlenden Kunden — sonst baut man
> Payment-Infrastruktur für 0 Nutzer.

### 4.1 Backend
- [ ] `stripe-java` Dependency in `pom.xml`
- [ ] Stripe-Produkte/Preise anlegen (Basic/Pro/Agency, monatlich; optional jährlich mit Rabatt)
- [ ] `StripeService`: Checkout-Session erstellen, Billing-Customer-Portal-Link
- [ ] `StripeWebhookController` (Signatur-Verifikation!) für:
  - [ ] `checkout.session.completed` → Abo aktivieren, `plan_tier` setzen
  - [ ] `customer.subscription.updated` → Plan-Wechsel/Upgrade/Downgrade
  - [ ] `customer.subscription.deleted` → auf Free/gesperrt
  - [ ] `invoice.payment_failed` → Grace-Period + E-Mail
- [ ] Webhook-Secret + API-Keys als Env-Vars (Test- vs. Live-Mode trennen)

### 4.2 Frontend
- [ ] Billing-Seite: aktueller Plan, Rechnungen, „Plan verwalten" (→ Stripe Customer Portal)
- [ ] Upgrade-Flow: Button → Backend Checkout-Session → Stripe Hosted Checkout (kein Stripe.js/Kartendaten im eigenen Frontend → einfacher + PCI-konform)
- [ ] Erfolg/Abbruch-Rückleitseiten

### 4.3 Test
- [ ] End-to-End im Stripe-**Test-Mode** (Testkarten) durchspielen
- [ ] Webhook lokal mit `stripe listen` testen

---

## Phase 5 — Registrierung, Trial & Onboarding

- [ ] Registrierung legt automatisch `Organization` + ersten `OWNER`-Agent an
- [ ] 14-Tage-Trial ohne Kreditkarte (`trial_ends_at`)
- [ ] Trial-abgelaufen → Upgrade-Wall (Read-only bis Zahlung)
- [ ] Transaktions-E-Mails (vorhandener `EmailService`): Willkommen, „Trial endet in 3 Tagen", „Zahlung fehlgeschlagen", „Abo aktiv"
- [ ] Onboarding-Checkliste im Dashboard (erster Kunde, erstes Objekt, Profil ausfüllen)

---

## Phase 6 — Admin-/Betreiber-Dashboard (intern)

- [ ] `SUPERADMIN`-Rolle (nur dein Account)
- [ ] `/admin`: alle Organisationen, Status, Plan, Trial/zahlend
- [ ] Kennzahlen: MRR, aktive Tenants, Trial-Conversion, Churn
- [ ] Plan manuell anpassen (Support-Fälle)

---

## Phase 7 — Browser-QA & Optimierung (Chrome-Inspektion)

> Voraussetzung: lauffähiger Build (Phase 1). Browser-Automatisierung muss erst angebunden werden
> (chrome-devtools MCP **oder** Playwright) — ist aktuell nicht installiert.

- [ ] chrome-devtools MCP **oder** Playwright einrichten
- [ ] App lokal/staging starten und durchklicken (Login, Kunden, Objekte, Call-Notes)
- [ ] Konsolen-Fehler & fehlgeschlagene Netzwerkrequests erfassen
- [ ] Performance-Audit (Lighthouse): Ladezeiten, Bundle-Size, LCP
- [ ] Accessibility-Audit (a11y)
- [ ] i18n-Lücken finden (fehlende Translation-Keys, hartcodierte Strings)
- [ ] UX-Schwachstellen + Optimierungsliste erstellen → Tickets

---

## Phase 8 — Launch-Vorbereitung

- [ ] DSGVO: AVV mit Supabase, Datenschutzerklärung, Impressum, AGB
- [ ] Cookie-/Consent-Banner (falls Analytics)
- [ ] Fehler-Monitoring (Sentry o.ä.) + Uptime-Monitoring
- [ ] Backups (Supabase Point-in-Time-Recovery prüfen)
- [ ] Rate-Limiting & Security-Headers (Nginx-Config existiert bereits)
- [ ] Landing-Page mit Preisen + Call-to-Action
- [ ] Erste Beta-Makler onboarden

---

## Empfohlene Reihenfolge (Kritischer Pfad)

```
Phase 0 ✅ → Phase 1 (Supabase+Hosting) → Phase 2 (Multi-Tenancy)
        → Phase 3 (Limits) → Phase 4 (Stripe) → Phase 5 (Onboarding)
        → Phase 6 (Admin) → Phase 7 (QA) → Phase 8 (Launch)
```

Phase 1 & 2 sind das Fundament — ohne saubere Tenant-Trennung kann Stripe nicht pro Kunde abrechnen.

## Recherche-Notizen (Supabase Hybrid)

- **Connection Pooling:** App über Transaction-Pooler (Port 6543, `*.pooler.supabase.com`) mit HikariCP; Migrationen über Session-Connection (5432). Bei PgBouncer-Transaction-Mode ggf. `prepareThreshold=0`.
- **Hosting Backend:** Railway (~5 $/Mo Hobby) empfohlen für Spring Boot; Render-Free hat 15-Min-Cold-Start; Fly.io hat keinen Free-Tier mehr. JVM braucht ~512MB–1GB RAM.
- **Storage:** Supabase Storage (S3-kompatibel) mit signierten URLs statt lokalem Dateisystem.
