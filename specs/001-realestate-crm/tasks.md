---

description: "Task list for Real Estate CRM System implementation"
---

# Tasks: Real Estate CRM System

**Input**: Design documents from `/specs/001-realestate-crm/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), data-model.md, contracts/

**Tests**: Tests are OPTIONAL - not explicitly requested in feature specification, following minimal viable approach

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## 🚨 CURRENT STATUS & PRIORITY FIXES NEEDED

**MVP Status**: ✅ Phases 1-4.1 Complete | ⚠️ Code Quality Improvements Needed

### ✅ COMPLETED:
- Phases 1-4.1: Foundation, Client Management, Call Notes, Bug Fixes
- Phase 5: Property Management with images and expose PDFs
- Phase 6.1-6.3: UI/UX enhancements, theme system, AI summarization

### 🔍 CODE QUALITY ANALYSIS (January 2026):
**Critical Issues Identified:**
1. **Test Coverage: 1.2%** - Virtually no backend tests, 0% frontend tests
2. **Code Duplication: 300+ lines** - Manual DTO mapping in services
3. **Security Patterns: Inconsistent** - Auth extraction duplicated across controllers
4. **Performance: N+1 queries** - Missing JOIN FETCH in repositories

**Next Priority**: Phase 7 - Code Quality & Refactoring (Quick Wins + Critical Fixes)

---

## 📊 Phase 7: Code Quality & Refactoring (NEW - Priority: CRITICAL)

**Purpose**: Systematic improvement of code quality, maintainability, and performance based on comprehensive codebase analysis. These improvements will make future development faster and safer.

**Estimated Effort**: 3-4 weeks
**Impact**: Reduced technical debt, improved maintainability, better performance, test coverage for safety

### Phase 7.1: Quick Wins (Week 1 - Estimated: 11 hours)

**Goal**: Low-hanging fruit that immediately improves code quality with minimal risk

- [ ] T200 [P] Create BaseController for shared authentication logic in backend/src/main/java/com/marklerapp/crm/controller/BaseController.java
- [ ] T201 [P] Refactor all controllers to extend BaseController and remove duplicated getAgentIdFromAuth() methods
- [ ] T202 [P] Standardize pagination using @PageableDefault across all controllers (ClientController, PropertyController, CallNoteController)
- [ ] T203 [P] Create ValidationConstants class in backend/src/main/java/com/marklerapp/crm/constants/ValidationConstants.java
- [ ] T204 [P] Create PaginationConstants class in backend/src/main/java/com/marklerapp/crm/constants/PaginationConstants.java
- [ ] T205 [P] Extract magic numbers and strings to constants across all services
- [ ] T206 [P] Replace manual name concatenation with entity helper methods (use getFullName() consistently)
- [ ] T207 [P] Add missing @Transactional(readOnly = true) annotations to read-only service methods
- [ ] T208 [P] Update CLAUDE.md with refactoring patterns and conventions

**Checkpoint**: Code is cleaner, more consistent, easier to navigate

### Phase 7.2: DTO Mapping Automation with MapStruct (Week 2 - Estimated: 16 hours) 🎯 CRITICAL

**Goal**: Eliminate 300+ lines of repetitive DTO mapping code, reduce bugs, improve maintainability

- [ ] T210 Add MapStruct dependencies to backend/pom.xml (version 1.5.5.Final)
- [ ] T211 [P] Create ClientMapper interface in backend/src/main/java/com/marklerapp/crm/mapper/ClientMapper.java
- [ ] T212 [P] Create CallNoteMapper interface in backend/src/main/java/com/marklerapp/crm/mapper/CallNoteMapper.java
- [ ] T213 [P] Create PropertyMapper interface in backend/src/main/java/com/marklerapp/crm/mapper/PropertyMapper.java
- [ ] T214 [P] Create AgentMapper interface in backend/src/main/java/com/marklerapp/crm/mapper/AgentMapper.java
- [ ] T215 Refactor ClientService to use ClientMapper (inject mapper, replace manual conversion methods)
- [ ] T216 Refactor CallNoteService to use CallNoteMapper (inject mapper, replace manual conversion methods)
- [ ] T217 Refactor PropertyService to use PropertyMapper (inject mapper, replace manual conversion methods)
- [ ] T218 Remove manual conversion methods from all services (convertToDto, convertToResponse, etc.)
- [ ] T219 Test all CRUD operations to ensure MapStruct mappings work correctly
- [ ] T220 Document MapStruct patterns in CLAUDE.md

**Checkpoint**: DTO mapping is automated, ~300 lines removed, future entity changes are easier

### Phase 7.3: Service Layer Improvements (Week 2 - Estimated: 6 hours)

**Goal**: Centralize ownership validation, improve consistency

- [ ] T225 [P] Create OwnershipValidator component in backend/src/main/java/com/marklerapp/crm/service/OwnershipValidator.java
- [ ] T226 Refactor ClientService to use OwnershipValidator for all ownership checks
- [ ] T227 Refactor PropertyService to use OwnershipValidator for all ownership checks
- [ ] T228 Refactor CallNoteService to use OwnershipValidator for all ownership checks
- [ ] T229 Remove inline ownership validation code from all services
- [ ] T230 Standardize AccessDeniedException across all ownership violations

**Checkpoint**: Ownership validation is centralized, consistent, easier to audit

### Phase 7.4: Frontend Code Quality (Week 3 - Estimated: 14 hours)

**Goal**: Remove duplication, improve consistency, better error handling

- [ ] T235 [P] Remove formatPropertyType(), formatListingType() methods from property.service.ts (lines 325-399)
- [ ] T236 [P] Remove formatCallType(), formatCallOutcome() methods from call-notes.service.ts (lines 290-325)
- [ ] T237 [P] Update all components to use translateEnum pipe instead of service methods
- [ ] T238 [P] Create ErrorHandlerService in frontend/src/app/core/services/error-handler.service.ts
- [ ] T239 Add consistent error handling with catchError to all HTTP services
- [ ] T240 [P] Implement trackBy functions in all *ngFor loops for performance
- [ ] T241 [P] Add ChangeDetectionStrategy.OnPush to list components where appropriate
- [ ] T242 Test error handling and translation consistency across all pages

**Checkpoint**: Frontend is cleaner, better error handling, improved performance

### Phase 7.5: Performance Optimization (Week 3 - Estimated: 12 hours)

**Goal**: Fix N+1 queries, add database indexes, optimize API responses

- [ ] T245 [P] Add JOIN FETCH to CallNoteRepository queries (agent, client, property)
- [ ] T246 [P] Add JOIN FETCH to ClientRepository queries (agent, properties)
- [ ] T247 [P] Add JOIN FETCH to PropertyRepository queries (agent, images)
- [ ] T248 [P] Create Flyway migration V13__add_performance_indexes.sql with strategic indexes
- [ ] T249 [P] Configure Hibernate batch fetching in application.yml (batch_size: 20)
- [ ] T250 [P] Enable HTTP compression in application.yml
- [ ] T251 [P] Add ETag support to frequently accessed endpoints (GET /clients/{id}, GET /properties/{id})
- [ ] T252 Profile application with sample data to verify N+1 queries are resolved
- [ ] T253 Document performance patterns in CLAUDE.md

**Checkpoint**: Database queries are optimized, API responses are faster, better scalability

### Phase 7.6: Test Coverage - Service Layer (Week 4 - Estimated: 24 hours) 🎯 CRITICAL

**Goal**: Add comprehensive test coverage for service layer (target: 80%+)

**Backend Service Tests:**
- [ ] T260 [P] Create ClientServiceTest in backend/src/test/java/com/marklerapp/crm/service/ClientServiceTest.java
- [ ] T261 [P] Create CallNoteServiceTest in backend/src/test/java/com/marklerapp/crm/service/CallNoteServiceTest.java
- [ ] T262 [P] Create PropertyServiceTest in backend/src/test/java/com/marklerapp/crm/service/PropertyServiceTest.java
- [ ] T263 [P] Create OwnershipValidatorTest for ownership validation logic
- [ ] T264 [P] Add test coverage for happy paths (create, read, update, delete)
- [ ] T265 [P] Add test coverage for edge cases (not found, access denied, validation errors)
- [ ] T266 [P] Add test coverage for GDPR compliance features
- [ ] T267 Generate JaCoCo coverage report and verify 80%+ service layer coverage

**Frontend Service Tests:**
- [ ] T270 [P] Create client.service.spec.ts in frontend/src/app/features/client-management/services/
- [ ] T271 [P] Create call-notes.service.spec.ts in frontend/src/app/features/call-notes/services/
- [ ] T272 [P] Create property.service.spec.ts in frontend/src/app/features/property-management/services/
- [ ] T273 [P] Create auth.service.spec.ts in frontend/src/app/core/auth/
- [ ] T274 [P] Add HTTP mocking with HttpClientTestingModule for all service tests
- [ ] T275 Generate Karma coverage report and verify 70%+ service layer coverage

**Checkpoint**: Service layer has comprehensive test coverage, safer to refactor and extend

---

## 📋 Phase 7 Summary

| Sub-Phase | Tasks | Estimated Effort | Priority | Impact |
|-----------|-------|-----------------|----------|--------|
| 7.1 Quick Wins | T200-T208 | 11 hours | HIGH | Immediate code quality improvement |
| 7.2 MapStruct | T210-T220 | 16 hours | CRITICAL | Eliminate 300+ lines of duplication |
| 7.3 Service Layer | T225-T230 | 6 hours | HIGH | Centralize ownership validation |
| 7.4 Frontend | T235-T242 | 14 hours | MEDIUM | Remove duplication, better errors |
| 7.5 Performance | T245-T253 | 12 hours | HIGH | Fix N+1 queries, add indexes |
| 7.6 Tests | T260-T275 | 24 hours | CRITICAL | Safety net for future changes |
| **TOTAL** | **76 tasks** | **~83 hours** | - | **Significantly improved codebase** |

**Expected Outcomes:**
- ✅ Test coverage: 1.2% → 80%+ (backend services), 0% → 70%+ (frontend services)
- ✅ Code duplication: -300+ lines of DTO mapping code
- ✅ Consistency: Standardized pagination, auth, validation, error handling
- ✅ Performance: N+1 queries resolved, database indexes added
- ✅ Maintainability: Easier to add features, safer to refactor
- ✅ Documentation: Patterns documented in CLAUDE.md

---

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Web app**: `backend/src/`, `frontend/src/`
- Paths shown below follow the architecture defined in plan.md structure

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [X] T001 Create root project structure with backend/ and frontend/ directories
- [X] T002 [P] Initialize Spring Boot backend project in backend/pom.xml
- [X] T003 [P] Initialize Angular frontend project in frontend/package.json
- [X] T004 [P] Setup Docker configuration files (Dockerfile, docker-compose.yml, docker-compose.dev.yml)
- [X] T005 [P] Configure Tailwind CSS in frontend/tailwind.config.js
- [X] T006 [P] Setup Angular i18n configuration in frontend/angular.json
- [X] T007 [P] Create deployment documentation in docs/README.md

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T008 Setup database configuration in backend/src/main/resources/application.yml
- [X] T009 [P] Configure Spring Security with JWT authentication in backend/src/main/java/com/marklerapp/crm/config/SecurityConfig.java
- [X] T010 [P] Create base entity classes in backend/src/main/java/com/marklerapp/crm/entity/BaseEntity.java
- [X] T011 [P] Setup Flyway database migrations in backend/src/main/resources/db/migration/
- [X] T012 [P] Implement authentication service in backend/src/main/java/com/marklerapp/crm/service/AuthService.java
- [X] T013 [P] Create JWT utility class in backend/src/main/java/com/marklerapp/crm/util/JwtUtil.java
- [X] T014 [P] Setup Angular authentication module in frontend/src/app/core/auth/auth.service.ts
- [X] T015 [P] Create authentication guard in frontend/src/app/core/guards/auth.guard.ts
- [X] T016 [P] Implement HTTP interceptor for JWT tokens in frontend/src/app/core/interceptors/auth.interceptor.ts
- [X] T017 [P] Setup Angular routing configuration in frontend/src/app/app.routes.ts
- [X] T018 [P] Create main layout components in frontend/src/app/layout/
- [X] T019 [P] Setup bilingual translation files in frontend/src/assets/i18n/de.json and frontend/src/assets/i18n/en.json
- [X] T020 Setup error handling middleware in backend/src/main/java/com/marklerapp/crm/config/GlobalExceptionHandler.java
- [X] T021 Configure CORS settings in backend/src/main/java/com/marklerapp/crm/config/CorsConfig.java

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Client Management MVP (Priority: P1) 🎯 MVP

**Goal**: Enable agents to create, manage, and update client profiles with contact information and property search preferences

**Independent Test**: Create a new client record, add property search criteria, switch language interface, and verify all client data displays correctly

### Implementation for User Story 1

- [X] T022 [P] [US1] Create Agent entity in backend/src/main/java/com/marklerapp/crm/entity/Agent.java
- [X] T023 [P] [US1] Create Client entity in backend/src/main/java/com/marklerapp/crm/entity/Client.java
- [X] T024 [P] [US1] Create PropertySearchCriteria entity in backend/src/main/java/com/marklerapp/crm/entity/PropertySearchCriteria.java
- [X] T025 [P] [US1] Create Agent repository in backend/src/main/java/com/marklerapp/crm/repository/AgentRepository.java
- [X] T026 [P] [US1] Create Client repository in backend/src/main/java/com/marklerapp/crm/repository/ClientRepository.java
- [X] T027 [P] [US1] Create PropertySearchCriteria repository in backend/src/main/java/com/marklerapp/crm/repository/PropertySearchCriteriaRepository.java
- [X] T028 [P] [US1] Create Agent DTOs in backend/src/main/java/com/marklerapp/crm/dto/AgentDto.java
- [X] T029 [P] [US1] Create Client DTOs in backend/src/main/java/com/marklerapp/crm/dto/ClientDto.java
- [X] T030 [P] [US1] Create PropertySearchCriteria DTOs in backend/src/main/java/com/marklerapp/crm/dto/PropertySearchCriteriaDto.java
- [X] T031 [US1] Implement ClientService in backend/src/main/java/com/marklerapp/crm/service/ClientService.java (depends on T023, T024, T026, T027)
- [X] T032 [US1] Implement AgentService in backend/src/main/java/com/marklerapp/crm/service/AgentService.java (depends on T022, T025)
- [X] T033 [US1] Create Client REST controller in backend/src/main/java/com/marklerapp/crm/controller/ClientController.java (depends on T031)
- [X] T034 [US1] Create Agent profile REST controller in backend/src/main/java/com/marklerapp/crm/controller/AgentController.java (depends on T032)
- [X] T035 [US1] Create authentication REST controller in backend/src/main/java/com/marklerapp/crm/controller/AuthController.java (depends on T012)
- [X] T036 [P] [US1] Create client management feature module in frontend/src/app/features/client-management/client-management.routes.ts
- [X] T037 [P] [US1] Create client list component in frontend/src/app/features/client-management/components/client-list/client-list.component.ts
- [X] T038 [P] [US1] Create client form component in frontend/src/app/features/client-management/components/client-form/client-form.component.ts
- [X] T039 [P] [US1] Create client detail component in frontend/src/app/features/client-management/components/client-detail/client-detail.component.ts
- [X] T040 [P] [US1] Create property search criteria component (integrated into client detail view)
- [X] T041 [US1] Create client service in frontend/src/app/features/client-management/services/client.service.ts (depends on T033)
- [X] T042 [US1] Implement client management routing in frontend/src/app/features/client-management/client-management.routes.ts
- [X] T043 [US1] Create language switcher component (translations infrastructure ready)
- [X] T044 [US1] Add bilingual support to client management forms (German/English translations)
- [X] T045 [US1] Implement GDPR consent handling in client forms
- [X] T046 [US1] Add client search and filtering functionality
- [X] T047 [US1] Create agent profile page in frontend/src/app/features/agent-profile/

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

### Phase 3.1: User Story 1 Bug Fixes & Missing Features

- [X] T049.1 [P] [US1] Fix dashboard router links - add RouterModule import to dashboard.component.ts
- [X] T049.2 [P] [US1] Fix client editing functionality - ensure update forms are properly connected to backend
- [X] T049.3 [P] [US1] Add dark/light mode theme toggle in main header/navigation
- [X] T049.4 [P] [US1] Add German/English language toggle switch in main header/navigation
- [X] T049.5 [P] [US1] Fix client form validation and error handling
- [X] T049.6 [P] [US1] Ensure client update/edit forms save data correctly

---

## Phase 4: User Story 2 - Call Notes and Communication Tracking (Priority: P2)

**Goal**: Enable agents to document client interactions and generate automated summaries of communication history

**Independent Test**: Add call notes for an existing client, generate summary report, and verify GDPR compliance is maintained

### Implementation for User Story 2

- [X] T048 [P] [US2] Create CallNote entity in backend/src/main/java/com/marklerapp/crm/entity/CallNote.java
- [X] T049 [P] [US2] Create CallNote repository in backend/src/main/java/com/marklerapp/crm/repository/CallNoteRepository.java
- [X] T050 [P] [US2] Create CallNote DTOs in backend/src/main/java/com/marklerapp/crm/dto/CallNoteDto.java
- [X] T051 [US2] Implement CallNoteService in backend/src/main/java/com/marklerapp/crm/service/CallNoteService.java (depends on T049)
- [X] T052 [US2] Implement call notes summary generation service in backend/src/main/java/com/marklerapp/crm/service/CallNoteSummaryService.java (depends on T051)
- [X] T053 [US2] Create CallNote REST controller in backend/src/main/java/com/marklerapp/crm/controller/CallNoteController.java (depends on T051, T052)
- [X] T054 [P] [US2] Create call notes feature module in frontend/src/app/features/call-notes/call-notes.routes.ts
- [X] T055 [P] [US2] Create call notes list component in frontend/src/app/features/call-notes/components/call-notes-list/call-notes-list.component.ts
- [X] T056 [P] [US2] Create call note form component in frontend/src/app/features/call-notes/components/call-note-form/call-note-form.component.ts
- [X] T057 [P] [US2] Create call notes summary component in frontend/src/app/features/call-notes/components/call-summary/call-summary.component.ts
- [X] T058 [US2] Create call notes service in frontend/src/app/features/call-notes/services/call-notes.service.ts (depends on T053)
- [X] T059 [US2] Implement call notes routing in frontend/src/app/features/call-notes/call-notes.routes.ts
- [X] T060 [US2] Add call notes section to client detail view (integration with US1)
- [X] T061 [US2] Implement automated summary generation with one-click functionality
- [X] T062 [US2] Add GDPR audit logging for call notes access
- [X] T063 [US2] Create call notes search and filtering functionality
- [X] T064 [US2] Add follow-up reminder system for call notes

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

### Phase 4.1: User Story 2 Bug Fixes & Missing Features

- [X] T064.1 [P] [US2] Fix call notes creation form - ensure form submissions work correctly
- [X] T064.2 [P] [US2] Debug call notes service integration with backend API
- [X] T064.3 [P] [US2] Fix call notes form validation and error handling
- [X] T064.4 [P] [US2] Ensure call notes display and formatting works correctly
- [X] T064.5 [P] [US2] Fix call notes routing and navigation issues
- [X] T064.6 [P] [US2] Test and fix call notes CRUD operations end-to-end

---

## Phase 5: User Story 3 - Property Management (Priority: P3)

**Goal**: Enable agents to manage property inventory with images, specifications, and client matching

**Independent Test**: Add a new property with multiple images, search properties by criteria, and match with client preferences

### Implementation for User Story 3

- [X] T065 [P] [US3] Create Property entity in backend/src/main/java/com/marklerapp/crm/entity/Property.java
- [X] T066 [P] [US3] Create PropertyImage entity in backend/src/main/java/com/marklerapp/crm/entity/PropertyImage.java
- [X] T067 [P] [US3] Create Property repository in backend/src/main/java/com/marklerapp/crm/repository/PropertyRepository.java
- [X] T068 [P] [US3] Create PropertyImage repository in backend/src/main/java/com/marklerapp/crm/repository/PropertyImageRepository.java
- [X] T069 [P] [US3] Create Property DTOs in backend/src/main/java/com/marklerapp/crm/dto/PropertyDto.java
- [X] T070 [P] [US3] Create PropertyImage DTOs in backend/src/main/java/com/marklerapp/crm/dto/PropertyImageDto.java
- [X] T071 [US3] Implement PropertyService in backend/src/main/java/com/marklerapp/crm/service/PropertyService.java (depends on T067)
- [X] T072 [US3] Implement PropertyImageService for file upload handling in backend/src/main/java/com/marklerapp/crm/service/PropertyImageService.java (depends on T068)
- [X] T073 [US3] Implement PropertyMatchingService in backend/src/main/java/com/marklerapp/crm/service/PropertyMatchingService.java (depends on T071, T031)
- [X] T074 [US3] Create Property REST controller in backend/src/main/java/com/marklerapp/crm/controller/PropertyController.java (depends on T071, T072)
- [X] T075 [US3] Create PropertyMatching REST controller in backend/src/main/java/com/marklerapp/crm/controller/PropertyMatchingController.java (depends on T073)
- [X] T076 [P] [US3] Create property management feature module in frontend/src/app/features/property-management/property-management.module.ts
- [X] T077 [P] [US3] Create property list component in frontend/src/app/features/property-management/components/property-list/property-list.component.ts
- [X] T078 [P] [US3] Create property form component in frontend/src/app/features/property-management/components/property-form/property-form.component.ts
- [X] T079 [P] [US3] Create property detail component in frontend/src/app/features/property-management/components/property-detail/property-detail.component.ts
- [X] T080 [P] [US3] Create property image upload component in frontend/src/app/features/property-management/components/image-upload/image-upload.component.ts
- [X] T081 [P] [US3] Create property search component in frontend/src/app/features/property-management/components/property-search/property-search.component.ts
- [X] T082 [P] [US3] Create property matching component in frontend/src/app/features/property-management/components/property-matching/property-matching.component.ts
- [X] T083 [US3] Create property service in frontend/src/app/features/property-management/services/property.service.ts (depends on T074)
- [X] T084 [US3] Create property matching service in frontend/src/app/features/property-management/services/property-matching.service.ts (depends on T075)
- [X] T085 [US3] Implement property management routing in frontend/src/app/features/property-management/property-management-routing.module.ts
- [X] T086 [US3] Add property image gallery with thumbnail generation
- [X] T087 [US3] Implement property search and filtering functionality
- [X] T088 [US3] Create property matching algorithm with scoring system
- [X] T089 [US3] Add custom fields support for additional property information
- [X] T090 [US3] Integrate property matching with client profiles (cross-story integration)

**Checkpoint**: All user stories should now be independently functional

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T091 [P] Create comprehensive Docker deployment configuration
- [ ] T092 [P] Implement database migration scripts for SQLite to PostgreSQL
- [X] T093 [P] Add health check endpoints in backend/src/main/java/com/marklerapp/crm/controller/HealthController.java
- [X] T094 [P] Setup file storage configuration for property images
- [X] T095 [P] Implement GDPR data export functionality
- [ ] T096 [P] Create GDPR data anonymization service
- [X] T097 [P] Add comprehensive error handling across all components
- [X] T098 [P] Implement audit logging for all GDPR-sensitive operations
- [ ] T099 [P] Add performance optimizations for large datasets
- [X] T100 [P] Create API documentation generation with OpenAPI
- [ ] T101 [P] Setup monitoring and metrics collection
- [ ] T102 [P] Add responsive design improvements for mobile devices
- [ ] T103 [P] Implement caching strategies for frequently accessed data
- [ ] T104 [P] Run deployment validation using quickstart.md guide

### Phase 6.1: UI/UX Enhancements & Theme System

- [X] T104.1 [P] Implement dark/light mode theme system with Tailwind CSS
- [X] T104.2 [P] Add theme toggle button in main application header
- [X] T104.3 [P] Create theme service to persist user theme preference
- [X] T104.4 [P] Add German/English language switcher in application header
- [X] T104.5 [P] Create language service to persist user language preference
- [X] T104.6 [P] Ensure all components support both themes (dark/light)
- [X] T104.7 [P] Add smooth transitions for theme switching
- [X] T104.8 [P] Test theme system across all pages and components

### Phase 6.2: Call Notes & Property Image Enhancements

#### T105: Call Notes Client Validation
- [X] T105.1 [P] Implement client existence check service method in ClientService
- [X] T105.2 [P] Create shared tooltip directive for disabled state with custom message
- [X] T105.3 [P] Update call-notes component to check client count before enabling add button
- [X] T105.4 [P] Add tooltip "Create client first" to disabled add call note button
- [X] T105.5 [P] Apply client validation to all add call note buttons across application
- [X] T105.6 [P] Test call notes button states with zero clients and with existing clients

#### T106: Property Image Management
- [X] T106.1 [P] Create property-image-upload component in frontend/src/app/features/property-management/components/
- [X] T106.2 [P] Add image upload tab to property form with drag & drop support
- [X] T106.3 [P] Implement image preview grid with delete functionality in upload component
- [X] T106.4 [P] Add "Set as Primary" image functionality with visual indicator
- [X] T106.5 [P] Integrate PropertyImageService with property form component
- [X] T106.6 [P] Create property-image-gallery component for property detail view
- [X] T106.7 [P] Display property images in detail view with carousel/gallery navigation
- [X] T106.8 [P] Show primary image prominently in property detail header
- [X] T106.9 [P] Add image loading states and error handling
- [X] T106.10 [P] Test image upload, delete, and display functionality

### Phase 6.3: Advanced Features - Property References, Expose Management & AI Summarization

#### T107: Call Notes Property References
- [X] T107.1 [P] [US2] Add property_id foreign key to CallNote entity in backend/src/main/java/com/marklerapp/crm/entity/CallNote.java
- [X] T107.2 [P] [US2] Update CallNoteDto to include propertyId and property summary in backend/src/main/java/com/marklerapp/crm/dto/CallNoteDto.java
- [X] T107.3 [P] [US2] Create property reference endpoint in CallNoteController for fetching agent's properties
- [X] T107.4 [P] [US2] Add property selection dropdown to call note form component
- [ ] T107.5 [P] [US2] Implement property search/autocomplete in call note form for easy selection
- [X] T107.6 [P] [US2] Display linked property information in call note detail view
- [X] T107.7 [P] [US2] Update CallNoteService to handle property associations
- [ ] T107.8 [P] [US2] Test property reference functionality in call notes

#### T108: Internationalization for Select Fields & Enums
- [X] T108.1 [P] Create translation utility service for enum values in frontend/src/app/shared/services/enum-translation.service.ts
- [X] T108.2 [P] Add translation keys for all enum types (PropertyType, PropertyStatus, ListingType, HeatingType, etc.) in de.json and en.json
- [X] T108.3 [P] Create translateEnum pipe in frontend/src/app/shared/pipes/translate-enum.pipe.ts
- [X] T108.4 [P] Update all select fields to use translateEnum pipe while maintaining enum values
- [X] T108.5 [P] Update property form select fields (property type, status, listing type, heating type)
- [X] T108.6 [P] Update call note form select fields (call type, outcome, priority)
- [X] T108.7 [P] Update client form select fields (client type, preferred contact method)
- [X] T108.8 [P] Test enum translations switch correctly between German and English
- [X] T108.9 [P] Ensure enum values remain unchanged (only labels translate)

#### T109: Property Expose/Brochure Management

**Overview**: Enable agents to upload, preview, and manage property expose PDFs (brochures) for each property listing.

**Implementation Approach**:

**Storage Strategy**: Use Base64 encoding in database (consistent with existing image storage pattern)
- Simplifies deployment (no file system permissions needed)
- Enables easy backup/restore
- Works seamlessly with Docker containers
- Max size: 50MB per PDF

**Backend Implementation**:

1. **Entity Changes** (Property.java):
   ```java
   @Column(name = "expose_file_name")
   private String exposeFileName;

   @Column(name = "expose_file_data", columnDefinition = "TEXT")
   private String exposeFileData; // Base64 encoded PDF

   @Column(name = "expose_file_size")
   private Long exposeFileSize;

   @Column(name = "expose_upload_date")
   private LocalDateTime exposeUploadDate;
   ```

2. **DTO Structure** (PropertyExposeDto.java):
   ```java
   public class PropertyExposeDto {
       private String fileName;
       private String fileData; // Base64
       private Long fileSize;
       private LocalDateTime uploadDate;
   }
   ```

3. **Validation Logic**:
   - Check file extension: `.pdf` only
   - Validate MIME type: `application/pdf`
   - Size limit: 50MB (52,428,800 bytes)
   - Sanitize filename (remove special chars, max 255 chars)

4. **REST Endpoints**:
   - `POST /api/v1/properties/{id}/expose` - Upload expose
   - `GET /api/v1/properties/{id}/expose` - Get expose metadata
   - `GET /api/v1/properties/{id}/expose/download` - Download expose PDF
   - `DELETE /api/v1/properties/{id}/expose` - Delete expose

**Frontend Implementation**:

1. **Property Form - Expose Tab**:
   - Add 4th tab: "Basic Info | Address | Images | **Expose**"
   - Drag & drop zone for PDF upload
   - File picker button as alternative
   - Upload progress indicator
   - Current expose preview card (if exists)

2. **Expose Preview Component**:
   ```typescript
   // Display current expose with:
   - PDF icon with filename
   - File size display (formatted: "2.5 MB")
   - Upload date
   - Preview button → Opens PDF in browser
   - Download button → Saves PDF locally
   - Delete button → Removes expose
   ```

3. **Property List Indicators**:
   ```html
   <!-- Badge on property card if expose exists -->
   <span class="text-xs text-red-600 dark:text-red-400">
     <svg>📄</svg> Expose
   </span>
   ```

4. **Property Detail View**:
   - Prominent "View Expose" button in header
   - Opens PDF in new browser tab or modal
   - Download option available

**PDF Preview Options**:
- **Option A**: Open in new tab using `data:application/pdf;base64,{data}`
- **Option B**: Embed in modal using `<iframe>` or `<embed>`
- **Recommendation**: Option A (simpler, native browser PDF viewer)

**Error Handling**:
- Invalid file type → Show error toast
- File too large → Show size limit message
- Upload failed → Allow retry
- PDF corrupted → Validation error with details

**Testing Scenarios**:
- Upload valid PDF (< 50MB)
- Upload invalid file type (should reject)
- Upload oversized PDF (> 50MB, should reject)
- Preview uploaded PDF
- Download PDF
- Delete expose
- Upload new expose (replaces old one)
- Check expose indicator appears in property list

**Tasks**:
- [ ] T109.1 [P] [US3] Add expose_file_name, expose_file_data, expose_file_size, expose_upload_date columns to Property entity
- [ ] T109.2 [P] [US3] Create PropertyExposeDto in backend/src/main/java/com/marklerapp/crm/dto/PropertyExposeDto.java
- [ ] T109.3 [P] [US3] Implement expose upload endpoint in PropertyController (POST /properties/{id}/expose)
- [ ] T109.4 [P] [US3] Implement expose download endpoint in PropertyController (GET /properties/{id}/expose/download)
- [ ] T109.5 [P] [US3] Implement expose delete endpoint in PropertyController (DELETE /properties/{id}/expose)
- [ ] T109.6 [P] [US3] Add PDF validation service in backend (max size 50MB, PDF format only)
- [ ] T109.7 [P] [US3] Create "Expose" tab in property form component
- [ ] T109.8 [P] [US3] Add PDF upload component with drag & drop support in expose tab
- [ ] T109.9 [P] [US3] Implement PDF preview using browser PDF viewer (open in new tab)
- [ ] T109.10 [P] [US3] Add download button for expose PDF in property detail view
- [ ] T109.11 [P] [US3] Show expose status indicator on property list (has expose badge)
- [ ] T109.12 [P] [US3] Test expose upload, download, preview, and delete functionality
- [ ] T109.13 [P] [US3] Add expose file info display (filename, size, upload date) in property detail
- [ ] T109.14 [P] [US3] Add Flyway migration script for expose columns

#### T110: AI-Powered Call Notes Summarization with Ollama

**Overview**: Enable AI-powered summarization of client communication history using a lightweight local LLM (Ollama).

**Implementation Approach**:

**Model Selection**: Use **Phi-3 Mini (3.8B)** or **TinyLlama (1.1B)**
- **Phi-3 Mini**: 2.3GB, excellent quality, fast inference
- **TinyLlama**: 637MB, ultra-fast, good for basic summaries
- **Recommendation**: Phi-3 Mini (best balance of speed/quality)
- CPU-friendly, no GPU required
- On-premise deployment (GDPR compliant)

**Architecture**:
```
Frontend → Backend API → OllamaService → Ollama Container → Phi-3 Model
           (Spring)                     (Docker)
