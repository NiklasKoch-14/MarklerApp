#!/bin/bash

# Script to generate self-signed SSL certificates for MarklerApp
# WARNING: Self-signed certificates will show browser warnings
# For production, use Let's Encrypt certificates instead (see docs/PRODUCTION_DEPLOYMENT.md)

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${YELLOW}║    MarklerApp - Self-Signed Certificate Generator          ║${NC}"
echo -e "${YELLOW}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${RED}⚠️  WARNING: Self-signed certificates are for testing only!${NC}"
echo -e "${RED}   Production deployments should use Let's Encrypt.${NC}"
echo ""

# Check if nginx/ssl directory exists
if [ ! -d "./nginx/ssl" ]; then
    echo -e "${RED}Error: nginx/ssl directory not found!${NC}"
    echo "Please run this script from the MarklerApp root directory."
    exit 1
fi

# Prompt for domain name
read -p "Enter your domain name (e.g., example.com or localhost): " DOMAIN_NAME

if [ -z "$DOMAIN_NAME" ]; then
    echo -e "${RED}Error: Domain name cannot be empty!${NC}"
    exit 1
fi

# Prompt for additional information (optional)
read -p "Country Code (2 letters, default: DE): " COUNTRY
COUNTRY=${COUNTRY:-DE}

read -p "State/Province (default: State): " STATE
STATE=${STATE:-State}

read -p "City (default: City): " CITY
CITY=${CITY:-City}

read -p "Organization (default: MarklerApp): " ORG
ORG=${ORG:-MarklerApp}

# Check if certificates already exist
if [ -f "./nginx/ssl/fullchain.pem" ] || [ -f "./nginx/ssl/privkey.pem" ]; then
    echo ""
    echo -e "${YELLOW}⚠️  Existing certificates found!${NC}"
    read -p "Overwrite existing certificates? (y/N): " OVERWRITE
    if [ "$OVERWRITE" != "y" ] && [ "$OVERWRITE" != "Y" ]; then
        echo "Aborted."
        exit 0
    fi
    rm -f ./nginx/ssl/fullchain.pem ./nginx/ssl/privkey.pem
fi

echo ""
echo -e "${GREEN}Generating self-signed certificate...${NC}"

# Generate self-signed certificate (valid for 365 days)
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout ./nginx/ssl/privkey.pem \
    -out ./nginx/ssl/fullchain.pem \
    -subj "/C=${COUNTRY}/ST=${STATE}/L=${CITY}/O=${ORG}/CN=${DOMAIN_NAME}"

# Set proper permissions
chmod 644 ./nginx/ssl/fullchain.pem
chmod 600 ./nginx/ssl/privkey.pem

echo ""
echo -e "${GREEN}✓ Certificate generated successfully!${NC}"
echo ""
echo "Certificate details:"
echo "  - Certificate: ./nginx/ssl/fullchain.pem"
echo "  - Private Key: ./nginx/ssl/privkey.pem"
echo "  - Domain: ${DOMAIN_NAME}"
echo "  - Valid for: 365 days"
echo ""

# Verify certificate
echo "Certificate information:"
openssl x509 -in ./nginx/ssl/fullchain.pem -text -noout | grep -E "Issuer|Subject|Not After"

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  Next Steps:                                                ║${NC}"
echo -e "${GREEN}╠════════════════════════════════════════════════════════════╣${NC}"
echo -e "${GREEN}║  1. Configure .env.prod with your domain and secrets       ║${NC}"
echo -e "${GREEN}║  2. Start services: docker compose --env-file .env.prod up ║${NC}"
echo -e "${GREEN}║  3. Access: https://${DOMAIN_NAME}${NC}"
echo -e "${GREEN}║                                                             ║${NC}"
echo -e "${GREEN}║  ${YELLOW}⚠️  Browser Warning: You'll see security warnings!${NC}      ${GREEN}║${NC}"
echo -e "${GREEN}║     This is normal for self-signed certificates.           ║${NC}"
echo -e "${GREEN}║     Click 'Advanced' → 'Proceed to site' to continue.      ║${NC}"
echo -e "${GREEN}║                                                             ║${NC}"
echo -e "${GREEN}║  ${YELLOW}For production, use Let's Encrypt instead:${NC}              ${GREEN}║${NC}"
echo -e "${GREEN}║     See docs/PRODUCTION_DEPLOYMENT.md                       ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
