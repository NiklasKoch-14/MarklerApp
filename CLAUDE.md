# MarklerApp Development Guidelines

**Updated**: 2026-01-29 | **Status**: Phase 5.1 & T110 Complete

## Project Context
German Real Estate CRM with bilingual (DE/EN) support, GDPR compliance. Being evolved into a multi-tenant SaaS (see PLAN.md).

## Tech Stack
**Backend**: Java 17, Spring Boot 3.2.0, PostgreSQL 15 (Supabase in prod), JWT auth, Flyway migrations
**Frontend**: Angular 17 standalone components, TypeScript 5+, Tailwind CSS, i18n
**DevOps**: Docker Compose, Maven, npm

**Key Paths**:
- Backend: `backend/src/main/java/com/marklerapp/crm/{controller,service,entity,dto,repository,config}`
- Frontend: `frontend/src/app/{core,features,layout,shared}`
- Migrations: `backend/src/main/resources/db/migration/`
- Translations: `frontend/src/assets/i18n/{de,en}.json`
- Specs: `specs/001-realestate-crm/{spec,plan,tasks}.md`

## Critical Rules

### 🌍 i18n MANDATORY
**EVERY UI text MUST use translation keys. NO hardcoded strings.**

❌ WRONG:
```html
<button>Add Property</button>
<span>Interested</span>
```

✅ CORRECT:
```html
<button>{{ 'properties.add' | translate }}</button>
<span>{{ outcome | translateEnum:'callOutcome' }}</span>
```

**Patterns**:
- Templates: `{{ 'key' | translate }}`
- Enums: `{{ value | translateEnum:'type' }}` (NEVER format in service methods)
- Dynamic: `{{ 'key' | translate: {param: value} }}`
- Programmatic: Inject `TranslateService`

**Files**: `frontend/src/assets/i18n/{de,en}.json`
**Pre-commit**: Test language switch, verify both translation files updated

### 🔀 Git Workflow

**Feature Branches** (for major features/phases):
1. `git checkout main && git pull`
2. `git checkout -b feature/description`
3. Develop with commits
4. **QUALITY GATE**: Verify no errors (backend:8085, frontend:4200)
5. `git push -u origin feature/description` (NO PR creation)

**Prohibited**:
- ❌ `git push --force`, `git reset --hard`, `git clean -f`
- ❌ `git branch -D`, `git rm -rf`
- ❌ `git checkout .`, `git restore .`

**Require Confirmation**:
- ⚠️ Architectural changes, security configs, production settings, major version bumps

### 🔑 Permissions Summary

**Authorized**: Read/write/create files, standard bash/git/build commands, code modifications, migrations, refactoring
**Forbidden**: Force push, hard reset, branch deletion, bulk file deletion
**Details**: See `docs/PERMISSIONS.md` for complete list

## Recent Implementation Patterns (Last 5)

### 1. Enum Translation (Jan 2026)
**Rule**: Always use `translateEnum` pipe, NEVER format enums in services
```typescript
// Template ONLY
{{ note.callType | translateEnum:'callType' }}
```
**Why**: Service methods bypass i18n, language switching fails
**Impact**: Removed 115 lines of duplicate code

### 2. Controller Endpoint Mapping
❌ `@RequestMapping("/api/properties")`
✅ `@RequestMapping("/properties")`
**Why**: `context-path: /api/v1` already prefixes all endpoints

### 3. Jackson Enum Coercion
**File**: `backend/.../config/JacksonConfig.java`
```java
objectMapper.coercionConfigFor(LogicalType.Enum)
    .setCoercion(CoercionInputShape.EmptyString, CoercionAction.AsNull);
```
**Why**: Frontend sends `""` for optional enums

### 4. Validation Error Display
**Backend**: `GlobalExceptionHandler` returns `fieldErrors: { field: "msg" }`
**Frontend**: Check `field.hasError('serverError')` → `fieldErrors[field]` → frontend validation
**UX**: Implement `getFieldDisplayName()` + `scrollToFirstError()`

### 5. Rule-based Call Note Summaries
**Service**: `CallNoteSummaryService` generates deterministic, rule-based summaries (detailed/quick/timeline/period) — no external AI dependency.
**Note**: The former Ollama AI summary was removed (see PLAN.md). A cloud-based AI summary may return later as a paid tier feature.

## Development Commands

```bash
# Start stack
docker compose -f docker-compose.dev.yml up --build

# Access: Frontend:4200, Backend:8085, API Docs:8085/swagger-ui.html

# Manual
cd backend && mvn spring-boot:run
cd frontend && npm install && npm start

# Test
cd frontend && npm test && npm run lint
cd backend && mvn test
```

## Implementation Status

**Completed**: Phase 1-4 (Foundation, Client Management, Call Notes), Phase 5.1 (Property fixes), T110 (AI Summarization)
**Next**: Phase 5 - Property Management (entities, search, matching, image upload)
**Future**: Phase 6 - Email integration, reporting, analytics

## Code Conventions

**Backend**: Controller→Service→Repository, singular entity names, DTOs with "Dto" suffix, Bean Validation
**Frontend**: Standalone components, reactive forms, BehaviorSubjects for state, Tailwind utilities
**Database**: snake_case, Flyway migrations, strategic indexes
**Security**: JWT tokens, role-based access, GDPR audit logging

## Quality Gates
- Services start without errors (backend:8085, frontend:4200)
- All code compiles
- NO hardcoded UI strings (use i18n)
- Both de.json and en.json updated
- Follow existing patterns

---

**Deployment**: See `README.md` for deployment instructions
**Docs**: See `specs/` for detailed requirements, `docs/` for supplementary guides
**Agents**: Use specialized agents (angular-ui-architect, i18n-translator, spring-backend-expert) in parallel when appropriate
**Structure**: See `docs/PROJECT_STRUCTURE.md` for detailed folder organization
