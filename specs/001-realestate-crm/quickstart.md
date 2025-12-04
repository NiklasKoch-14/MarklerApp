# Real Estate CRM - Deployment Quickstart

**Version**: 1.0.0
**Target Environment**: Docker with local deployment
**Estimated Setup Time**: 15 minutes

## Prerequisites

- **Docker Desktop** (4.20+) with Docker Compose
- **Git** for cloning repository
- **8GB RAM** minimum for development
- **Ports Available**: 3000 (frontend), 8080 (backend), 5432 (database)

## Quick Start (5 Minutes)

### 1. Clone and Start

```bash
# Clone the repository
git clone <repository-url>
cd MarklerApp

# Start all services
docker-compose up -d

# Wait for services to be ready (usually 2-3 minutes)
docker-compose logs -f backend | grep "Started CrmApplication"
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

## Docker Compose Overview

The application runs with three main containers:

```yaml
services:
  database:     # PostgreSQL (SQLite for MVP)
  backend:      # Spring Boot API (port 8080)
  frontend:     # Angular app (port 3000)
```

## Development Mode

For active development with hot reloading:

```bash
# Start with development overrides
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up

# View logs
docker-compose logs -f backend
docker-compose logs -f frontend
```

### Development Features
- **Hot Reload**: Angular changes auto-refresh
- **Debug Ports**: Backend debug on 5005
- **Volume Mounts**: Source code mounted for real-time changes
- **Database Persistence**: Data survives container restarts

## Production Deployment

### Environment Configuration

Create `.env` file in root directory:

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

# Email Configuration (optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@domain.com
SMTP_PASSWORD=your-app-password
```

### SSL/TLS Setup (Production)

```bash
# Add reverse proxy (nginx)
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# SSL certificates via Let's Encrypt
docker exec nginx-proxy /etc/nginx/setup-ssl.sh yourdomain.com
```

## Configuration Files

### docker-compose.yml (Main Configuration)

```yaml
version: '3.8'

services:
  database:
    image: postgres:15-alpine
    container_name: realestate-db
    environment:
      POSTGRES_DB: ${POSTGRES_DB:-realestate_crm}
      POSTGRES_USER: ${POSTGRES_USER:-crmuser}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-devpassword}
    volumes:
      - db_data:/var/lib/postgresql/data
      - ./backend/src/main/resources/db/init:/docker-entrypoint-initdb.d
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER:-crmuser}"]
      interval: 30s
      timeout: 10s
      retries: 3

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: realestate-backend
    environment:
      SPRING_PROFILES_ACTIVE: docker
      SPRING_DATASOURCE_URL: jdbc:postgresql://database:5432/${POSTGRES_DB:-realestate_crm}
      SPRING_DATASOURCE_USERNAME: ${POSTGRES_USER:-crmuser}
      SPRING_DATASOURCE_PASSWORD: ${POSTGRES_PASSWORD:-devpassword}
      JWT_SECRET: ${JWT_SECRET:-dev_secret_key_change_in_production}
      CORS_ALLOWED_ORIGINS: ${CORS_ALLOWED_ORIGINS:-http://localhost:3000}
      FILE_UPLOAD_PATH: ${FILE_UPLOAD_PATH:-/app/uploads}
    volumes:
      - uploaded_files:/app/uploads
    ports:
      - "8080:8080"
    depends_on:
      database:
        condition: service_healthy
    healthcheck:
      test: ["CMD-SHELL", "curl -f http://localhost:8080/actuator/health || exit 1"]
      interval: 30s
      timeout: 10s
      retries: 3

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
      args:
        API_BASE_URL: ${API_BASE_URL:-http://localhost:8080/api/v1}
    container_name: realestate-frontend
    ports:
      - "3000:80"
    depends_on:
      backend:
        condition: service_healthy

volumes:
  db_data:
    name: realestate_db_data
  uploaded_files:
    name: realestate_uploads

networks:
  default:
    name: realestate-network
```

### docker-compose.dev.yml (Development Overrides)

```yaml
version: '3.8'

services:
  database:
    # Use SQLite for MVP development
    image: busybox
    command: ["sh", "-c", "mkdir -p /data && sleep infinity"]
    volumes:
      - ./backend/data:/data
    ports: []

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile.dev
    environment:
      SPRING_PROFILES_ACTIVE: dev
      SPRING_DATASOURCE_URL: jdbc:sqlite:/app/data/realestate_crm.db
      SPRING_JPA_HIBERNATE_DDL_AUTO: update
      LOGGING_LEVEL_COM_MARKLERAPP: DEBUG
    volumes:
      - ./backend/src:/app/src
      - ./backend/data:/app/data
    ports:
      - "8080:8080"
      - "5005:5005"  # Debug port
    depends_on:
      - database

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.dev
    volumes:
      - ./frontend/src:/app/src
      - ./frontend/angular.json:/app/angular.json
      - ./frontend/package.json:/app/package.json
      - ./frontend/tailwind.config.js:/app/tailwind.config.js
    command: ["npm", "run", "start", "--", "--host", "0.0.0.0", "--port", "3000"]
    ports:
      - "3000:3000"
```

