# Quick Command Reference - Production Deployment

Fast reference for common MarklerApp deployment and maintenance commands.

---

## 🚀 Initial Deployment

```bash
# 1. Verify system requirements
./scripts/verify-deployment.sh

# 2. Generate SSL certificates (Let's Encrypt)
sudo ./scripts/setup-letsencrypt.sh

# OR generate self-signed (testing only)
./scripts/generate-self-signed-cert.sh

# 3. Configure environment
cp .env.production .env.prod
nano .env.prod  # Update DOMAIN_NAME, JWT_SECRET, POSTGRES_PASSWORD

# 4. Deploy
docker compose --env-file .env.prod up --build -d

# 5. Monitor startup (first run takes 15-20 min for Ollama)
docker compose logs -f
```

---

## 📊 Monitoring

```bash
# View all logs
docker compose logs -f

# View specific service logs
docker compose logs -f backend
docker compose logs -f nginx
docker compose logs -f ollama

# Check container status
docker compose ps

# Monitor resource usage
docker stats

# Check Raspberry Pi temperature
vcgencmd measure_temp

# Check disk space
df -h

# Check memory
free -h
```

---

## 🔄 Service Management

```bash
# Restart all services
docker compose restart

# Restart specific service
docker compose restart backend

# Stop all services
docker compose down

# Start services
docker compose --env-file .env.prod up -d

# Rebuild and restart
docker compose --env-file .env.prod up --build -d

# View service status
docker compose ps
```

---

## 🔍 Health Checks

```bash
# HTTP to HTTPS redirect
curl -I http://your-domain.com/

# HTTPS health endpoint
curl https://your-domain.com/health

# Backend API health
curl https://your-domain.com/api/v1/actuator/health

# Verify SSL certificate
openssl s_client -connect your-domain.com:443 -servername your-domain.com < /dev/null

# Check security headers
curl -I https://your-domain.com/

# Check Ollama
docker compose exec ollama curl -s http://localhost:11434/api/tags
```

---

## 💾 Database Operations

```bash
# Connect to database
docker compose exec database psql -U crmuser -d realestate_crm

# Useful psql commands (inside database):
\dt                           # List tables
\d table_name                 # Describe table
SELECT COUNT(*) FROM clients; # Count records
\q                            # Exit

# Backup database
docker compose exec database pg_dump -U crmuser realestate_crm | gzip > backup_$(date +%Y%m%d).sql.gz

# Restore database
gunzip -c backup_20260206.sql.gz | docker compose exec -T database psql -U crmuser realestate_crm

# Check database size
docker compose exec database psql -U crmuser -d realestate_crm -c "SELECT pg_size_pretty(pg_database_size('realestate_crm'));"
```

---

## 🔐 SSL Certificate Management

```bash
# Check certificate expiry
openssl x509 -in ./nginx/ssl/fullchain.pem -noout -dates

# Check certificate details
openssl x509 -in ./nginx/ssl/fullchain.pem -text -noout

# Test Let's Encrypt renewal (dry run)
sudo certbot renew --dry-run

# Force certificate renewal
sudo certbot renew --force-renewal

# List all certificates
sudo certbot certificates

# Reload nginx after certificate update
docker compose exec nginx nginx -s reload
```

---

## 🧹 Cleanup & Maintenance

```bash
# Remove stopped containers
docker compose rm -f

# Remove unused images
docker image prune -a

# Remove unused volumes (CAUTION: deletes data!)
docker volume prune

# Remove all unused Docker resources
docker system prune -a

# View Docker disk usage
docker system df

# Clean logs (if they get too large)
truncate -s 0 $(docker inspect --format='{{.LogPath}}' realestate-backend)
```

---

## 🔧 Troubleshooting

```bash
# View last 100 log lines
docker compose logs --tail=100 backend

# Follow logs with timestamps
docker compose logs -t -f backend

# Check container resource limits
docker inspect realestate-backend | grep -A 10 Memory

# Check if services are restarting
docker compose ps
watch -n 5 docker compose ps

# Test nginx configuration
docker compose exec nginx nginx -t

# Reload nginx without restart
docker compose exec nginx nginx -s reload

# Check network connectivity
docker compose exec backend ping database
docker compose exec nginx ping backend

# View environment variables
docker compose exec backend env | grep -E "SPRING|POSTGRES|JWT"

# Check Java process in backend
docker compose exec backend ps aux
docker compose exec backend java -version
```

---

## 📦 Updates & Deployment

```bash
# Pull latest code
git pull

# Rebuild specific service
docker compose build backend

# Rebuild and restart all services
docker compose --env-file .env.prod up --build -d

# Update system packages
sudo apt-get update && sudo apt-get upgrade

# Update Docker images
docker compose pull
```

