#!/bin/bash

# Script to setup Let's Encrypt SSL certificates for MarklerApp
# Recommended for production deployments

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║    MarklerApp - Let's Encrypt Certificate Setup            ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Error: This script must be run as root (use sudo)${NC}"
    exit 1
fi

# Check if nginx/ssl directory exists
if [ ! -d "./nginx/ssl" ]; then
    echo -e "${RED}Error: nginx/ssl directory not found!${NC}"
    echo "Please run this script from the MarklerApp root directory."
    exit 1
fi

# Check if certbot is installed
if ! command -v certbot &> /dev/null; then
    echo -e "${YELLOW}Certbot is not installed. Installing...${NC}"
    apt-get update
    apt-get install -y certbot
    echo -e "${GREEN}✓ Certbot installed${NC}"
fi

# Prompt for domain name
echo -e "${BLUE}Enter your domain name(s):${NC}"
echo "  - Single domain: example.com"
echo "  - Multiple domains: example.com www.example.com"
echo ""
read -p "Domain(s): " DOMAINS

if [ -z "$DOMAINS" ]; then
    echo -e "${RED}Error: Domain name cannot be empty!${NC}"
    exit 1
fi

# Build certbot command with all domains
CERTBOT_CMD="certbot certonly --standalone"
for DOMAIN in $DOMAINS; do
    CERTBOT_CMD="$CERTBOT_CMD -d $DOMAIN"
done

# Prompt for email
read -p "Email address (for renewal notifications): " EMAIL

if [ -z "$EMAIL" ]; then
    echo -e "${YELLOW}Warning: No email provided. You won't receive renewal notifications.${NC}"
    CERTBOT_CMD="$CERTBOT_CMD --register-unsafely-without-email"
else
    CERTBOT_CMD="$CERTBOT_CMD --email $EMAIL"
fi

# Add agree-tos flag
CERTBOT_CMD="$CERTBOT_CMD --agree-tos"

# Check if port 80 is in use
if lsof -Pi :80 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo ""
    echo -e "${YELLOW}⚠️  Port 80 is currently in use!${NC}"
    echo "Certbot needs port 80 to verify domain ownership."
    echo ""
    read -p "Stop Docker services to free port 80? (y/N): " STOP_DOCKER
    if [ "$STOP_DOCKER" == "y" ] || [ "$STOP_DOCKER" == "Y" ]; then
        echo "Stopping Docker services..."
        docker compose down 2>/dev/null || true
        sleep 2
    else
        echo -e "${RED}Error: Port 80 must be available for certificate generation.${NC}"
        echo "Please stop services using port 80 and try again."
        exit 1
    fi
fi

# Run certbot
echo ""
echo -e "${GREEN}Generating Let's Encrypt certificate...${NC}"
echo "Command: $CERTBOT_CMD"
echo ""

eval $CERTBOT_CMD

if [ $? -ne 0 ]; then
    echo -e "${RED}Error: Certificate generation failed!${NC}"
    echo ""
    echo "Common issues:"
    echo "  1. Domain not pointing to this server's IP"
    echo "  2. Port 80 not accessible from internet (check firewall/router)"
    echo "  3. Invalid domain name"
    exit 1
fi

# Get primary domain (first one specified)
PRIMARY_DOMAIN=$(echo $DOMAINS | awk '{print $1}')

# Copy certificates to nginx/ssl directory
echo ""
echo -e "${GREEN}Copying certificates to nginx/ssl/...${NC}"

cp /etc/letsencrypt/live/$PRIMARY_DOMAIN/fullchain.pem ./nginx/ssl/
cp /etc/letsencrypt/live/$PRIMARY_DOMAIN/privkey.pem ./nginx/ssl/

# Get current user (the one who invoked sudo)
CURRENT_USER=${SUDO_USER:-$USER}

