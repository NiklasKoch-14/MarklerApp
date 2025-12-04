---

description: "Task list for Real Estate CRM System implementation"
---

# Tasks: Real Estate CRM System

**Input**: Design documents from `/specs/001-realestate-crm/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), data-model.md, contracts/

**Tests**: Tests are OPTIONAL - not explicitly requested in feature specification, following minimal viable approach

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Web app**: `backend/src/`, `frontend/src/`
- Paths shown below follow the architecture defined in plan.md structure

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [ ] T001 Create root project structure with backend/ and frontend/ directories
- [ ] T002 [P] Initialize Spring Boot backend project in backend/pom.xml
- [ ] T003 [P] Initialize Angular frontend project in frontend/package.json
- [ ] T004 [P] Setup Docker configuration files (Dockerfile, docker-compose.yml, docker-compose.dev.yml)
- [ ] T005 [P] Configure Tailwind CSS in frontend/tailwind.config.js
- [ ] T006 [P] Setup Angular i18n configuration in frontend/angular.json
- [ ] T007 [P] Create deployment documentation in docs/README.md

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T008 Setup database configuration in backend/src/main/resources/application.yml
- [ ] T009 [P] Configure Spring Security with JWT authentication in backend/src/main/java/com/marklerapp/crm/config/SecurityConfig.java
- [ ] T010 [P] Create base entity classes in backend/src/main/java/com/marklerapp/crm/entity/BaseEntity.java
- [ ] T011 [P] Setup Flyway database migrations in backend/src/main/resources/db/migration/
- [ ] T012 [P] Implement authentication service in backend/src/main/java/com/marklerapp/crm/service/AuthService.java
- [ ] T013 [P] Create JWT utility class in backend/src/main/java/com/marklerapp/crm/util/JwtUtil.java
- [ ] T014 [P] Setup Angular authentication module in frontend/src/app/core/auth/auth.module.ts
- [ ] T015 [P] Create authentication guard in frontend/src/app/core/guards/auth.guard.ts
- [ ] T016 [P] Implement HTTP interceptor for JWT tokens in frontend/src/app/core/interceptors/auth.interceptor.ts
- [ ] T017 [P] Setup Angular routing configuration in frontend/src/app/app-routing.module.ts
- [ ] T018 [P] Create main layout components in frontend/src/app/layout/
- [ ] T019 [P] Setup bilingual translation files in frontend/src/assets/i18n/de.json and frontend/src/assets/i18n/en.json
- [ ] T020 Setup error handling middleware in backend/src/main/java/com/marklerapp/crm/config/GlobalExceptionHandler.java
- [ ] T021 Configure CORS settings in backend/src/main/java/com/marklerapp/crm/config/CorsConfig.java

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Client Management MVP (Priority: P1) 🎯 MVP

**Goal**: Enable agents to create, manage, and update client profiles with contact information and property search preferences

**Independent Test**: Create a new client record, add property search criteria, switch language interface, and verify all client data displays correctly

### Implementation for User Story 1

- [ ] T022 [P] [US1] Create Agent entity in backend/src/main/java/com/marklerapp/crm/entity/Agent.java
- [ ] T023 [P] [US1] Create Client entity in backend/src/main/java/com/marklerapp/crm/entity/Client.java
- [ ] T024 [P] [US1] Create PropertySearchCriteria entity in backend/src/main/java/com/marklerapp/crm/entity/PropertySearchCriteria.java
- [ ] T025 [P] [US1] Create Agent repository in backend/src/main/java/com/marklerapp/crm/repository/AgentRepository.java
- [ ] T026 [P] [US1] Create Client repository in backend/src/main/java/com/marklerapp/crm/repository/ClientRepository.java
- [ ] T027 [P] [US1] Create PropertySearchCriteria repository in backend/src/main/java/com/marklerapp/crm/repository/PropertySearchCriteriaRepository.java
- [ ] T028 [P] [US1] Create Agent DTOs in backend/src/main/java/com/marklerapp/crm/dto/AgentDto.java
- [ ] T029 [P] [US1] Create Client DTOs in backend/src/main/java/com/marklerapp/crm/dto/ClientDto.java
- [ ] T030 [P] [US1] Create PropertySearchCriteria DTOs in backend/src/main/java/com/marklerapp/crm/dto/PropertySearchCriteriaDto.java
- [ ] T031 [US1] Implement ClientService in backend/src/main/java/com/marklerapp/crm/service/ClientService.java (depends on T023, T024, T026, T027)
- [ ] T032 [US1] Implement AgentService in backend/src/main/java/com/marklerapp/crm/service/AgentService.java (depends on T022, T025)
- [ ] T033 [US1] Create Client REST controller in backend/src/main/java/com/marklerapp/crm/controller/ClientController.java (depends on T031)
- [ ] T034 [US1] Create Agent profile REST controller in backend/src/main/java/com/marklerapp/crm/controller/AgentController.java (depends on T032)
- [ ] T035 [US1] Create authentication REST controller in backend/src/main/java/com/marklerapp/crm/controller/AuthController.java (depends on T012)
- [ ] T036 [P] [US1] Create client management feature module in frontend/src/app/features/client-management/client-management.module.ts
- [ ] T037 [P] [US1] Create client list component in frontend/src/app/features/client-management/components/client-list/client-list.component.ts
- [ ] T038 [P] [US1] Create client form component in frontend/src/app/features/client-management/components/client-form/client-form.component.ts
- [ ] T039 [P] [US1] Create client detail component in frontend/src/app/features/client-management/components/client-detail/client-detail.component.ts
- [ ] T040 [P] [US1] Create property search criteria component in frontend/src/app/features/client-management/components/search-criteria/search-criteria.component.ts
- [ ] T041 [US1] Create client service in frontend/src/app/features/client-management/services/client.service.ts (depends on T033)
- [ ] T042 [US1] Implement client management routing in frontend/src/app/features/client-management/client-management-routing.module.ts
- [ ] T043 [US1] Create language switcher component in frontend/src/app/shared/components/language-switcher/language-switcher.component.ts
- [ ] T044 [US1] Add bilingual support to client management forms (German/English translations)
- [ ] T045 [US1] Implement GDPR consent handling in client forms
- [ ] T046 [US1] Add client search and filtering functionality
- [ ] T047 [US1] Create agent profile page in frontend/src/app/features/agent-profile/

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - Call Notes and Communication Tracking (Priority: P2)

**Goal**: Enable agents to document client interactions and generate automated summaries of communication history

**Independent Test**: Add call notes for an existing client, generate summary report, and verify GDPR compliance is maintained

### Implementation for User Story 2

- [ ] T048 [P] [US2] Create CallNote entity in backend/src/main/java/com/marklerapp/crm/entity/CallNote.java
- [ ] T049 [P] [US2] Create CallNote repository in backend/src/main/java/com/marklerapp/crm/repository/CallNoteRepository.java
- [ ] T050 [P] [US2] Create CallNote DTOs in backend/src/main/java/com/marklerapp/crm/dto/CallNoteDto.java
- [ ] T051 [US2] Implement CallNoteService in backend/src/main/java/com/marklerapp/crm/service/CallNoteService.java (depends on T049)
- [ ] T052 [US2] Implement call notes summary generation service in backend/src/main/java/com/marklerapp/crm/service/CallNoteSummaryService.java (depends on T051)
- [ ] T053 [US2] Create CallNote REST controller in backend/src/main/java/com/marklerapp/crm/controller/CallNoteController.java (depends on T051, T052)
- [ ] T054 [P] [US2] Create call notes feature module in frontend/src/app/features/call-notes/call-notes.module.ts
- [ ] T055 [P] [US2] Create call notes list component in frontend/src/app/features/call-notes/components/call-notes-list/call-notes-list.component.ts
- [ ] T056 [P] [US2] Create call note form component in frontend/src/app/features/call-notes/components/call-note-form/call-note-form.component.ts
- [ ] T057 [P] [US2] Create call notes summary component in frontend/src/app/features/call-notes/components/call-summary/call-summary.component.ts
- [ ] T058 [US2] Create call notes service in frontend/src/app/features/call-notes/services/call-notes.service.ts (depends on T053)
- [ ] T059 [US2] Implement call notes routing in frontend/src/app/features/call-notes/call-notes-routing.module.ts
- [ ] T060 [US2] Add call notes section to client detail view (integration with US1)
- [ ] T061 [US2] Implement automated summary generation with one-click functionality
- [ ] T062 [US2] Add GDPR audit logging for call notes access
- [ ] T063 [US2] Create call notes search and filtering functionality
- [ ] T064 [US2] Add follow-up reminder system for call notes

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - Property Management (Priority: P3)

**Goal**: Enable agents to manage property inventory with images, specifications, and client matching

**Independent Test**: Add a new property with multiple images, search properties by criteria, and match with client preferences

### Implementation for User Story 3

- [ ] T065 [P] [US3] Create Property entity in backend/src/main/java/com/marklerapp/crm/entity/Property.java
- [ ] T066 [P] [US3] Create PropertyImage entity in backend/src/main/java/com/marklerapp/crm/entity/PropertyImage.java
- [ ] T067 [P] [US3] Create Property repository in backend/src/main/java/com/marklerapp/crm/repository/PropertyRepository.java
- [ ] T068 [P] [US3] Create PropertyImage repository in backend/src/main/java/com/marklerapp/crm/repository/PropertyImageRepository.java
- [ ] T069 [P] [US3] Create Property DTOs in backend/src/main/java/com/marklerapp/crm/dto/PropertyDto.java
- [ ] T070 [P] [US3] Create PropertyImage DTOs in backend/src/main/java/com/marklerapp/crm/dto/PropertyImageDto.java
- [ ] T071 [US3] Implement PropertyService in backend/src/main/java/com/marklerapp/crm/service/PropertyService.java (depends on T067)
- [ ] T072 [US3] Implement PropertyImageService for file upload handling in backend/src/main/java/com/marklerapp/crm/service/PropertyImageService.java (depends on T068)
- [ ] T073 [US3] Implement PropertyMatchingService in backend/src/main/java/com/marklerapp/crm/service/PropertyMatchingService.java (depends on T071, T031)
- [ ] T074 [US3] Create Property REST controller in backend/src/main/java/com/marklerapp/crm/controller/PropertyController.java (depends on T071, T072)
- [ ] T075 [US3] Create PropertyMatching REST controller in backend/src/main/java/com/marklerapp/crm/controller/PropertyMatchingController.java (depends on T073)
- [ ] T076 [P] [US3] Create property management feature module in frontend/src/app/features/property-management/property-management.module.ts
- [ ] T077 [P] [US3] Create property list component in frontend/src/app/features/property-management/components/property-list/property-list.component.ts
- [ ] T078 [P] [US3] Create property form component in frontend/src/app/features/property-management/components/property-form/property-form.component.ts
- [ ] T079 [P] [US3] Create property detail component in frontend/src/app/features/property-management/components/property-detail/property-detail.component.ts
- [ ] T080 [P] [US3] Create property image upload component in frontend/src/app/features/property-management/components/image-upload/image-upload.component.ts
- [ ] T081 [P] [US3] Create property search component in frontend/src/app/features/property-management/components/property-search/property-search.component.ts
- [ ] T082 [P] [US3] Create property matching component in frontend/src/app/features/property-management/components/property-matching/property-matching.component.ts
- [ ] T083 [US3] Create property service in frontend/src/app/features/property-management/services/property.service.ts (depends on T074)
- [ ] T084 [US3] Create property matching service in frontend/src/app/features/property-management/services/property-matching.service.ts (depends on T075)
- [ ] T085 [US3] Implement property management routing in frontend/src/app/features/property-management/property-management-routing.module.ts
- [ ] T086 [US3] Add property image gallery with thumbnail generation
- [ ] T087 [US3] Implement property search and filtering functionality
- [ ] T088 [US3] Create property matching algorithm with scoring system
- [ ] T089 [US3] Add custom fields support for additional property information
- [ ] T090 [US3] Integrate property matching with client profiles (cross-story integration)

**Checkpoint**: All user stories should now be independently functional

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T091 [P] Create comprehensive Docker deployment configuration
- [ ] T092 [P] Implement database migration scripts for SQLite to PostgreSQL
- [ ] T093 [P] Add health check endpoints in backend/src/main/java/com/marklerapp/crm/controller/HealthController.java
- [ ] T094 [P] Setup file storage configuration for property images
- [ ] T095 [P] Implement GDPR data export functionality
- [ ] T096 [P] Create GDPR data anonymization service
- [ ] T097 [P] Add comprehensive error handling across all components
- [ ] T098 [P] Implement audit logging for all GDPR-sensitive operations
- [ ] T099 [P] Add performance optimizations for large datasets
- [ ] T100 [P] Create API documentation generation with OpenAPI
- [ ] T101 [P] Setup monitoring and metrics collection
- [ ] T102 [P] Add responsive design improvements for mobile devices
- [ ] T103 [P] Implement caching strategies for frequently accessed data
- [ ] T104 [P] Run deployment validation using quickstart.md guide

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