## Database Setup

### MVPMode (SQLite)

```bash
# SQLite database is created automatically
# Located at: ./backend/data/realestate_crm.db
# No additional setup required
```

### Production Mode (PostgreSQL)

```sql
-- Database initialization (automatic via Docker)
CREATE DATABASE realestate_crm;
CREATE USER crmuser WITH ENCRYPTED PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE realestate_crm TO crmuser;

-- Tables created automatically via Hibernate/Flyway
```

## Initial Data & Demo Setup

### Seed Data Script

```bash
# Run seed data script (creates demo agent + sample data)
docker exec realestate-backend java -jar app.jar --spring.profiles.active=seed

# Or via API (after first login)
curl -X POST http://localhost:8080/api/v1/admin/seed-data \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Demo Data Includes:
- **1 Demo Agent**: admin@marklerapp.com / AdminPass123!
- **5 Sample Clients** with German addresses
- **10 Sample Properties** (apartments, houses)
- **20 Call Notes** with realistic interactions
- **Search Criteria** for each client

## File Storage & Uploads

### Development Setup

```bash
# Files stored locally in Docker volume
./backend/uploads/
├── properties/
│   ├── {propertyId}/
│   │   ├── original/
│   │   └── thumbnails/
```

### Production Setup

```yaml
# Use external volume or cloud storage
volumes:
  uploaded_files:
    driver: local
    driver_opts:
      type: nfs
      o: addr=your-nas-server,rw
      device: ":/path/to/storage"
```

## Monitoring & Health Checks

### Health Endpoints

- **Backend**: http://localhost:8080/actuator/health
- **Database**: Automatic via Docker healthcheck
- **Frontend**: http://localhost:3000 (Angular serves healthy status)

### Logs & Debugging

```bash
# View all logs
docker-compose logs

# Follow specific service
docker-compose logs -f backend
docker-compose logs -f frontend

# Debug backend issues
docker exec -it realestate-backend bash
tail -f /app/logs/application.log
```

## Language & Localization

### Support Languages

- **German (DE)**: Default language
- **English (EN)**: Secondary language

### Language Files Location

```
frontend/src/assets/i18n/
├── de.json    # German translations
└── en.json    # English translations

backend/src/main/resources/i18n/
├── messages_de.properties
└── messages_en.properties
```

## GDPR Compliance

### Data Protection Features

- **Consent Management**: Tracked per user
- **Right to Erasure**: Anonymization instead of deletion
- **Data Export**: Complete user data export capability
- **Audit Logging**: All access to personal data logged

### GDPR Admin Commands

```bash
# Export user data (JSON format)
curl -X GET "http://localhost:8080/api/v1/gdpr/export/{clientId}" \
  -H "Authorization: Bearer TOKEN"

# Anonymize user (GDPR right to be forgotten)
curl -X DELETE "http://localhost:8080/api/v1/gdpr/anonymize/{clientId}" \
  -H "Authorization: Bearer TOKEN"
```

## Backup & Recovery

### Database Backup

```bash
# PostgreSQL backup
docker exec realestate-db pg_dump -U crmuser realestate_crm > backup.sql

# SQLite backup (MVP)
docker cp realestate-backend:/app/data/realestate_crm.db ./backup-$(date +%Y%m%d).db
```

### File Upload Backup

```bash
# Backup uploaded files
docker run --rm -v realestate_uploads:/data -v $(pwd):/backup \
  alpine tar czf /backup/uploads-backup-$(date +%Y%m%d).tar.gz /data
```

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

**File Upload Permissions**
```bash
# Fix upload directory permissions
docker exec realestate-backend chown -R app:app /app/uploads
docker exec realestate-backend chmod -R 755 /app/uploads
```

## Performance Tuning

### Production Optimizations

```yaml
# docker-compose.prod.yml additions
services:
  backend:
    deploy:
      resources:
        limits:
          memory: 1GB
          cpus: '0.5'
    environment:
      JAVA_OPTS: "-Xms512m -Xmx1024m -XX:+UseG1GC"

  database:
    command: postgres -c shared_buffers=256MB -c max_connections=100
```

### Database Performance

```sql
-- Recommended indexes (created automatically)
CREATE INDEX idx_client_agent_id ON clients(agent_id);
CREATE INDEX idx_property_agent_id ON properties(agent_id);
CREATE INDEX idx_call_note_client_id ON call_notes(client_id);
CREATE INDEX idx_property_search ON properties(square_meters, room_count, price);
```

## Support & Resources

- **API Documentation**: http://localhost:8080/swagger-ui/index.html
- **Health Check**: http://localhost:8080/actuator/health
- **Metrics**: http://localhost:8080/actuator/metrics
- **Configuration**: All environment variables in `.env` file

### Update & Maintenance

```bash
# Update to latest version
git pull origin main
docker-compose pull
docker-compose up -d

# Apply database migrations
docker exec realestate-backend java -jar app.jar --spring.profiles.active=migrate
```

---

**Need Help?** Check the logs first: `docker-compose logs -f backend frontend`