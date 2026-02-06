# Production Deployment Guide - Raspberry Pi

**Version**: 1.0
**Last Updated**: 2026-02-06
**Target Platform**: Raspberry Pi 4B (4GB+ RAM recommended)

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [SSL Certificate Setup](#ssl-certificate-setup)
3. [Environment Configuration](#environment-configuration)
4. [Deployment](#deployment)
5. [Verification](#verification)
6. [Monitoring](#monitoring)
7. [Troubleshooting](#troubleshooting)
8. [Maintenance](#maintenance)

---

## Prerequisites

### Hardware Requirements

- **Raspberry Pi 4B or newer** (4GB+ RAM recommended, 8GB ideal)
- **Storage**: 10GB+ free space
  - Docker images: ~2GB
  - Ollama Phi-3 Mini model: ~2.3GB
  - Database + uploads: Variable
- **Network**: Static IP or DHCP reservation recommended
- **Power**: Official Raspberry Pi power supply (important for stability)

### Software Requirements

1. **Operating System**: Raspberry Pi OS 64-bit (Bullseye or newer)
2. **Docker & Docker Compose**:

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add your user to docker group
sudo usermod -aG docker $USER
newgrp docker

# Install Docker Compose
sudo apt-get update
sudo apt-get install docker-compose-plugin

# Verify installation
docker --version
docker compose version
```

3. **Git** (if cloning repository):

```bash
sudo apt-get install git
```

### Domain Configuration

Before deployment, ensure you have:

- **Domain name** pointing to your Raspberry Pi's public IP
- **Port forwarding** configured on your router:
  - Port 80 (HTTP) → Raspberry Pi IP:80
  - Port 443 (HTTPS) → Raspberry Pi IP:443
- **Dynamic DNS** (optional, if you don't have static IP): Use services like DuckDNS, No-IP, etc.

---

## SSL Certificate Setup

### Option 1: Let's Encrypt (Recommended for Production)

**Requirements**: Valid domain name pointing to your Raspberry Pi

#### Step 1: Install Certbot

```bash
sudo apt-get update
sudo apt-get install certbot
```

#### Step 2: Generate Certificate

**Important**: Stop any services using port 80 before running certbot:

```bash
# If docker services are running, stop them first
cd /path/to/MarklerApp
docker compose down

# Generate certificate (replace with your domain)
sudo certbot certonly --standalone -d your-domain.com -d www.your-domain.com

# Certificate files will be created at:
# /etc/letsencrypt/live/your-domain.com/fullchain.pem
# /etc/letsencrypt/live/your-domain.com/privkey.pem
```

#### Step 3: Copy Certificates to Project

```bash
# Navigate to your project directory
cd /path/to/MarklerApp

# Copy certificates (requires sudo)
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem ./nginx/ssl/
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem ./nginx/ssl/

# Set proper permissions
sudo chown $USER:$USER ./nginx/ssl/*.pem
chmod 644 ./nginx/ssl/fullchain.pem
chmod 600 ./nginx/ssl/privkey.pem
```

#### Step 4: Setup Certificate Renewal

Let's Encrypt certificates expire after 90 days. Setup automatic renewal:

```bash
# Test renewal (dry run)
sudo certbot renew --dry-run

# Create renewal hook script
sudo nano /etc/letsencrypt/renewal-hooks/deploy/copy-to-nginx.sh
```

Add this content:

```bash
#!/bin/bash
# Copy renewed certificates to docker project
DOMAIN="your-domain.com"
PROJECT_DIR="/path/to/MarklerApp"

cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem $PROJECT_DIR/nginx/ssl/
cp /etc/letsencrypt/live/$DOMAIN/privkey.pem $PROJECT_DIR/nginx/ssl/
chown $USER:$USER $PROJECT_DIR/nginx/ssl/*.pem
chmod 644 $PROJECT_DIR/nginx/ssl/fullchain.pem
chmod 600 $PROJECT_DIR/nginx/ssl/privkey.pem

# Reload nginx container
cd $PROJECT_DIR
docker compose exec nginx nginx -s reload
```

Make it executable:

```bash
sudo chmod +x /etc/letsencrypt/renewal-hooks/deploy/copy-to-nginx.sh
```

Certbot will automatically run renewal checks twice daily.

### Option 2: Self-Signed Certificate (Testing/Development Only)

**Warning**: Self-signed certificates will show browser warnings. Only use for testing.

```bash
# Navigate to project directory
cd /path/to/MarklerApp

# Generate self-signed certificate (valid for 365 days)
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout ./nginx/ssl/privkey.pem \
  -out ./nginx/ssl/fullchain.pem \
  -subj "/C=DE/ST=State/L=City/O=Organization/CN=your-domain.com"

# Set proper permissions
chmod 644 ./nginx/ssl/fullchain.pem
chmod 600 ./nginx/ssl/privkey.pem
```

### Option 3: Generate DH Parameters (Optional, Enhanced Security)

For additional forward secrecy (takes 10-15 minutes on Raspberry Pi):

```bash
cd /path/to/MarklerApp
openssl dhparam -out ./nginx/ssl/dhparam.pem 2048

# Uncomment the dhparam line in nginx/conf.d/ssl.conf
```

---

## Environment Configuration

### Step 1: Copy Template

```bash
cd /path/to/MarklerApp
cp .env.production .env.prod
```

### Step 2: Generate Secrets

**JWT Secret** (required):

```bash
openssl rand -base64 64
```

**PostgreSQL Password** (required):

```bash
openssl rand -base64 32
```

### Step 3: Edit Configuration

```bash
nano .env.prod
```

Update the following values:

```bash
# REQUIRED CHANGES
DOMAIN_NAME=your-domain.com
CORS_ALLOWED_ORIGINS=https://your-domain.com
POSTGRES_PASSWORD=YOUR_GENERATED_POSTGRES_PASSWORD
JWT_SECRET=YOUR_GENERATED_JWT_SECRET

# OPTIONAL: Adjust memory if needed
# JAVA_OPTS=-Xmx512m -Xms256m -XX:+UseG1GC -XX:MaxGCPauseMillis=200 -XX:+UseStringDeduplication

# OPTIONAL: Disable Ollama if low on memory
# OLLAMA_ENABLED=false
```

**Save and exit** (Ctrl+X, Y, Enter)

### Step 4: Verify Configuration

```bash
# Check that SSL certificates exist
ls -lh ./nginx/ssl/

# Should show:
# fullchain.pem (certificate + chain)
# privkey.pem (private key)

# Verify environment file
cat .env.prod | grep -E "DOMAIN_NAME|JWT_SECRET|POSTGRES_PASSWORD"
# Ensure no default values like "CHANGE_ME"
```

---

## Deployment

### First-Time Deployment

```bash
cd /path/to/MarklerApp

# Pull latest code (if using git)
git pull

# Build and start all services
docker compose --env-file .env.prod up --build -d

# This will:
# 1. Build all docker images (~5-10 minutes)
# 2. Start database and wait for it to be healthy
# 3. Download Ollama model (~2.3GB, first run only, 10-15 minutes)
# 4. Start backend and run Flyway migrations
# 5. Start frontend
# 6. Start nginx reverse proxy

# Monitor the startup process
docker compose logs -f

# Press Ctrl+C to stop following logs (services keep running)
```

**Important**: First startup can take 15-20 minutes due to Ollama model download. Be patient.

### Verify Services are Running

```bash
docker compose ps

# All services should show "Up (healthy)" status
# NAME                     STATUS
# realestate-db            Up (healthy)
# realestate-ollama        Up (healthy)
# realestate-backend       Up (healthy)
# realestate-frontend      Up
# realestate-nginx         Up (healthy)
```

### Check Resource Usage

```bash
docker stats

# Verify total memory usage is within your Raspberry Pi's capacity
# Expected usage with Ollama:
# - database: ~100-200MB
# - ollama: ~1.5-2GB (with model loaded)
# - backend: ~400-600MB
# - frontend: ~20-40MB
# - nginx: ~10-20MB
# Total: ~2.5-3.5GB
```

---

## Verification

### 1. HTTP to HTTPS Redirect

```bash
curl -I http://your-domain.com/

# Should return:
# HTTP/1.1 301 Moved Permanently
# Location: https://your-domain.com/
```

### 2. HTTPS Health Check

```bash
curl https://your-domain.com/health

# Should return:
# healthy
```

### 3. SSL Certificate Validation

```bash
openssl s_client -connect your-domain.com:443 -servername your-domain.com < /dev/null

# Look for:
# - Verify return code: 0 (ok)  # For Let's Encrypt
# - Verify return code: 18 (self signed certificate)  # For self-signed
```

### 4. Backend API Health

```bash
curl https://your-domain.com/api/v1/actuator/health

# Should return:
# {"status":"UP"}
```

### 5. Security Headers

```bash
curl -I https://your-domain.com/

# Verify headers include:
# Strict-Transport-Security: max-age=31536000; includeSubDomains
# X-Frame-Options: SAMEORIGIN
# X-Content-Type-Options: nosniff
# Content-Security-Policy: ...
```

### 6. Frontend Application

Open in browser: `https://your-domain.com`

- Should load Angular application without errors
- Check browser console (F12) for any errors
- Test login functionality
- Verify language switching (DE/EN)

### 7. Ollama AI Service

```bash
# Check if Ollama is responding
docker compose exec ollama curl -s http://localhost:11434/api/tags

# Should return list of installed models including phi3-mini
```

**In the application**:
1. Create a test client
2. Add call notes for that client
3. Click "Generate AI Summary" button
4. Verify summary is generated (may take 10-30 seconds)

### 8. Database Connection

```bash
# Connect to database
docker compose exec database psql -U crmuser -d realestate_crm

# Run a test query
\dt  # List all tables
SELECT COUNT(*) FROM flyway_schema_history;  # Should show migration count
\q   # Exit
```

---

## Monitoring

### View Logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f backend
docker compose logs -f nginx
docker compose logs -f ollama

# Last 100 lines
docker compose logs --tail=100 backend

# With timestamps
docker compose logs -t backend
```

### Monitor Resource Usage

```bash
# Real-time stats
docker stats

# Check disk usage
docker system df

# Check volume sizes
docker volume ls
docker volume inspect realestate_db_data
docker volume inspect realestate_ollama_models
```

### Health Checks

```bash
# Check all container health
docker compose ps

# Manual health check
docker compose exec backend wget --spider -q http://localhost:8085/api/v1/actuator/health && echo "Backend: UP" || echo "Backend: DOWN"
```

### System Monitoring

```bash
# Raspberry Pi temperature (important!)
vcgencmd measure_temp

# Memory usage
free -h

# Disk space
df -h

# CPU usage
top
```

---

## Troubleshooting

### Issue: Containers Not Starting

**Check logs**:

```bash
docker compose logs
```

**Common causes**:
- Insufficient memory (check `docker stats`)
- Port already in use (check with `sudo netstat -tlnp | grep -E '80|443'`)
- Database not healthy (check `docker compose ps`)

**Solution**:

```bash
# Stop all services
docker compose down

# Remove old containers
docker compose rm -f

# Rebuild and start
docker compose --env-file .env.prod up --build -d
```

### Issue: SSL Certificate Errors

**Symptoms**:
- Browser shows "Your connection is not private"
- Nginx fails to start

**Check certificate files**:

```bash
ls -lh ./nginx/ssl/
# Should show fullchain.pem and privkey.pem

# Verify certificate validity
openssl x509 -in ./nginx/ssl/fullchain.pem -text -noout
```

**Solution**:
- Ensure certificate files exist and have correct permissions
- Regenerate certificates (see SSL Certificate Setup)
- Check nginx logs: `docker compose logs nginx`

### Issue: Ollama Model Download Fails

**Symptoms**:
- Backend shows Ollama connection errors
- AI summary feature doesn't work

**Check Ollama logs**:

```bash
docker compose logs ollama
```

**Solution**:

```bash
# Restart Ollama service
docker compose restart ollama

# Manually download model
docker compose exec ollama ollama pull phi3

# If storage is low, check disk space
df -h
```

### Issue: Backend Cannot Connect to Database

**Check database health**:

```bash
docker compose ps database
docker compose logs database
```

**Solution**:

```bash
# Restart database
docker compose restart database

# Wait for healthy status
docker compose ps

# Check backend logs for connection errors
docker compose logs backend | grep -i postgres
```

### Issue: High Memory Usage / Out of Memory

**Check usage**:

```bash
docker stats
free -h
```

**Solutions**:

1. **Disable Ollama** (saves ~2GB):

```bash
# Edit .env.prod
nano .env.prod

# Set OLLAMA_ENABLED=false
# Restart services
docker compose --env-file .env.prod up -d
```

2. **Reduce JVM memory**:

```bash
# Edit .env.prod
nano .env.prod

# Reduce JAVA_OPTS
JAVA_OPTS=-Xmx384m -Xms192m -XX:+UseG1GC -XX:MaxGCPauseMillis=200

# Restart backend
docker compose restart backend
```

3. **Enable swap** (not ideal, but helps):

```bash
# Check current swap
sudo swapon --show

# Add 2GB swap file
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Make permanent
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### Issue: CORS Errors

**Symptoms**:
- Frontend can't connect to backend
- Browser console shows CORS errors

**Check configuration**:

```bash
# Verify CORS_ALLOWED_ORIGINS matches your domain
grep CORS_ALLOWED_ORIGINS .env.prod
```

**Solution**:

```bash
# Update .env.prod with correct domain (include https://)
CORS_ALLOWED_ORIGINS=https://your-domain.com

# Restart backend
docker compose restart backend
```

### Issue: Nginx 502 Bad Gateway

**Causes**:
- Backend not running or not healthy
- Network connectivity issues

**Solution**:

```bash
# Check backend health
docker compose ps backend
docker compose logs backend

# Restart backend
docker compose restart backend

# Check network connectivity
docker compose exec nginx ping backend
```

### Issue: Raspberry Pi Overheating

**Check temperature**:

```bash
vcgencmd measure_temp
# Safe: < 70°C
# Warning: 70-80°C
# Throttling: > 80°C
```

**Solutions**:
- Ensure proper ventilation / add heatsinks or fan
- Reduce resource usage (disable Ollama, reduce JVM memory)
- Monitor: `watch -n 5 vcgencmd measure_temp`

---

## Maintenance

### Regular Updates

```bash
cd /path/to/MarklerApp

# Pull latest code
git pull

# Rebuild and restart services
docker compose --env-file .env.prod up --build -d

# Remove old images
docker image prune -f
```

### Database Backups

```bash
# Create backup directory
mkdir -p ~/backups

# Backup database
docker compose exec database pg_dump -U crmuser realestate_crm | gzip > ~/backups/realestate_crm_$(date +%Y%m%d_%H%M%S).sql.gz

# Restore from backup
gunzip -c ~/backups/realestate_crm_20260206_120000.sql.gz | docker compose exec -T database psql -U crmuser realestate_crm
```

**Automate backups** (daily at 2 AM):

```bash
# Create backup script
nano ~/backup_db.sh
```

Add:

```bash
#!/bin/bash
cd /path/to/MarklerApp
docker compose exec database pg_dump -U crmuser realestate_crm | gzip > ~/backups/realestate_crm_$(date +%Y%m%d_%H%M%S).sql.gz
# Keep only last 7 days
find ~/backups -name "realestate_crm_*.sql.gz" -mtime +7 -delete
```

```bash
chmod +x ~/backup_db.sh

# Add to crontab
crontab -e
# Add line:
0 2 * * * /home/pi/backup_db.sh
```

### Certificate Renewal

**Let's Encrypt certificates** renew automatically via certbot (see SSL Certificate Setup).

**Verify renewal**:

```bash
sudo certbot certificates
```

**Manual renewal** (if needed):

```bash
sudo certbot renew
# Then copy new certificates (see SSL Certificate Setup, Step 3)
docker compose exec nginx nginx -s reload
```

### Log Rotation

Docker automatically rotates logs, but you can configure limits:

```bash
# Edit docker daemon config
sudo nano /etc/docker/daemon.json
```

Add:

```json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
```

```bash
sudo systemctl restart docker
```

### Volume Cleanup

```bash
# Check volume sizes
docker system df -v

# Remove unused volumes (careful!)
docker volume prune

# Remove old images
docker image prune -a
```

### Restart Services

```bash
# Restart all services
docker compose restart

# Restart specific service
docker compose restart backend

# Full stop and start
docker compose down
docker compose --env-file .env.prod up -d
```

### Update Ollama Model

```bash
# Pull latest model version
docker compose exec ollama ollama pull phi3

# Restart backend to use updated model
docker compose restart backend
```

---

## Performance Tuning

### PostgreSQL Tuning for Raspberry Pi

Edit `backend/src/main/resources/application-prod.yml`:

```yaml
spring:
  datasource:
    hikari:
      maximum-pool-size: 5  # Reduce for low memory
      minimum-idle: 2
```

### Nginx Caching

Static assets are already cached (see `nginx/conf.d/default.conf`). To add API response caching:

```nginx
# Add to nginx/nginx.conf in http block
proxy_cache_path /var/cache/nginx/api levels=1:2 keys_zone=api_cache:10m max_size=100m inactive=60m;

# Add to specific API locations in default.conf
proxy_cache api_cache;
proxy_cache_valid 200 5m;
```

### Reduce Docker Image Sizes

```bash
# Remove build dependencies after building
docker image prune -a

# Use docker-slim (advanced)
# https://github.com/docker-slim/docker-slim
```

---

## Security Hardening

### Firewall Configuration

```bash
# Install ufw (if not installed)
sudo apt-get install ufw

# Configure firewall
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status
```

### Automatic Security Updates

```bash
sudo apt-get install unattended-upgrades
sudo dpkg-reconfigure --priority=low unattended-upgrades
```

### Change Default Passwords

Ensure you've changed:
- ✅ PostgreSQL password (in .env.prod)
- ✅ JWT secret (in .env.prod)
- ✅ Raspberry Pi user password (`passwd`)
- ✅ SSH keys (disable password auth, use keys only)

### Rate Limiting

Already configured in `nginx/nginx.conf`:
- API: 10 requests/second with burst of 20
- General: 30 requests/second with burst of 50

Adjust if needed for your use case.

### Fail2Ban (Optional)

Protect against brute force attacks:

```bash
sudo apt-get install fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

---

## Support & Resources

- **Project Repository**: [Add your repository URL]
- **Issue Tracker**: [Add your issue tracker URL]
- **Documentation**: `/docs` directory
- **Docker Logs**: `docker compose logs`
- **Raspberry Pi Documentation**: https://www.raspberrypi.org/documentation/

---

## Quick Reference Commands

```bash
# Start services
docker compose --env-file .env.prod up -d

# Stop services
docker compose down

# View logs
docker compose logs -f [service_name]

# Check status
docker compose ps

# Monitor resources
docker stats

# Backup database
docker compose exec database pg_dump -U crmuser realestate_crm | gzip > backup.sql.gz

# Restart service
docker compose restart [service_name]

# Update and rebuild
git pull && docker compose --env-file .env.prod up --build -d

# Check SSL certificate
openssl x509 -in ./nginx/ssl/fullchain.pem -text -noout

# Generate JWT secret
openssl rand -base64 64

# Check Pi temperature
vcgencmd measure_temp
```

---

**Last Updated**: 2026-02-06
**Version**: 1.0
**Maintainer**: MarklerApp Team
