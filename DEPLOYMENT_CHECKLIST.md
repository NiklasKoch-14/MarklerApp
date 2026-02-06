# Production Deployment Checklist

Use this checklist to ensure a smooth production deployment of MarklerApp to your Raspberry Pi.

## 📋 Pre-Deployment Checklist

### Hardware & System

- [ ] Raspberry Pi 4B with **4GB+ RAM** (8GB recommended)
- [ ] **10GB+ free storage** space
  - [ ] Run `df -h` to verify
- [ ] Stable power supply (official Raspberry Pi adapter)
- [ ] Adequate cooling (heatsink/fan recommended)
- [ ] **Static IP or DHCP reservation** configured
  - [ ] Note your Pi's IP: `hostname -I`

### Software Requirements

- [ ] **Raspberry Pi OS 64-bit** (Bullseye or newer)
  - [ ] Check version: `cat /etc/os-release`
- [ ] **Docker installed** (`docker --version`)
  - [ ] If not: `curl -fsSL https://get.docker.com | sh`
- [ ] **Docker Compose installed** (`docker compose version`)
  - [ ] If not: `sudo apt-get install docker-compose-plugin`
- [ ] User added to docker group: `sudo usermod -aG docker $USER`
- [ ] **Git installed** (`git --version`)

### Network Configuration

- [ ] **Domain name registered** and DNS configured
  - [ ] A record points to your public IP
  - [ ] Verify: `nslookup your-domain.com`
- [ ] **Router port forwarding** configured
  - [ ] Port 80 → Raspberry Pi IP:80
  - [ ] Port 443 → Raspberry Pi IP:443
- [ ] **Dynamic DNS** configured (if using dynamic IP)
  - [ ] Options: DuckDNS, No-IP, CloudFlare, etc.
- [ ] Firewall rules allow ports 80, 443
  - [ ] Check: `sudo ufw status`

---

## 🔐 SSL Certificate Setup

### Option A: Let's Encrypt (Recommended)

- [ ] Stop any services using port 80
  - [ ] Check: `sudo lsof -i :80`
- [ ] Run setup script: `sudo ./scripts/setup-letsencrypt.sh`
- [ ] Verify certificates created in `./nginx/ssl/`
  - [ ] `fullchain.pem` exists
  - [ ] `privkey.pem` exists
- [ ] Test certificate: `openssl x509 -in ./nginx/ssl/fullchain.pem -text -noout`
- [ ] Renewal hook configured (script does this automatically)

### Option B: Self-Signed (Testing Only)

- [ ] Run: `./scripts/generate-self-signed-cert.sh`
- [ ] Verify certificates in `./nginx/ssl/`
- [ ] **Remember**: Browser warnings are expected

---

## ⚙️ Environment Configuration

- [ ] Copy template: `cp .env.production .env.prod`
- [ ] Generate JWT secret: `openssl rand -base64 64`
- [ ] Generate PostgreSQL password: `openssl rand -base64 32`
- [ ] Edit `.env.prod` and update:
  - [ ] `DOMAIN_NAME=your-domain.com`
  - [ ] `CORS_ALLOWED_ORIGINS=https://your-domain.com`
  - [ ] `POSTGRES_PASSWORD=<generated-password>`
  - [ ] `JWT_SECRET=<generated-secret>`
  - [ ] *(Optional)* Adjust `JAVA_OPTS` if low on memory
  - [ ] *(Optional)* Set `OLLAMA_ENABLED=false` if low on memory
- [ ] **Verify no default values remain**: `grep "CHANGE_ME" .env.prod`
- [ ] Save and protect file: `chmod 600 .env.prod`

---

## 🚀 Deployment

### Initial Deployment

- [ ] Navigate to project: `cd /path/to/MarklerApp`
- [ ] Pull latest code: `git pull` (if using git)
- [ ] Build and start services:
  ```bash
  docker compose --env-file .env.prod up --build -d
  ```
- [ ] **Wait for Ollama model download** (first run, ~15-20 minutes)
  - [ ] Monitor: `docker compose logs -f ollama`
- [ ] Verify all services running: `docker compose ps`
  - [ ] All show status: `Up (healthy)`

### Verify Deployment

- [ ] Check container health: `docker compose ps`
- [ ] Check resource usage: `docker stats`
  - [ ] Total memory < available RAM
  - [ ] No containers restarting
- [ ] Test HTTP redirect: `curl -I http://your-domain.com/`
  - [ ] Should return `301 Moved Permanently`
- [ ] Test HTTPS: `curl https://your-domain.com/health`
  - [ ] Should return `healthy`
- [ ] Test backend API: `curl https://your-domain.com/api/v1/actuator/health`
  - [ ] Should return `{"status":"UP"}`
- [ ] Verify SSL certificate:
  ```bash
  openssl s_client -connect your-domain.com:443 -servername your-domain.com < /dev/null
  ```
  - [ ] Shows valid certificate info
- [ ] Check security headers: `curl -I https://your-domain.com/`
  - [ ] `Strict-Transport-Security` present
  - [ ] `X-Frame-Options` present
  - [ ] `Content-Security-Policy` present

### Browser Testing