---

## 🔑 Security Operations

```bash
# Generate new JWT secret
openssl rand -base64 64

# Generate new PostgreSQL password
openssl rand -base64 32

# Generate new DH parameters
openssl dhparam -out ./nginx/ssl/dhparam.pem 2048

# Check firewall status
sudo ufw status

# Check open ports
sudo netstat -tlnp

# Check failed login attempts (if fail2ban installed)
sudo fail2ban-client status
```

---

## 📈 Performance & Optimization

```bash
# Check connection to database
docker compose exec backend wget -O- http://database:5432 2>&1 | head

# Check backend startup time
docker compose logs backend | grep "Started"

# Monitor backend JVM memory
docker compose exec backend jmap -heap 1

# Check PostgreSQL connections
docker compose exec database psql -U crmuser -d realestate_crm -c "SELECT count(*) FROM pg_stat_activity;"

# Check PostgreSQL slow queries
docker compose exec database psql -U crmuser -d realestate_crm -c "SELECT query, calls, total_time, mean_time FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;"
```

---

## 🧪 Testing

```bash
# Test frontend is serving
curl -I https://your-domain.com/

# Test API endpoint
curl -X POST https://your-domain.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"test"}'

# Test CORS headers
curl -H "Origin: https://your-domain.com" \
  -H "Access-Control-Request-Method: GET" \
  -X OPTIONS https://your-domain.com/api/v1/clients

# Load test (using ab - apache bench)
sudo apt-get install apache2-utils
ab -n 1000 -c 10 https://your-domain.com/

# Check rate limiting
for i in {1..20}; do curl -s -o /dev/null -w "%{http_code}\n" https://your-domain.com/api/v1/actuator/health; done
```

---

## 📱 Quick Fixes

### Services won't start
```bash
docker compose down
docker compose --env-file .env.prod up --build -d
docker compose logs -f
```

### Out of memory
```bash
# Check usage
docker stats
free -h

# Option 1: Disable Ollama
nano .env.prod  # Set OLLAMA_ENABLED=false
docker compose --env-file .env.prod up -d

# Option 2: Reduce JVM memory
nano .env.prod  # Set JAVA_OPTS=-Xmx384m -Xms192m ...
docker compose restart backend
```

### SSL errors
```bash
# Check certificates
ls -lh ./nginx/ssl/
openssl x509 -in ./nginx/ssl/fullchain.pem -text -noout

# Regenerate certificates
sudo ./scripts/setup-letsencrypt.sh
# OR
./scripts/generate-self-signed-cert.sh

# Restart nginx
docker compose restart nginx
```

### Database connection issues
```bash
docker compose logs database
docker compose restart database
docker compose restart backend
```

### High temperature
```bash
vcgencmd measure_temp
# If > 70°C:
# - Check cooling
# - Reduce resource limits
# - Consider disabling Ollama
```

---

## 📋 Environment Variables Quick Edit

```bash
# Edit production environment
nano .env.prod

# Required changes:
# DOMAIN_NAME=your-domain.com
# CORS_ALLOWED_ORIGINS=https://your-domain.com
# POSTGRES_PASSWORD=<secure-password>
# JWT_SECRET=<64-char-secret>

# After editing, restart services
docker compose --env-file .env.prod up -d
```

---

## 🎯 One-Liners

```bash
# Complete deployment from scratch
./scripts/verify-deployment.sh && sudo ./scripts/setup-letsencrypt.sh && docker compose --env-file .env.prod up --build -d

# Quick restart
docker compose restart

# View all errors in logs
docker compose logs | grep -i error

# Check if all services are healthy
docker compose ps | grep -v "Up (healthy)" | grep "Up"

# Backup everything
docker compose exec database pg_dump -U crmuser realestate_crm | gzip > backup_$(date +%Y%m%d_%H%M%S).sql.gz

# Update and restart
git pull && docker compose --env-file .env.prod up --build -d && docker compose logs -f

# Check total resource usage
docker stats --no-stream | awk 'NR>1 {sum+=$4} END {print "Total Memory: " sum "%"}'
```

---

## 📚 Documentation Locations

- **Complete Guide**: `docs/PRODUCTION_DEPLOYMENT.md`
- **Quick Start**: `START_PRODUCTION.md`
- **Checklist**: `DEPLOYMENT_CHECKLIST.md`
- **Implementation Details**: `IMPLEMENTATION_SUMMARY.md`
- **Scripts Help**: `scripts/README.md`
- **Project Config**: `CLAUDE.md`

---

**Tip**: Bookmark this file for quick access to common commands!

**Last Updated**: 2026-02-06
