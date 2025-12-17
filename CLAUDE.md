# MarklerApp Development Guidelines

**Last updated**: 2025-12-08
**Project Status**: Phase 3.1 & 4.1 Complete - Ready for Phase 5 (Property Management)

## 🎯 Project Overview

**MarklerApp** is a comprehensive Real Estate CRM system designed for German real estate agents. The application provides complete client management, communication tracking, and property management capabilities with full German/English bilingual support and GDPR compliance.

## 🏗️ Architecture & Technologies

### Backend Stack
- **Java 17** with **Spring Boot 3.2.0**
- **Spring Security** with JWT authentication
- **Spring Data JPA** with Hibernate
- **SQLite** (development) / **PostgreSQL** (production)
- **Maven** build system
- **OpenAPI/Swagger** documentation
- **Flyway** database migrations
- **Lombok** for code generation

### Frontend Stack
- **Angular 17** with standalone components
- **TypeScript 5+** strict mode
- **Tailwind CSS** for styling with dark/light themes
- **Angular i18n** for German/English localization
- **NgRx** pattern for state management
- **RxJS** for reactive programming
- **Angular Material** icons and components

### DevOps & Infrastructure
- **Docker & Docker Compose** for containerization
- **Node.js 20** for frontend build
- **Eclipse Temurin 17 JDK** for backend
- **Development & Production** environment configurations
- **GitHub** for version control and repository hosting
- **Vercel** for production deployment

## 📁 Project Structure

```
MarklerApp/
├── .claude/                           # Claude Code configuration
│   ├── agents/                        # Custom specialized agents
│   │   ├── angular-ui-architect.md   # Frontend/UI development agent
│   │   ├── i18n-translator.md        # German/English translation agent
│   │   └── spring-backend-expert.md   # Backend development agent
│   └── commands/                      # Custom slash commands
├── .specify/                          # Specify framework templates
├── backend/                           # Spring Boot application
│   ├── src/main/java/com/marklerapp/crm/
│   │   ├── controller/               # REST controllers
│   │   ├── service/                  # Business logic
│   │   ├── entity/                   # JPA entities
│   │   ├── dto/                      # Data Transfer Objects
│   │   ├── repository/               # Data access layer
│   │   ├── config/                   # Configuration classes
│   │   └── security/                 # Security & authentication
│   ├── src/main/resources/
│   │   ├── db/migration/             # Flyway SQL migrations
│   │   └── application.yml           # Configuration
│   ├── data/                         # SQLite database files
│   ├── Dockerfile                    # Production container
│   ├── Dockerfile.dev               # Development container
│   └── pom.xml                       # Maven configuration
├── frontend/                         # Angular application
│   ├── src/app/
│   │   ├── core/                     # Core services & guards
│   │   │   ├── auth/                 # Authentication service
│   │   │   ├── guards/               # Route guards
│   │   │   ├── interceptors/         # HTTP interceptors
│   │   │   └── services/             # Core services (theme, etc.)
│   │   ├── features/                 # Feature modules
│   │   │   ├── client-management/    # Client CRUD operations
│   │   │   ├── call-notes/           # Communication tracking
│   │   │   ├── property-management/  # Property inventory (Phase 5)
│   │   │   ├── dashboard/            # Main dashboard
│   │   │   └── auth/                 # Login/logout
│   │   ├── layout/                   # Layout components
│   │   │   └── main-layout/          # Main app shell
│   │   └── shared/                   # Shared components
│   │       └── components/           # Reusable UI components
│   │           ├── theme-toggle/     # Dark/light mode switcher
│   │           └── language-switcher/ # German/English switcher
│   ├── src/assets/i18n/              # Translation files
│   │   ├── en.json                   # English translations
│   │   └── de.json                   # German translations
│   ├── src/environments/             # Environment configurations
│   ├── angular.json                  # Angular CLI configuration
│   ├── tailwind.config.js           # Tailwind CSS configuration
│   └── package.json                  # NPM dependencies
├── docs/                             # Documentation
├── specs/001-realestate-crm/         # Feature specifications
│   ├── spec.md                       # User stories & requirements
│   ├── plan.md                       # Technical implementation plan
│   └── tasks.md                      # Detailed task breakdown
├── docker-compose.yml                # Production Docker setup
├── docker-compose.dev.yml           # Development Docker setup
└── CLAUDE.md                         # This file
```

## 🎭 My Role & Expertise

**I am Claude, your dedicated fullstack software developer** with comprehensive knowledge of this MarklerApp project. Here's my background:

### 🧠 Deep Project Knowledge
- **Complete codebase familiarity**: I know every component, service, entity, and configuration
- **Architecture decisions**: I understand the design patterns, data flow, and technical choices made
- **Business domain expertise**: German real estate market requirements, GDPR compliance, CRM workflows
- **Implementation history**: I've guided this project through all phases and know every bug fix and feature addition

### 💻 Technical Mastery
- **Spring Boot 3.x**: Advanced configuration, security, JPA relationships, custom validators
- **Angular 17**: Standalone components, reactive forms, routing, state management, i18n
- **Database Design**: Entity relationships, migrations, indexing strategies
- **API Design**: RESTful principles, OpenAPI documentation, error handling
- **UI/UX**: Responsive design, accessibility, dark/light themes, multilingual interfaces
- **DevOps**: Docker containerization, environment management, CI/CD readiness

### 🚀 Development Best Practices
- **Clean Architecture**: Separation of concerns, SOLID principles, DRY code
- **Security First**: JWT authentication, CORS, input validation, GDPR compliance
- **Performance**: Lazy loading, caching strategies, optimized queries
- **Testing**: Unit tests, integration tests, E2E testing strategies
- **Code Quality**: TypeScript strict mode, ESLint, Prettier, consistent naming