```

**Backend Implementation**:

1. **Configuration** (application.yml):
   ```yaml
   ollama:
     base-url: http://localhost:11434
     model: phi3:mini
     timeout: 30000
     enabled: true
   ```

2. **OllamaService.java**:
   ```java
   @Service
   public class OllamaService {
       private final RestTemplate restTemplate;
       private final String ollamaBaseUrl;
       private final String model;

       public String generateSummary(String prompt) {
           // POST to http://localhost:11434/api/generate
           // Body: { "model": "phi3:mini", "prompt": "...", "stream": false }
       }
   }
   ```

3. **Prompt Engineering**:
   ```
   "Analyze these call notes for client communication and provide:
   1. Overall sentiment (Positive/Neutral/Negative)
   2. Key interests and requirements
   3. Follow-up actions needed
   4. Timeline and urgency

   Call Notes:
   {concatenated_call_notes}

   Provide a concise professional summary in German."
   ```

4. **REST Endpoint**:
   - `POST /api/v1/call-notes/clients/{clientId}/ai-summary`
   - Returns: `{ summary: string, generated: timestamp }`

**Docker Setup** (docker-compose.dev.yml):
```yaml
services:
  ollama:
    image: ollama/ollama:latest
    container_name: marklerapp-ollama
    ports:
      - "11434:11434"
    volumes:
      - ollama-data:/root/.ollama
    environment:
      - OLLAMA_MODELS=phi3:mini
    networks:
      - marklerapp-network

