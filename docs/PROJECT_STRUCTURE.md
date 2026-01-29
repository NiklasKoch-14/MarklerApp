# MarklerApp Project Structure

Complete directory tree and organization guide.

```
MarklerApp/
├── .claude/                           # Claude Code configuration
│   ├── agents/                        # Custom specialized agents
│   │   ├── angular-ui-architect.md   # Frontend/UI development agent
│   │   ├── i18n-translator.md        # German/English translation agent
│   │   └── spring-backend-expert.md   # Backend development agent
│   └── commands/                      # Custom slash commands
├── .specify/                          # Specify framework templates
│   ├── templates/                     # Specification templates
│   └── memory/                        # Project constitution
├── backend/                           # Spring Boot application
│   ├── src/main/java/com/marklerapp/crm/
│   │   ├── controller/               # REST controllers
│   │   │   ├── AuthController.java
│   │   │   ├── ClientController.java
│   │   │   ├── CallNoteController.java
│   │   │   ├── PropertyController.java
│   │   │   └── DashboardController.java
│   │   ├── service/                  # Business logic
│   │   │   ├── AuthService.java
│   │   │   ├── ClientService.java
│   │   │   ├── CallNoteService.java
│   │   │   ├── PropertyService.java
│   │   │   ├── OllamaService.java
│   │   │   └── FileAttachmentService.java
│   │   ├── entity/                   # JPA entities
│   │   │   ├── Agent.java
│   │   │   ├── Client.java
│   │   │   ├── CallNote.java
│   │   │   ├── Property.java
│   │   │   ├── PropertyImage.java
│   │   │   └── FileAttachment.java
│   │   ├── dto/                      # Data Transfer Objects
│   │   │   ├── ClientDto.java
│   │   │   ├── CallNoteDto.java
│   │   │   ├── PropertyDto.java
│   │   │   └── FileAttachmentDto.java
│   │   ├── repository/               # Data access layer
│   │   │   ├── AgentRepository.java
│   │   │   ├── ClientRepository.java
│   │   │   ├── CallNoteRepository.java
│   │   │   └── PropertyRepository.java
│   │   ├── config/                   # Configuration classes
│   │   │   ├── SecurityConfig.java
│   │   │   ├── WebConfig.java
│   │   │   ├── JacksonConfig.java
│   │   │   └── OllamaConfig.java
│   │   ├── security/                 # Security & authentication
│   │   │   ├── JwtTokenProvider.java
│   │   │   ├── JwtAuthenticationFilter.java
│   │   │   └── CustomUserDetails.java
│   │   ├── exception/                # Exception handling
│   │   │   └── GlobalExceptionHandler.java
│   │   └── util/                     # Utility classes
│   ├── src/main/resources/
│   │   ├── db/migration/             # Flyway SQL migrations
│   │   │   ├── V1__initial_schema.sql
│   │   │   ├── V2__add_call_notes.sql
│   │   │   ├── V3__add_properties.sql
│   │   │   └── V4__add_file_attachments.sql
│   │   ├── application.yml           # Main configuration
│   │   └── application-dev.yml       # Dev overrides
│   ├── data/                         # Development data
│   ├── Dockerfile                    # Production container
│   ├── Dockerfile.dev               # Development container
│   └── pom.xml                       # Maven configuration
├── frontend/                         # Angular application
│   ├── src/app/
│   │   ├── core/                     # Core services & guards
│   │   │   ├── auth/                 # Authentication service
│   │   │   │   ├── auth.service.ts
│   │   │   │   └── auth-response.model.ts
│   │   │   ├── guards/               # Route guards
│   │   │   │   └── auth.guard.ts
│   │   │   ├── interceptors/         # HTTP interceptors
│   │   │   │   ├── auth.interceptor.ts
│   │   │   │   └── error.interceptor.ts
│   │   │   └── services/             # Core services
│   │   │       ├── theme.service.ts
│   │   │       └── language.service.ts
│   │   ├── features/                 # Feature modules
│   │   │   ├── client-management/    # Client CRUD operations
│   │   │   │   ├── components/
│   │   │   │   │   ├── client-list/
│   │   │   │   │   ├── client-detail/
│   │   │   │   │   └── client-form/
│   │   │   │   ├── models/
│   │   │   │   └── services/
│   │   │   ├── call-notes/           # Communication tracking
│   │   │   │   ├── components/
│   │   │   │   │   ├── call-notes-list/
│   │   │   │   │   ├── call-note-form/
│   │   │   │   │   └── call-summary/
│   │   │   │   ├── models/
│   │   │   │   └── services/
│   │   │   ├── property-management/  # Property inventory
│   │   │   │   ├── components/
│   │   │   │   │   ├── property-list/
│   │   │   │   │   ├── property-detail/
│   │   │   │   │   ├── property-form/
│   │   │   │   │   ├── property-image-upload/
│   │   │   │   │   └── property-matching/
│   │   │   │   ├── models/
│   │   │   │   └── services/
│   │   │   ├── dashboard/            # Main dashboard
│   │   │   │   └── dashboard.component.ts
│   │   │   └── auth/                 # Login/logout
│   │   │       └── login.component.ts
│   │   ├── layout/                   # Layout components
│   │   │   └── main-layout/          # Main app shell
│   │   │       └── main-layout.component.ts
│   │   └── shared/                   # Shared components
│   │       ├── components/           # Reusable UI components
│   │       │   ├── theme-toggle/     # Dark/light mode switcher
│   │       │   ├── language-switcher/ # German/English switcher
│   │       │   └── file-attachment-manager/
│   │       ├── models/               # Shared models
│   │       ├── services/             # Shared services
│   │       └── pipes/                # Custom pipes
│   │           └── translate-enum.pipe.ts
│   ├── src/assets/i18n/              # Translation files
│   │   ├── en.json                   # English translations
│   │   └── de.json                   # German translations
│   ├── src/environments/             # Environment configurations
│   │   ├── environment.ts            # Development
│   │   └── environment.prod.ts       # Production
│   ├── angular.json                  # Angular CLI configuration
│   ├── tailwind.config.js           # Tailwind CSS configuration
│   ├── tsconfig.json                 # TypeScript configuration
│   └── package.json                  # NPM dependencies
├── docs/                             # Documentation
│   ├── PERMISSIONS.md                # Authorized operations
│   ├── PROJECT_STRUCTURE.md          # This file
│   └── README.md                     # Quick start guide
├── specs/001-realestate-crm/         # Feature specifications
│   ├── spec.md                       # User stories & requirements
│   ├── plan.md                       # Technical implementation plan
│   ├── tasks.md                      # Detailed task breakdown
│   ├── data-model.md                 # Database schema
│   └── quickstart.md                 # Getting started guide
├── docker-compose.yml                # Production Docker setup
├── docker-compose.dev.yml           # Development Docker setup
├── README.md                         # Main project documentation
└── CLAUDE.md                         # Development guidelines (this context)
```

## Key Directory Purposes

### Backend
- **controller/**: REST API endpoints, request/response handling
- **service/**: Business logic, transaction management
- **entity/**: JPA entities mapped to database tables
- **dto/**: Data transfer objects for API contracts
- **repository/**: Data access layer, database queries
- **config/**: Spring configuration classes
- **security/**: Authentication and authorization

### Frontend
- **core/**: Singleton services, guards, interceptors (app-wide)
- **features/**: Feature modules organized by business domain
- **layout/**: App shell and layout components
- **shared/**: Reusable components, pipes, models, services

### Configuration
- **backend/pom.xml**: Maven dependencies and build configuration
- **frontend/package.json**: NPM dependencies
- **docker-compose.dev.yml**: Development environment with hot reload
- **application.yml**: Spring Boot configuration

## Naming Conventions

- **Entities**: Singular names (`Client`, `Property`)
- **DTOs**: Entity name + "Dto" suffix (`ClientDto`)
- **Controllers**: Entity name + "Controller" (`ClientController`)
- **Services**: Entity name + "Service" (`ClientService`)
- **Repositories**: Entity name + "Repository" (`ClientRepository`)
- **Database**: snake_case (`client_id`, `property_type`)
- **Components**: kebab-case directories, PascalCase classes
