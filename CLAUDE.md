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
| Hosting | Railway (backend Docker), Vercel (frontend — Phase 1.6) |
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
| 1.6 | ⏳ Next | Vercel frontend deployment |
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
