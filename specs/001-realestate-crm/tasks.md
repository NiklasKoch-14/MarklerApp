---

description: "Task list for Real Estate CRM System implementation"
---

# Tasks: Real Estate CRM System

**Input**: Design documents from `/specs/001-realestate-crm/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), data-model.md, contracts/

**Tests**: Tests are OPTIONAL - not explicitly requested in feature specification, following minimal viable approach

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## 🚨 CURRENT STATUS & PRIORITY FIXES NEEDED

**MVP Status**: ✅ Phases 1-4 marked complete, but several critical bugs discovered:

### ⚠️ HIGH PRIORITY BUGS TO FIX:
1. **Dashboard buttons not working** - Missing RouterModule imports
2. **Client editing not functional** - Form connections need debugging
3. **Call notes creation failing** - Form submission issues
4. **Missing UI features** - Dark/light mode toggle, language switcher

**Recommendation**: Complete Phase 3.1 and 4.1 bug fixes before proceeding to new features.

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

- [ ] T049.1 [P] [US1] Fix dashboard router links - add RouterModule import to dashboard.component.ts
- [ ] T049.2 [P] [US1] Fix client editing functionality - ensure update forms are properly connected to backend
- [ ] T049.3 [P] [US1] Add dark/light mode theme toggle in main header/navigation
- [ ] T049.4 [P] [US1] Add German/English language toggle switch in main header/navigation
- [ ] T049.5 [P] [US1] Fix client form validation and error handling
- [ ] T049.6 [P] [US1] Ensure client update/edit forms save data correctly

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

- [ ] T064.1 [P] [US2] Fix call notes creation form - ensure form submissions work correctly
- [ ] T064.2 [P] [US2] Debug call notes service integration with backend API
- [ ] T064.3 [P] [US2] Fix call notes form validation and error handling
- [ ] T064.4 [P] [US2] Ensure call notes display and formatting works correctly
- [ ] T064.5 [P] [US2] Fix call notes routing and navigation issues
- [ ] T064.6 [P] [US2] Test and fix call notes CRUD operations end-to-end

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