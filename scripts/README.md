# MarklerApp Deployment Scripts

This directory contains helper scripts for production deployment and SSL certificate management.

## Available Scripts

### 1. `verify-deployment.sh` - Pre-Deployment Verification

**Run this before deploying to check all requirements**

Automatically verifies that your system is ready for production deployment.

**Usage:**

```bash
cd MarklerApp
./scripts/verify-deployment.sh
```

**What it checks:**
- Docker and Docker Compose installed and running
- Required RAM (4GB+) and disk space (10GB+)
- All necessary files present (docker-compose.yml, nginx configs, etc.)
- SSL certificates exist and have correct permissions
- Environment configuration (.env.prod) is set up correctly
- No default/placeholder values in secrets
- Ports 80 and 443 are available
- docker-compose.yml syntax is valid

**Exit codes:**
- `0` - All checks passed, ready to deploy
- `1` - Some checks failed, review output

**Example output:**
```
[Docker installed]                                  ✓ PASS
[Docker Compose installed]                          ✓ PASS
[SSL certificates present]                          ✓ PASS
[JWT_SECRET configured]                             ✗ FAIL
```

---

### 2. `setup-letsencrypt.sh` - Let's Encrypt Certificate Setup

**Recommended for production deployments**

Automatically generates and configures Let's Encrypt SSL certificates with automatic renewal.

**Usage:**

```bash
cd MarklerApp
sudo ./scripts/setup-letsencrypt.sh
```

**What it does:**
- Installs certbot if not present
- Generates Let's Encrypt certificates for your domain
- Copies certificates to `nginx/ssl/` directory
- Sets up automatic renewal hooks
- Tests renewal configuration

**Requirements:**
- Domain name pointing to your server
- Port 80 accessible from internet
- Run as root (sudo)

**Follow-up:**
After running this script, configure `.env.prod` and start services:
```bash
cp .env.production .env.prod
nano .env.prod  # Update DOMAIN_NAME, JWT_SECRET, etc.
docker compose --env-file .env.prod up --build -d
```

---

### 3. `generate-self-signed-cert.sh` - Self-Signed Certificate Generator

**For testing and development only**

Generates self-signed SSL certificates that work locally but show browser warnings.

**Usage:**

```bash
cd MarklerApp
./scripts/generate-self-signed-cert.sh
```

**What it does:**
- Generates a self-signed certificate valid for 365 days
- Saves to `nginx/ssl/` directory
- Sets proper file permissions

**When to use:**
- Local testing with HTTPS
- Development environment
- Internal networks without public domain

**⚠️ Warning:**
Self-signed certificates will show "Your connection is not private" warnings in browsers. This is normal. For production, always use Let's Encrypt.

---

## Certificate Files

Both scripts create these files in `nginx/ssl/`:

- `fullchain.pem` - SSL certificate (and intermediate chain for Let's Encrypt)
- `privkey.pem` - Private key

**Important:** These files are in `.gitignore` and should NEVER be committed to version control.

---

## SSL Certificate Comparison

| Feature | Let's Encrypt | Self-Signed |
|---------|---------------|-------------|
| **Browser Trust** | ✅ Trusted | ❌ Warning shown |
| **Cost** | Free | Free |
| **Validity** | 90 days (auto-renews) | 365 days (manual renewal) |
| **Use Case** | Production | Testing/Internal |
| **Setup** | Requires domain | No domain needed |
| **Port 80** | Required for validation | Not required |

---

## Troubleshooting

### Let's Encrypt Script Issues

**"Port 80 is in use"**
```bash
# Stop Docker services first
docker compose down
# Then run the script
sudo ./scripts/setup-letsencrypt.sh
```

**"Domain validation failed"**
- Ensure your domain's A record points to your server's public IP
- Check firewall allows port 80 (HTTP) from internet
- Verify router port forwarding: External 80 → Server IP:80

**"Permission denied"**
```bash
# Script must be run as root
sudo ./scripts/setup-letsencrypt.sh
```

### Self-Signed Certificate Issues

**"nginx/ssl directory not found"**
```bash
# Run from MarklerApp root directory
cd /path/to/MarklerApp
./scripts/generate-self-signed-cert.sh
```

**"Browser shows warning"**
This is expected with self-signed certificates. In Chrome/Edge:
1. Click "Advanced"
2. Click "Proceed to [domain] (unsafe)"

---

## Certificate Renewal

### Let's Encrypt (Automatic)
- Certbot checks for renewal twice daily
- Certificates auto-renew 30 days before expiry
- Renewal hook copies new certs and reloads nginx
- **Manual renewal**: `sudo certbot renew`

### Self-Signed (Manual)
- Valid for 365 days
- No automatic renewal
- Re-run script to generate new certificate

---

## Advanced Usage

### Generate DH Parameters (Optional)

For additional security (forward secrecy):

```bash
cd MarklerApp
openssl dhparam -out ./nginx/ssl/dhparam.pem 2048
```

Then uncomment the dhparam line in `nginx/conf.d/ssl.conf`.

**Note:** This takes 10-15 minutes on Raspberry Pi.

### Multiple Domains (Let's Encrypt)

```bash
sudo ./scripts/setup-letsencrypt.sh
# When prompted for domains, enter multiple:
# example.com www.example.com api.example.com
```

### Custom Certificate Authority

If you have your own CA certificate:

```bash
# Copy your certificate and key
cp /path/to/certificate.pem ./nginx/ssl/fullchain.pem
cp /path/to/private-key.pem ./nginx/ssl/privkey.pem

# Set permissions
chmod 644 ./nginx/ssl/fullchain.pem
chmod 600 ./nginx/ssl/privkey.pem
```

---

## Security Best Practices

1. ✅ **Use Let's Encrypt for production** (trusted by all browsers)
2. ✅ **Never commit certificates** to version control
3. ✅ **Keep private key secure** (600 permissions, root-only access)
4. ✅ **Enable automatic renewal** for Let's Encrypt
5. ✅ **Monitor certificate expiry** (certbot emails renewal status)
6. ✅ **Use strong cipher suites** (already configured in nginx/conf.d/ssl.conf)

---

## Support

For detailed deployment instructions:
- See `docs/PRODUCTION_DEPLOYMENT.md`
- See `START_PRODUCTION.md` for quick reference

For issues:
- Check script output for error messages
- Review nginx logs: `docker compose logs nginx`
- Verify certificate: `openssl x509 -in ./nginx/ssl/fullchain.pem -text -noout`