- [ ] Open `https://your-domain.com` in browser
- [ ] Application loads without console errors (F12)
- [ ] Can access login page
- [ ] Can switch language (DE/EN)
- [ ] HTTPS lock icon shows (for Let's Encrypt)

### Database Testing

- [ ] Connect to database:
  ```bash
  docker compose exec database psql -U crmuser realestate_crm
  ```
- [ ] List tables: `\dt`
- [ ] Check migrations: `SELECT * FROM flyway_schema_history;`
- [ ] Exit: `\q`

### Ollama AI Testing

- [ ] Check Ollama health:
  ```bash
  docker compose exec ollama curl -s http://localhost:11434/api/tags
  ```
- [ ] In application:
  - [ ] Create test client
  - [ ] Add call notes
  - [ ] Click "Generate AI Summary"
  - [ ] Verify summary generated (may take 10-30 seconds)

---

## 📊 Monitoring Setup

- [ ] Check logs for errors: `docker compose logs`
- [ ] Setup log monitoring:
  - [ ] Bookmark: `docker compose logs -f [service]`
- [ ] Monitor system resources:
  - [ ] CPU/Memory: `docker stats`
  - [ ] Disk space: `df -h`
  - [ ] Temperature: `vcgencmd measure_temp`
- [ ] Setup alerts (optional):
  - [ ] Email notifications for certificate renewal
  - [ ] Disk space monitoring
  - [ ] Service health checks

---

## 🔄 Backup Configuration

### Database Backups

- [ ] Create backup directory: `mkdir -p ~/backups`
- [ ] Test manual backup:
  ```bash
  docker compose exec database pg_dump -U crmuser realestate_crm | gzip > ~/backups/test_backup.sql.gz
  ```
- [ ] Create backup script: `~/backup_marklerapp.sh`
- [ ] Make executable: `chmod +x ~/backup_marklerapp.sh`
- [ ] Setup cron job: `crontab -e`
  - [ ] Add: `0 2 * * * /home/pi/backup_marklerapp.sh`
- [ ] Test restore procedure (use test backup)

### Volume Backups

- [ ] Note volumes:
  - [ ] `realestate_db_data` (database)
  - [ ] `realestate_uploads` (uploaded files)
  - [ ] `realestate_ollama_models` (Ollama models)
- [ ] Consider volume backup strategy
  - [ ] Option 1: Docker volume backup
  - [ ] Option 2: Filesystem-level backup

---

## 🔒 Security Hardening

### System Security

- [ ] Change default Pi password: `passwd`
- [ ] Setup SSH keys (disable password auth)
- [ ] Configure firewall:
  ```bash
  sudo ufw default deny incoming
  sudo ufw default allow outgoing
  sudo ufw allow ssh
  sudo ufw allow 80/tcp
  sudo ufw allow 443/tcp
  sudo ufw enable
  ```
- [ ] Enable automatic security updates:
  ```bash
  sudo apt-get install unattended-upgrades
  sudo dpkg-reconfigure --priority=low unattended-upgrades
  ```

### Application Security

- [ ] Verified JWT_SECRET changed from default
- [ ] Verified POSTGRES_PASSWORD changed from default
- [ ] `.env.prod` has restricted permissions (600)
- [ ] SSL certificates have proper permissions
  - [ ] `fullchain.pem`: 644
  - [ ] `privkey.pem`: 600
- [ ] Review nginx rate limiting in `nginx/nginx.conf`
- [ ] *(Optional)* Setup fail2ban for additional protection

---

## 📝 Documentation

- [ ] Document your setup:
  - [ ] Domain name
  - [ ] SSH access details
  - [ ] Backup locations
  - [ ] Custom configurations
- [ ] Share with team (if applicable):
  - [ ] Deployment procedure
  - [ ] Backup/restore procedure
  - [ ] Troubleshooting steps

---

## 🎯 Post-Deployment

### Week 1

- [ ] Monitor logs daily for errors
- [ ] Check resource usage (memory, CPU, disk)
- [ ] Verify backups running successfully
- [ ] Test all major features
- [ ] Monitor Raspberry Pi temperature

### Week 2

- [ ] Review and adjust resource limits if needed
- [ ] Test certificate auto-renewal (dry run):
  ```bash
  sudo certbot renew --dry-run
  ```
- [ ] Verify monitoring alerts working

### Monthly

- [ ] Review system logs
- [ ] Check disk space growth
- [ ] Update system packages:
  ```bash
  sudo apt-get update && sudo apt-get upgrade
  ```
- [ ] Review backup retention policy
- [ ] Test backup restore procedure

---

## ⚠️ Troubleshooting Quick Reference

### Services Not Starting
```bash
docker compose logs
docker compose down
docker compose --env-file .env.prod up --build -d
```

### Out of Memory
```bash
docker stats
free -h
# Disable Ollama: Edit .env.prod, set OLLAMA_ENABLED=false
```

### SSL Errors
```bash
ls -lh ./nginx/ssl/
docker compose logs nginx
# Regenerate certificates (see scripts/README.md)
```

### Database Connection Issues
```bash
docker compose ps database
docker compose logs database
docker compose restart database
```

### High Temperature
```bash
vcgencmd measure_temp
# Add cooling, reduce resource limits
```

---

## 📚 Resources

- **Detailed Docs**: `docs/PRODUCTION_DEPLOYMENT.md`
- **Quick Start**: `START_PRODUCTION.md`
- **Scripts Help**: `scripts/README.md`
- **Project Config**: `CLAUDE.md`

---

## ✅ Deployment Complete!

Once all items are checked:

1. Your MarklerApp is securely deployed with HTTPS
2. Automatic certificate renewal is configured
3. Database backups are scheduled
4. Monitoring is in place
5. System is hardened

**Access your application**: `https://your-domain.com`

---

**Last Updated**: 2026-02-06
**Version**: 1.0