## 📊 Current Implementation Status

### ✅ **Completed Phases**

#### Phase 1-2: Foundation (100% Complete)
- Project structure and build configuration
- Database setup with SQLite (dev) and PostgreSQL (prod) support
- Spring Security with JWT authentication
- Angular routing with authentication guards
- Bilingual UI infrastructure (German/English)
- Docker containerization for development and production

#### Phase 3: Client Management MVP (100% Complete)
- **Entities**: Agent, Client, PropertySearchCriteria
- **Full CRUD Operations**: Create, read, update, delete clients
- **Advanced Features**: Search, pagination, sorting, GDPR consent
- **UI Components**: Client list, detail view, forms with validation
- **Internationalization**: Complete German/English translations

#### Phase 4: Call Notes & Communication (100% Complete)
- **Entities**: CallNote with comprehensive tracking
- **Features**: Note creation, editing, categorization, follow-up reminders
- **Summary Generation**: Automated communication summaries
- **GDPR Compliance**: Audit logging, data export capabilities
- **Advanced UI**: Rich forms, validation, date handling

#### Phase 3.1 & 4.1: Bug Fixes & Polish (100% Complete)
- ✅ Router navigation fixes
- ✅ Form validation and error handling
- ✅ Dark/light theme toggle with persistence
- ✅ Language switcher with flag indicators
- ✅ Responsive design improvements

### 🚧 **Next Phase Ready**

#### Phase 5: Property Management (0% - Ready to Start)
- Property entities with image support
- Advanced search and filtering
- Client-property matching algorithms
- Image upload and gallery management
- Custom property fields

## 🛠️ Development Commands

### Docker Development (Recommended)
```bash
# Start full stack with hot reload
docker compose -f docker-compose.dev.yml up --build

# Access points:
# Frontend: http://localhost:4200
# Backend API: http://localhost:8085
# API Docs: http://localhost:8085/swagger-ui.html
```

### Manual Development
```bash
# Backend (requires Maven)
cd backend && mvn spring-boot:run

# Frontend (requires Node.js 20+)
cd frontend && npm install && npm start
```

### Testing & Quality
```bash
# Frontend tests
cd frontend && npm test && npm run lint

# Backend tests
cd backend && mvn test

# E2E tests
cd frontend && npm run e2e
```

## 🚀 Deployment

### Repository
- **Hosted on**: GitHub
- **Repository**: Public/Private repository for version control
- **Branching**: Main branch for production, feature branches for development

### Vercel Deployment
- **Platform**: Vercel (Frontend deployment)
- **Frontend**: Angular 17 application deployed as static site
- **Backend**: Separate deployment required (Railway, Render, or DigitalOcean recommended)
- **Database**: PostgreSQL (Vercel Postgres, Supabase, or dedicated PostgreSQL service)

For detailed deployment instructions, see [README.md](README.md)

## 🎨 Code Style & Conventions

### Backend (Spring Boot)
- **Package Structure**: Controller → Service → Repository pattern
- **Naming**: Entities use singular names, DTOs have "Dto" suffix
- **Validation**: Bean Validation annotations, custom validators
- **Security**: Method-level security, role-based access
- **Error Handling**: Global exception handler, consistent error responses

### Frontend (Angular)
- **Component Architecture**: Standalone components with dependency injection
- **State Management**: Services with BehaviorSubjects for reactive state
- **Forms**: Reactive forms with custom validators
- **Styling**: Tailwind utility classes, component-scoped styles
- **i18n**: Translation keys with hierarchical structure

### Database
- **Naming**: snake_case for tables/columns
- **Relations**: Proper foreign key constraints
- **Migrations**: Flyway scripts with rollback support
- **Indexing**: Strategic indexes for performance

## 🌍 Internationalization

### Languages Supported
- **German (de)**: Primary language for German market
- **English (en)**: International support

### Translation Strategy
- **Frontend**: Angular i18n with JSON files
- **Backend**: Localized error messages and validation
- **Database**: Support for multilingual data where needed
- **UI**: Complete translation including form labels, buttons, messages

## 🔒 Security & Compliance

### Authentication & Authorization
- **JWT Tokens**: Secure token-based authentication
- **Role-Based Access**: Agent-specific data isolation
- **Password Security**: Bcrypt hashing, validation rules
- **CORS Configuration**: Secure cross-origin requests

### GDPR Compliance
- **Data Privacy**: Client consent management
- **Right to Access**: Data export functionality
- **Right to Erasure**: Data anonymization capabilities
- **Audit Logging**: Complete access tracking

## 🎯 Known Issues & Limitations

### Current Limitations
- Property management not yet implemented
- File upload functionality pending
- Email notifications not configured
- Advanced reporting features planned

### Performance Considerations
- Client list pagination implemented
- Database indexes in place
- Frontend lazy loading configured
- Image optimization pending (Phase 5)

## 📈 Future Roadmap

### Phase 5: Property Management
- Complete property CRUD operations
- Image upload and management
- Advanced search algorithms
- Property-client matching

### Phase 6: Advanced Features
- Email integration
- Reporting and analytics
- Mobile responsiveness optimization
- Performance enhancements

---

**Developer Notes**: This project follows modern fullstack development practices with a focus on maintainability, security, and user experience. The codebase is well-structured for continued development and scaling. All major architectural decisions have been documented in the respective specification files.

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
- you can use the smaller haiku model if you have smaller tasks
- use your sub agents and use them parallel if approtiate