# Quick Start Guide - Production Deployment

This is a quick reference for deploying MarklerApp to production on Raspberry Pi. For detailed instructions, see `docs/PRODUCTION_DEPLOYMENT.md`.

## Prerequisites Checklist

- [ ] Raspberry Pi 4B with 4GB+ RAM and 10GB+ free storage
- [ ] Docker and Docker Compose installed
- [ ] Domain name pointing to your Raspberry Pi
- [ ] Ports 80 and 443 forwarded to your Raspberry Pi
- [ ] SSL certificates generated (Let's Encrypt or self-signed)

## Quick Deployment Steps

### 1. Generate SSL Certificates

**Option A: Let's Encrypt (Recommended)**

```bash
# Install certbot
sudo apt-get install certbot

# Generate certificate (replace your-domain.com)
sudo certbot certonly --standalone -d your-domain.com

# Copy certificates to project
cd /path/to/MarklerApp
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem ./nginx/ssl/
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem ./nginx/ssl/
sudo chown $USER:$USER ./nginx/ssl/*.pem
chmod 644 ./nginx/ssl/fullchain.pem
chmod 600 ./nginx/ssl/privkey.pem
```

**Option B: Self-Signed (Testing Only)**

```bash
cd /path/to/MarklerApp
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout ./nginx/ssl/privkey.pem \
  -out ./nginx/ssl/fullchain.pem \
  -subj "/C=DE/ST=State/L=City/O=Organization/CN=your-domain.com"
chmod 644 ./nginx/ssl/fullchain.pem
chmod 600 ./nginx/ssl/privkey.pem
```

### 2. Configure Environment

```bash
# Copy production template
cp .env.production .env.prod

# Generate secrets
echo "JWT_SECRET=$(openssl rand -base64 64)"
echo "POSTGRES_PASSWORD=$(openssl rand -base64 32)"

# Edit configuration
nano .env.prod
```

**Update these values:**
- `DOMAIN_NAME=your-domain.com`
- `CORS_ALLOWED_ORIGINS=https://your-domain.com`
- `POSTGRES_PASSWORD=<generated password>`
- `JWT_SECRET=<generated secret>`

Save and exit (Ctrl+X, Y, Enter)

### 3. Deploy

```bash
cd /path/to/MarklerApp

# Build and start all services
docker compose --env-file .env.prod up --build -d

# Monitor startup (first run takes 15-20 minutes for Ollama model download)
docker compose logs -f

# Press Ctrl+C when done watching (services keep running)
```

### 4. Verify Deployment

```bash
# Check all services are healthy
docker compose ps

# Test HTTPS
curl https://your-domain.com/health

# Test backend API
curl https://your-domain.com/api/v1/actuator/health

# Open in browser
open https://your-domain.com
```

## Common Issues

### Services Not Starting

```bash
# Check logs
docker compose logs

# Restart services
docker compose restart
```

### Out of Memory

```bash
# Check memory usage
docker stats
free -h

# Disable Ollama if needed (edit .env.prod)
OLLAMA_ENABLED=false
docker compose --env-file .env.prod up -d
```

### SSL Certificate Errors

```bash
# Verify certificates exist
ls -lh ./nginx/ssl/

# Check nginx logs
docker compose logs nginx

# Regenerate certificates (see step 1)
```

### CORS Errors

```bash
# Verify CORS_ALLOWED_ORIGINS matches your domain
grep CORS_ALLOWED_ORIGINS .env.prod

# Should be: CORS_ALLOWED_ORIGINS=https://your-domain.com

# Restart backend
docker compose restart backend
```

## Maintenance Commands

```bash
# View logs
docker compose logs -f [service_name]

# Restart service
docker compose restart [service_name]

# Stop all services
docker compose down

# Update and restart
git pull && docker compose --env-file .env.prod up --build -d

# Backup database
docker compose exec database pg_dump -U crmuser realestate_crm | gzip > backup_$(date +%Y%m%d).sql.gz

# Check resource usage
docker stats

# Check Raspberry Pi temperature
vcgencmd measure_temp
```

## Resource Usage (Typical)

- **Total RAM**: ~2.5-3.5GB (with Ollama)
- **Storage**: ~5GB (images + models + data)
- **CPU**: Low (<30% average, spikes during AI summarization)

## Security Notes

- ✅ Change all default passwords (PostgreSQL, JWT secret)
- ✅ Use Let's Encrypt for production SSL certificates
- ✅ Keep system updated (`sudo apt-get update && sudo apt-get upgrade`)
- ✅ Setup firewall (`sudo ufw enable`)
- ✅ Enable automatic backups (see docs/PRODUCTION_DEPLOYMENT.md)

## Support

For detailed documentation, troubleshooting, and advanced configuration:
- See `docs/PRODUCTION_DEPLOYMENT.md`
- Check project issues on GitHub
- Review Docker logs: `docker compose logs`

## Service Endpoints

- **Frontend**: https://your-domain.com
- **Backend API**: https://your-domain.com/api/v1
- **API Docs**: https://your-domain.com/api/v1/swagger-ui.html
- **Health Check**: https://your-domain.com/health

---

**First deployment?** Follow the complete guide in `docs/PRODUCTION_DEPLOYMENT.md`
