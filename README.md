# MarklerApp - Real Estate CRM

<div align="center">

![MarklerApp](https://img.shields.io/badge/MarklerApp-Real%20Estate%20CRM-blue)
![Angular](https://img.shields.io/badge/Angular-17-red)
![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.2.0-green)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-blue)
![License](https://img.shields.io/badge/license-MIT-blue)

**A comprehensive Real Estate CRM system for German real estate agents**

[Features](#-features) • [Tech Stack](#-tech-stack) • [Getting Started](#-getting-started) • [Deployment](#-deployment) • [Documentation](#-documentation)

</div>

---

## 📋 Overview

**MarklerApp** is a modern, full-stack Real Estate CRM application designed specifically for German real estate agents. It provides complete client management, communication tracking, and property management with full GDPR compliance and bilingual support (German/English).

### ✨ Features

- 🏢 **Client Management**: Complete CRUD operations with search, pagination, and sorting
- 📞 **Call Notes & Communication Tracking**: Detailed communication history with categorization
- 🏡 **Property Management**: Property listings with image support and advanced search
- 🔍 **Intelligent Matching**: AI-powered property-client matching algorithms
- 🌍 **Bilingual Support**: Full German/English localization
- 🔒 **GDPR Compliant**: Data consent management, export, and audit logging
- 🎨 **Modern UI**: Dark/light theme with responsive Tailwind CSS design
- 🔐 **Secure Authentication**: JWT-based authentication with role-based access

---

## 🛠️ Tech Stack

### Frontend
- **Angular 17** - Standalone components architecture
- **TypeScript 5+** - Strict mode enabled
- **Tailwind CSS** - Utility-first styling with dark/light themes
- **RxJS** - Reactive programming
- **Angular i18n** - German/English translations

### Backend
- **Java 17** - Modern Java features
- **Spring Boot 3.2.0** - Enterprise-grade framework
- **Spring Security** - JWT authentication
- **Spring Data JPA** - Database abstraction
- **PostgreSQL 15** - Production database
- **Flyway** - Database migrations
- **OpenAPI/Swagger** - API documentation

### DevOps
- **Docker** - Containerization
- **GitHub** - Version control
- **Vercel** - Frontend deployment
- **Railway/Render** - Backend deployment (recommended)

---

## 📦 Prerequisites

### For Local Development
- **Node.js 20+** and npm
- **Java 17** (Eclipse Temurin recommended)
- **Maven 3.8+**
- **Docker & Docker Compose** (optional but recommended)
- **PostgreSQL 15** (if not using Docker)

### For Deployment
- **GitHub Account** - For repository hosting
- **Vercel Account** - For frontend deployment
- **Railway/Render Account** - For backend deployment
- **PostgreSQL Database** - Vercel Postgres, Supabase, or managed PostgreSQL

---

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/MarklerApp.git
cd MarklerApp
```

### 2. Local Development with Docker (Recommended)

```bash
# Start all services (frontend, backend, database)
docker compose -f docker-compose.dev.yml up --build

# Access points:
# Frontend: http://localhost:4200
# Backend API: http://localhost:8085
# API Docs: http://localhost:8085/swagger-ui.html
# PostgreSQL: localhost:5432
```

### 3. Manual Local Development

#### Backend Setup

```bash
cd backend

# Configure application.yml with your database settings
# Edit: src/main/resources/application.yml

# Run the backend
mvn spring-boot:run
```

#### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm start

# Frontend will be available at http://localhost:4200
```

### 4. Create Initial Admin User

After starting the application, use the API or database to create an initial agent user:

```sql
INSERT INTO agents (id, username, email, password_hash, first_name, last_name, phone, active, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'admin',
  'admin@marklerapp.com',
  '$2a$10$...',  -- Use bcrypt to hash 'admin123' or your password
  'Admin',
  'User',
  '+49 123 456789',
  true,
  NOW(),
  NOW()
);
```

---

## 🚀 Deployment

### Production Docker Deployment (Recommended for Self-Hosting)

**Deploy the complete stack on your own server (e.g., Raspberry Pi) with HTTPS support.**

This is the recommended approach if you want full control, GDPR compliance, and on-premise hosting.

#### Quick Start

```bash
# 1. Generate SSL certificates (Let's Encrypt)
sudo apt-get install certbot
sudo certbot certonly --standalone -d your-domain.com
cd MarklerApp
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem ./nginx/ssl/
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem ./nginx/ssl/

# 2. Configure environment
cp .env.production .env.prod
nano .env.prod  # Update DOMAIN_NAME, JWT_SECRET, POSTGRES_PASSWORD

# 3. Deploy
docker compose --env-file .env.prod up --build -d

# Access at: https://your-domain.com
```

**Features:**
- ✅ Nginx reverse proxy with HTTPS (Let's Encrypt or self-signed)
- ✅ Complete backend + frontend + database
- ✅ Network isolation (database not exposed externally)
- ✅ Resource limits optimized for Raspberry Pi (4GB+ RAM)
- ✅ Automatic SSL certificate renewal
- ✅ Security headers and rate limiting

**Documentation:**
- **Complete Guide**: See `docs/PRODUCTION_DEPLOYMENT.md`
- **Quick Reference**: See `START_PRODUCTION.md`

**Requirements:**
- Docker & Docker Compose
- Domain name with DNS configured
- 4GB+ RAM, 10GB+ storage
- SSL certificate (Let's Encrypt or self-signed)

---

### Vercel Deployment (Frontend)

#### Step 1: Prepare Your Repository

1. **Push your code to GitHub**:
   ```bash
   git add .
   git commit -m "Prepare for deployment"
   git push origin main
   ```

2. **Ensure frontend build configuration** in `frontend/angular.json`:
   ```json
   {
     "projects": {
       "frontend": {
         "architect": {
           "build": {
             "options": {
               "outputPath": "dist/frontend",
               "index": "src/index.html",
               "main": "src/main.ts"
             }
           }
         }
       }
     }
   }
   ```

#### Step 2: Deploy to Vercel

1. **Go to [Vercel Dashboard](https://vercel.com/dashboard)**
2. **Click "Add New Project"**
3. **Import your GitHub repository**
4. **Configure the project**:

   **Framework Preset**: Select `Other` (we'll configure manually)

   **Root Directory**: `frontend`

   **Build & Development Settings**:
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist/frontend/browser` (Angular 17+)
   - **Install Command**: `npm install`
   - **Development Command**: `npm start`

#### Step 3: Configure Environment Variables

In Vercel Dashboard → Project Settings → Environment Variables, add:

| Variable Name | Value | Description |
|---------------|-------|-------------|
| `VITE_API_URL` or `NG_APP_API_URL` | `https://your-backend-url.com/api/v1` | Backend API URL |
| `NODE_VERSION` | `20.x` | Node.js version |

**Important**: The frontend environment files need to be configured in `frontend/src/environments/`:

**environment.prod.ts**:
```typescript
export const environment = {
  production: true,
  apiUrl: 'https://your-backend-url.com/api/v1'
};
```

#### Step 4: Deploy

1. Click **Deploy**
2. Wait for the build to complete (typically 2-3 minutes)
3. Your frontend will be live at `https://your-project.vercel.app`

---

### Backend Deployment Options

Vercel does not support Java/Spring Boot backends. You need to deploy the backend separately:

#### Option 1: Railway (Recommended)

1. **Create account** at [Railway.app](https://railway.app)
2. **Create New Project** → Deploy from GitHub
3. **Select backend folder** (use `backend` directory)
4. **Add PostgreSQL Database**:
   - Railway provides one-click PostgreSQL
   - Automatically provides `DATABASE_URL`

5. **Configure Environment Variables**:

   | Variable Name | Example Value | Description |
   |---------------|---------------|-------------|
   | `SPRING_DATASOURCE_URL` | `jdbc:postgresql://host:5432/dbname` | Database connection URL |
   | `SPRING_DATASOURCE_USERNAME` | `postgres` | Database username |
   | `SPRING_DATASOURCE_PASSWORD` | `your-password` | Database password |
   | `JWT_SECRET` | `your-256-bit-secret-key` | JWT signing key (generate securely) |
   | `CORS_ALLOWED_ORIGINS` | `https://your-project.vercel.app` | Your Vercel frontend URL |
   | `FILE_UPLOAD_PATH` | `/app/uploads` | Path for file uploads |
   | `SPRING_PROFILES_ACTIVE` | `prod` | Spring profile |
   | `SERVER_PORT` | `8085` | Application port |

6. **Deploy**: Railway automatically builds and deploys on git push

#### Option 2: Render

1. **Create account** at [Render.com](https://render.com)
2. **New Web Service** → Connect GitHub repository
3. **Configure**:
   - **Environment**: `Docker`
   - **Dockerfile path**: `backend/Dockerfile`
   - **Plan**: Choose based on your needs (Starter is fine)

4. **Add PostgreSQL Database**: Render → New → PostgreSQL
5. **Configure environment variables** (same as Railway table above)
6. **Deploy**: Render builds and deploys automatically

#### Option 3: DigitalOcean App Platform

1. **Create account** at DigitalOcean
2. **Apps → Create App** → GitHub
3. **Select repository** and backend folder
4. **Add Managed PostgreSQL Database**
5. **Configure environment variables**
6. **Deploy**

---

### Database Setup

#### Option 1: Vercel Postgres

1. **In Vercel Dashboard** → Storage → Create Database → Postgres
2. **Copy connection details**:
   ```
   POSTGRES_URL="postgres://user:pass@host:5432/db"
   POSTGRES_URL_NON_POOLING="postgres://user:pass@host:5432/db?sslmode=require"
   ```
3. **Use these in your backend deployment** environment variables

#### Option 2: Supabase (Free Tier)

1. **Create project** at [Supabase.com](https://supabase.com)
2. **Get database credentials** from Settings → Database
3. **Connection string format**:
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
   ```
4. **Use this in backend `SPRING_DATASOURCE_URL`**

#### Option 3: Railway Postgres

1. **In Railway project** → New → Database → PostgreSQL
2. **Variables tab** shows connection details automatically
3. **Railway automatically injects** database environment variables

---

## 🔧 Environment Variables Reference

### Frontend Environment Variables

Create `frontend/src/environments/environment.prod.ts`:

```typescript
export const environment = {
  production: true,
  apiUrl: 'https://your-backend-url.railway.app/api/v1',
  appVersion: '1.0.0',
  enableAnalytics: true
};
```

### Backend Environment Variables

Required for production deployment:

```env
# Database Configuration
SPRING_DATASOURCE_URL=jdbc:postgresql://host:5432/database
SPRING_DATASOURCE_USERNAME=postgres
SPRING_DATASOURCE_PASSWORD=secure_password

# Spring Configuration
SPRING_PROFILES_ACTIVE=prod
SPRING_JPA_HIBERNATE_DDL_AUTO=validate
SPRING_JPA_PROPERTIES_HIBERNATE_DIALECT=org.hibernate.dialect.PostgreSQLDialect

# Security
JWT_SECRET=your-256-bit-secret-key-change-this-in-production
JWT_EXPIRATION_MS=86400000

# CORS
CORS_ALLOWED_ORIGINS=https://your-frontend.vercel.app,https://www.yourdomain.com

# File Storage
FILE_UPLOAD_PATH=/app/uploads
MAX_FILE_SIZE=10MB
MAX_REQUEST_SIZE=50MB

# Server
SERVER_PORT=8085
CONTEXT_PATH=/api/v1

# Logging
LOGGING_LEVEL_COM_MARKLERAPP=INFO
LOGGING_LEVEL_ORG_HIBERNATE_SQL=WARN
```

### Generate Secure JWT Secret

```bash
# Use openssl to generate a secure 256-bit key
openssl rand -base64 64
```

---

## 🔗 Connecting Frontend to Backend

### Update Frontend API URL

1. **In your deployed Vercel project** → Settings → Environment Variables
2. **Add or update**:
   ```
   NG_APP_API_URL=https://your-backend.railway.app/api/v1
   ```

3. **Redeploy frontend** to apply changes

### Update Backend CORS

1. **In your backend deployment** (Railway/Render) → Environment Variables
2. **Add your Vercel URL to CORS**:
   ```
   CORS_ALLOWED_ORIGINS=https://your-project.vercel.app
   ```

3. **Redeploy backend** to apply changes

---

## 📚 Documentation

- **API Documentation**: Available at `https://your-backend-url/swagger-ui.html`
- **Developer Guide**: See [CLAUDE.md](CLAUDE.md) for detailed development guidelines
- **Feature Specifications**: Located in `specs/001-realestate-crm/`
- **Architecture Decisions**: Documented in code comments and spec files

---

## 🧪 Testing

### Frontend Tests

```bash
cd frontend

# Unit tests
npm test

# E2E tests
npm run e2e

# Linting
npm run lint
```

### Backend Tests

```bash
cd backend

# Run all tests
mvn test

# Run specific test
mvn test -Dtest=ClientServiceTest

# Generate coverage report
mvn test jacoco:report
```

---

## 🐛 Troubleshooting

### Common Issues

#### 1. CORS Errors in Production

**Problem**: Frontend cannot connect to backend
**Solution**:
- Verify `CORS_ALLOWED_ORIGINS` includes your Vercel URL
- Check backend logs for CORS-related errors
- Ensure Vercel URL matches exactly (with/without trailing slash)

#### 2. Database Connection Fails

**Problem**: Backend cannot connect to database
**Solution**:
- Verify database connection string format
- Check username/password are correct
- Ensure database allows connections from your backend host
- For Supabase: Use connection pooler URL for serverless environments

#### 3. JWT Token Issues

**Problem**: Authentication fails after deployment
**Solution**:
- Verify `JWT_SECRET` is set and consistent
- Check JWT expiration time (`JWT_EXPIRATION_MS`)
- Ensure frontend and backend are using matching secret

#### 4. File Uploads Fail

**Problem**: Property images cannot be uploaded
**Solution**:
- Check `FILE_UPLOAD_PATH` has write permissions
- Verify `MAX_FILE_SIZE` and `MAX_REQUEST_SIZE` are sufficient
- For Railway: Use persistent volumes or external storage (S3)

#### 5. Vercel Build Fails

**Problem**: Frontend build fails on Vercel
**Solution**:
- Check `NODE_VERSION` matches your local version
- Verify build command is correct: `npm run build`
- Check output directory: `dist/frontend/browser` (Angular 17+)
- Review build logs for specific errors

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 👥 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📞 Support

For issues, questions, or contributions:
- **Issues**: [GitHub Issues](https://github.com/YOUR_USERNAME/MarklerApp/issues)
- **Email**: support@marklerapp.com
- **Documentation**: See [CLAUDE.md](CLAUDE.md)

---

<div align="center">

**Built with ❤️ for Real Estate Professionals**

[⬆ Back to Top](#marklerapp---real-estate-crm)

</div>