# Set proper permissions
chown $CURRENT_USER:$CURRENT_USER ./nginx/ssl/*.pem
chmod 644 ./nginx/ssl/fullchain.pem
chmod 600 ./nginx/ssl/privkey.pem

echo -e "${GREEN}✓ Certificates copied successfully${NC}"

# Setup automatic renewal hook
echo ""
echo -e "${GREEN}Setting up automatic certificate renewal...${NC}"

HOOK_SCRIPT="/etc/letsencrypt/renewal-hooks/deploy/marklerapp-copy.sh"
PROJECT_DIR=$(pwd)

cat > $HOOK_SCRIPT << EOF
#!/bin/bash
# MarklerApp certificate renewal hook
# Copies renewed certificates to Docker project and reloads nginx

DOMAIN="$PRIMARY_DOMAIN"
PROJECT_DIR="$PROJECT_DIR"

echo "Copying renewed certificates to MarklerApp..."
cp /etc/letsencrypt/live/\$DOMAIN/fullchain.pem \$PROJECT_DIR/nginx/ssl/
cp /etc/letsencrypt/live/\$DOMAIN/privkey.pem \$PROJECT_DIR/nginx/ssl/
chown $CURRENT_USER:$CURRENT_USER \$PROJECT_DIR/nginx/ssl/*.pem
chmod 644 \$PROJECT_DIR/nginx/ssl/fullchain.pem
chmod 600 \$PROJECT_DIR/nginx/ssl/privkey.pem

echo "Reloading nginx container..."
cd \$PROJECT_DIR
docker compose exec nginx nginx -s reload 2>/dev/null || echo "Nginx not running, will use new certs on next start"

echo "Certificate renewal complete!"
EOF

chmod +x $HOOK_SCRIPT

echo -e "${GREEN}✓ Renewal hook created at: $HOOK_SCRIPT${NC}"

# Test renewal (dry run)
echo ""
echo -e "${BLUE}Testing automatic renewal (dry run)...${NC}"
certbot renew --dry-run

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Renewal test passed!${NC}"
else
    echo -e "${YELLOW}⚠️  Renewal test failed, but certificates are still valid.${NC}"
fi

# Show certificate info
echo ""
echo -e "${GREEN}Certificate Information:${NC}"
certbot certificates -d $PRIMARY_DOMAIN

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  ✓ Let's Encrypt certificates successfully generated!      ║${NC}"
echo -e "${GREEN}╠════════════════════════════════════════════════════════════╣${NC}"
echo -e "${GREEN}║  Certificate Details:                                       ║${NC}"
echo -e "${GREEN}║    - Domain(s): $PRIMARY_DOMAIN${NC}"
echo -e "${GREEN}║    - Valid for: 90 days                                     ║${NC}"
echo -e "${GREEN}║    - Auto-renewal: Configured ✓                             ║${NC}"
echo -e "${GREEN}║    - Location: ./nginx/ssl/                                 ║${NC}"
echo -e "${GREEN}║                                                             ║${NC}"
echo -e "${GREEN}║  Next Steps:                                                ║${NC}"
echo -e "${GREEN}║    1. Configure .env.prod with your domain and secrets     ║${NC}"
echo -e "${GREEN}║    2. Start services:                                       ║${NC}"
echo -e "${GREEN}║       docker compose --env-file .env.prod up --build -d    ║${NC}"
echo -e "${GREEN}║    3. Access: https://$PRIMARY_DOMAIN${NC}"
echo -e "${GREEN}║                                                             ║${NC}"
echo -e "${GREEN}║  Certificate Renewal:                                       ║${NC}"
echo -e "${GREEN}║    - Certbot checks for renewal twice daily (automatic)    ║${NC}"
echo -e "${GREEN}║    - Certificates renew 30 days before expiry              ║${NC}"
echo -e "${GREEN}║    - Manual renewal: sudo certbot renew                    ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Ask if user wants to start Docker services now
read -p "Start Docker services now? (y/N): " START_DOCKER
if [ "$START_DOCKER" == "y" ] || [ "$START_DOCKER" == "Y" ]; then
    if [ -f ".env.prod" ]; then
        echo "Starting services..."
        su - $CURRENT_USER -c "cd $PROJECT_DIR && docker compose --env-file .env.prod up --build -d"
    else
        echo -e "${YELLOW}⚠️  .env.prod not found. Please configure it first.${NC}"
        echo "Copy .env.production to .env.prod and update the values."
    fi
fi

echo ""
echo -e "${GREEN}Setup complete! ✓${NC}"
