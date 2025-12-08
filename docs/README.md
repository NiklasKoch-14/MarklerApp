# Real Estate CRM System

A comprehensive Real Estate CRM system with bilingual support (German/English) featuring client management, call notes tracking with automated summaries, and property management with image upload capabilities.

## Tech Stack

- **Backend**: Java 17+ with Spring Boot 3.x, Spring Data JPA, Spring Security, Hibernate
- **Frontend**: Angular 17+, TypeScript, Tailwind CSS
- **Database**: SQLite (MVP) → PostgreSQL (Production)
- **Containerization**: Docker with docker-compose
- **Build Tools**: Maven (backend), npm (frontend)

## Quick Start

### Prerequisites

- **Docker Desktop** (4.20+) with Docker Compose
- **Git** for cloning repository
- **8GB RAM** minimum for development
- **Ports Available**: 3000 (frontend), 8080 (backend), 5432 (database)

### 1. Clone and Start

```bash
# Clone the repository
git clone <repository-url>
cd MarklerApp

# Start all services
docker-compose up -d

# Wait for services to be ready (usually 2-3 minutes)
docker-compose logs -f backend | grep "Started CrmApplication"

  Option 1: Full Production Stack (Recommended for testing)

  # Build and start all services (database, backend, frontend) with PostgreSQL
  docker compose up --build

  Option 2: Production Stack in Background

  # Build and start all services in detached mode
  docker compose up --build -d

  Option 3: Development Stack with SQLite (Faster startup)

  # Build and start all services with SQLite database (faster for development)
  docker compose -f docker-compose.dev.yml up --build
```

### 2. Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8080/api/v1
- **API Documentation**: http://localhost:8080/swagger-ui/index.html

### 3. Default Login

```
Email: admin@marklerapp.com
Password: AdminPass123!
```

## Development Setup

For active development with hot reloading:

```bash
# Start with development overrides
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up

# test after changes
docker compose -f docker-compose.dev.yml up --build

# View logs
docker-compose logs -f backend
docker-compose logs -f frontend
```

### Development Features
- **Hot Reload**: Angular changes auto-refresh
- **Debug Ports**: Backend debug on 5005
- **Volume Mounts**: Source code mounted for real-time changes
- **Database Persistence**: Data survives container restarts

## Architecture

### Project Structure

```text
backend/
├── src/
│   ├── main/
│   │   ├── java/com/marklerapp/crm/
│   │   │   ├── config/          # Spring configuration
│   │   │   ├── controller/      # REST controllers
│   │   │   ├── dto/            # Data transfer objects
│   │   │   ├── entity/         # JPA entities
│   │   │   ├── repository/     # Data access layer
│   │   │   ├── service/        # Business logic
│   │   │   └── util/           # Utility classes
│   │   └── resources/
│   │       ├── application.yml     # Configuration
│   │       ├── db/migration/       # Flyway migrations
│   │       └── i18n/              # Backend messages
│   └── test/
├── Dockerfile
└── pom.xml

frontend/
├── src/
│   ├── app/
│   │   ├── core/                  # Core services, guards
│   │   ├── shared/                # Shared components, pipes
│   │   ├── features/              # Feature modules
│   │   │   ├── client-management/
│   │   │   ├── call-notes/
│   │   │   └── property-management/
│   │   └── layout/                # Layout components
│   ├── assets/i18n/              # Translation files
│   └── environments/              # Environment configs
├── Dockerfile
├── package.json
├── angular.json
└── tailwind.config.js
```

## Features

### User Stories

1. **Client Management MVP (P1)** 🎯
   - Create, manage, and update client profiles
   - Contact information management
   - Property search preferences
   - GDPR compliance

2. **Call Notes and Communication Tracking (P2)**
   - Document client interactions
   - Automated summary generation
   - Follow-up reminder system
   - Communication history

3. **Property Management (P3)**
   - Property inventory management
   - Image upload capabilities
   - Property specifications
   - Client-property matching

### Key Features

- **Bilingual Support**: German/English with runtime switching
- **GDPR Compliance**: Data protection features built-in
- **Responsive Design**: Works on desktop, tablet, and mobile
- **Real-time Updates**: Live data synchronization
- **File Management**: Property image upload and gallery
- **Search & Filter**: Advanced search capabilities
- **Docker Deployment**: Easy containerized deployment

## Environment Configuration

Create `.env` file in root directory for production:

```bash
# Database Configuration
POSTGRES_DB=realestate_crm
POSTGRES_USER=crmuser
POSTGRES_PASSWORD=secure_password_here

# Backend Configuration
JWT_SECRET=your_jwt_secret_key_here
CORS_ALLOWED_ORIGINS=https://yourdomain.com
FILE_UPLOAD_PATH=/app/uploads

# Frontend Configuration
API_BASE_URL=https://api.yourdomain.com
```

## API Documentation

Once the backend is running, visit http://localhost:8080/swagger-ui/index.html for interactive API documentation.

### Key Endpoints

- `POST /api/v1/auth/login` - User authentication
- `GET /api/v1/clients` - List clients
- `POST /api/v1/clients` - Create client
- `GET /api/v1/properties` - List properties
- `POST /api/v1/call-notes` - Create call note
- `GET /api/v1/gdpr/export/{clientId}` - Export user data

## Testing

```bash
# Backend tests
cd backend
mvn test

# Frontend tests
cd frontend
npm test

# E2E tests
npm run e2e
```

## Health Checks & Monitoring

- **Backend Health**: http://localhost:8080/actuator/health
- **Frontend Health**: http://localhost:3000/health
- **Metrics**: http://localhost:8080/actuator/metrics

## Troubleshooting

### Common Issues

**Port Already in Use**
```bash
# Check what's using port 8080
lsof -i :8080
# Change port in docker-compose.yml if needed
```

**Database Connection Failed**
```bash
# Check database status
docker-compose ps database
docker-compose logs database

# Reset database
docker-compose down -v
docker-compose up -d
```

**Frontend Build Fails**
```bash
# Clear Node modules and rebuild
docker-compose exec frontend rm -rf node_modules
docker-compose restart frontend
```

## Contributing

1. Create feature branch: `git checkout -b feature/new-feature`
2. Make changes and test thoroughly
3. Commit using conventional commits: `git commit -m "feat: add new feature"`
4. Push and create pull request

## License

This project is proprietary software developed for MarklerApp.

## Support

For technical support or questions:
- Check logs: `docker-compose logs -f backend frontend`
- Health endpoints: Backend (`/actuator/health`), Frontend (`/health`)
- API documentation: http://localhost:8080/swagger-ui/index.html