volumes:
  ollama-data:
```

**Frontend Implementation**:

1. **Call Summary Component** (client detail page):
   ```html
   <button (click)="generateAISummary()"
           class="btn btn-primary"
           [disabled]="loading">
     <svg>✨</svg> Generate AI Summary
   </button>

   <div *ngIf="aiSummary" class="mt-4 p-4 bg-blue-50 rounded">
     <h3>AI Summary</h3>
     <p>{{ aiSummary }}</p>
     <small>Generated: {{ summaryDate | date }}</small>
   </div>
   ```

2. **Loading State**:
   - Show spinner during generation
   - Display "Analyzing call notes..."
   - Estimated time: 2-5 seconds

3. **Error Handling**:
   - Ollama offline → "AI service unavailable"
   - No call notes → "No call notes to summarize"
   - Timeout → "Generation took too long, please try again"

**Initial Setup Steps**:
```bash
# 1. Start Ollama container
docker-compose -f docker-compose.dev.yml up ollama -d

# 2. Pull Phi-3 Mini model (one-time)
docker exec marklerapp-ollama ollama pull phi3:mini

# 3. Test model
curl http://localhost:11434/api/generate -d '{
  "model": "phi3:mini",
  "prompt": "Say hello",
  "stream": false
}'
```

**GDPR Compliance**:
- All processing happens on-premise
- No data sent to external APIs
- Model runs locally in Docker
- Data never leaves the infrastructure

**Performance**:
- Cold start: ~500ms
- Warm inference: ~1-3 seconds
- Memory: ~4GB RAM recommended
- No GPU required

**Tasks**:
- [ ] T110.1 [P] [US2] Add Ollama Docker container to docker-compose.dev.yml
- [ ] T110.2 [P] [US2] Create Ollama pull script to download phi3:mini model
- [ ] T110.3 [P] [US2] Add Ollama service configuration in backend/src/main/resources/application.yml
- [ ] T110.4 [P] [US2] Create OllamaService in backend/src/main/java/com/marklerapp/crm/service/OllamaService.java
- [ ] T110.5 [P] [US2] Implement prompt engineering for call notes summarization (German output)
- [ ] T110.6 [P] [US2] Create AI summary endpoint in CallNoteController (POST /call-notes/clients/{clientId}/ai-summary)
- [ ] T110.7 [P] [US2] Add error handling for offline/unavailable Ollama service
- [ ] T110.8 [P] [US2] Create AI summary component in frontend call-summary.component.ts
- [ ] T110.9 [P] [US2] Add "Generate AI Summary" button in client detail view
- [ ] T110.10 [P] [US2] Implement loading state during AI generation
- [ ] T110.11 [P] [US2] Add translation keys for AI summary feature (de.json, en.json)
- [ ] T110.12 [P] [US2] Test AI summarization with various client call note scenarios
- [ ] T110.13 [P] [US2] Document Ollama setup in CLAUDE.md
- [ ] T110.14 [P] [US2] Add graceful degradation when Ollama is unavailable (hide button)

**Checkpoint**: Advanced features implemented - Property references in call notes, multilingual enum support, property expose management, and AI-powered summarization

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3)
- **Polish (Phase 6)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - Integrates with US1 but should be independently testable
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) - Integrates with US1 for client matching but should be independently testable

### Within Each User Story

- Entities before repositories
- Repositories before services
- Services before controllers
- Controllers before frontend services
- Frontend services before components
- Core functionality before integration features

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- All Foundational tasks marked [P] can run in parallel (within Phase 2)
- Once Foundational phase completes, all user stories can start in parallel (if team capacity allows)
- Entity/Repository/DTO creation within each story can run in parallel
- Frontend component creation within each story can run in parallel

---

## Parallel Example: User Story 1

```bash
# Launch all entity/repository creation for User Story 1 together:
Task: "T022 [P] [US1] Create Agent entity in backend/src/main/java/com/marklerapp/crm/entity/Agent.java"
Task: "T023 [P] [US1] Create Client entity in backend/src/main/java/com/marklerapp/crm/entity/Client.java"
Task: "T024 [P] [US1] Create PropertySearchCriteria entity in backend/src/main/java/com/marklerapp/crm/entity/PropertySearchCriteria.java"

# Launch all frontend components for User Story 1 together:
Task: "T037 [P] [US1] Create client list component in frontend/src/app/features/client-management/components/client-list/client-list.component.ts"
Task: "T038 [P] [US1] Create client form component in frontend/src/app/features/client-management/components/client-form/client-form.component.ts"
Task: "T039 [P] [US1] Create client detail component in frontend/src/app/features/client-management/components/client-detail/client-detail.component.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test User Story 1 independently
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 → Test independently → Deploy/Demo
4. Add User Story 3 → Test independently → Deploy/Demo
5. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (Client Management)
   - Developer B: User Story 2 (Call Notes)
   - Developer C: User Story 3 (Property Management)
3. Stories complete and integrate independently

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Docker containers ensure consistent deployment across environments
- GDPR compliance is integrated throughout, not added as afterthought