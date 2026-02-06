#!/bin/bash

# Pre-deployment verification script for MarklerApp
# Checks that all requirements are met before deployment

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Counters
CHECKS_PASSED=0
CHECKS_FAILED=0
WARNINGS=0

echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║    MarklerApp - Pre-Deployment Verification                ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Function to check and report
check() {
    local name="$1"
    local command="$2"
    local expected="$3"
    local is_warning="${4:-false}"

    printf "%-50s" "[$name]"

    if eval "$command" &>/dev/null; then
        if [ "$is_warning" = "true" ]; then
            echo -e "${YELLOW}⚠ WARNING${NC}"
            ((WARNINGS++))
        else
            echo -e "${GREEN}✓ PASS${NC}"
            ((CHECKS_PASSED++))
        fi
        return 0
    else
        echo -e "${RED}✗ FAIL${NC}"
        if [ -n "$expected" ]; then
            echo "   Expected: $expected"
        fi
        ((CHECKS_FAILED++))
        return 1
    fi
}

# System checks
echo -e "${BLUE}System Requirements:${NC}"
check "Docker installed" "command -v docker" "Install: curl -fsSL https://get.docker.com | sh"
check "Docker Compose installed" "docker compose version" "Install: sudo apt-get install docker-compose-plugin"
check "Docker running" "docker ps" "Start: sudo systemctl start docker"
check "User in docker group" "docker ps" "Add user: sudo usermod -aG docker \$USER"
check "Git installed" "command -v git" "Install: sudo apt-get install git"
check "OpenSSL installed" "command -v openssl" "Install: sudo apt-get install openssl"
echo ""

# Memory check
echo -e "${BLUE}Hardware Resources:${NC}"
TOTAL_RAM=$(free -m | awk '/^Mem:/{print $2}')
if [ "$TOTAL_RAM" -lt 3800 ]; then
    check "RAM (4GB+ recommended)" "false" "Found ${TOTAL_RAM}MB, recommend 4GB+" true
else
    check "RAM (4GB+ recommended)" "true"
fi

DISK_FREE=$(df -BG . | awk 'NR==2 {print $4}' | sed 's/G//')
if [ "$DISK_FREE" -lt 10 ]; then
    check "Disk space (10GB+ free)" "false" "Found ${DISK_FREE}GB, recommend 10GB+" true
else
    check "Disk space (10GB+ free)" "true"
fi

# Check if on Raspberry Pi
if [ -f "/proc/device-tree/model" ]; then
    PI_MODEL=$(cat /proc/device-tree/model 2>/dev/null || echo "Unknown")
    echo "   Device: $PI_MODEL"
fi
echo ""

# File checks
echo -e "${BLUE}Required Files:${NC}"
check "docker-compose.yml exists" "test -f ./docker-compose.yml"
check "nginx/Dockerfile exists" "test -f ./nginx/Dockerfile"
check "nginx/nginx.conf exists" "test -f ./nginx/nginx.conf"
check "nginx/conf.d/default.conf exists" "test -f ./nginx/conf.d/default.conf"
check "nginx/conf.d/ssl.conf exists" "test -f ./nginx/conf.d/ssl.conf"
check "nginx/ssl directory exists" "test -d ./nginx/ssl"
check ".env.production template exists" "test -f ./.env.production"
echo ""

# SSL Certificate check
echo -e "${BLUE}SSL Certificates:${NC}"
if [ -f "./nginx/ssl/fullchain.pem" ] && [ -f "./nginx/ssl/privkey.pem" ]; then
    check "SSL certificates present" "true"

    # Check permissions
    FULLCHAIN_PERM=$(stat -c "%a" ./nginx/ssl/fullchain.pem 2>/dev/null || stat -f "%A" ./nginx/ssl/fullchain.pem 2>/dev/null)
    PRIVKEY_PERM=$(stat -c "%a" ./nginx/ssl/privkey.pem 2>/dev/null || stat -f "%A" ./nginx/ssl/privkey.pem 2>/dev/null)

    if [ "$FULLCHAIN_PERM" = "644" ]; then
        check "fullchain.pem permissions (644)" "true"
    else
        check "fullchain.pem permissions (644)" "false" "Found: $FULLCHAIN_PERM" true
    fi

    if [ "$PRIVKEY_PERM" = "600" ]; then
        check "privkey.pem permissions (600)" "true"
    else
        check "privkey.pem permissions (600)" "false" "Found: $PRIVKEY_PERM" true
    fi

    # Check certificate validity
    if openssl x509 -in ./nginx/ssl/fullchain.pem -noout -checkend 0 &>/dev/null; then
        check "Certificate not expired" "true"
    else
        check "Certificate not expired" "false" "Certificate has expired!" false
    fi
else
    check "SSL certificates present" "false" "Run: ./scripts/setup-letsencrypt.sh or ./scripts/generate-self-signed-cert.sh" false
fi
echo ""

# Environment configuration check
echo -e "${BLUE}Environment Configuration:${NC}"
if [ -f "./.env.prod" ]; then
    check ".env.prod exists" "true"

    # Check for default values
    if grep -q "CHANGE_ME" .env.prod; then
        check "No default secrets in .env.prod" "false" "Found CHANGE_ME values" false
    else
        check "No default secrets in .env.prod" "true"
    fi

    # Check for required values
    if grep -q "DOMAIN_NAME=" .env.prod && ! grep -q "DOMAIN_NAME=your-domain.com" .env.prod; then
        check "DOMAIN_NAME configured" "true"
    else
        check "DOMAIN_NAME configured" "false" "Update DOMAIN_NAME in .env.prod" false
    fi

    if grep -q "JWT_SECRET=" .env.prod && [ "$(grep JWT_SECRET= .env.prod | cut -d= -f2 | wc -c)" -gt 50 ]; then
        check "JWT_SECRET configured" "true"
    else
        check "JWT_SECRET configured" "false" "Generate: openssl rand -base64 64" false
    fi

    if grep -q "POSTGRES_PASSWORD=" .env.prod && ! grep -q "POSTGRES_PASSWORD=devpassword" .env.prod; then
        check "POSTGRES_PASSWORD configured" "true"
    else
        check "POSTGRES_PASSWORD configured" "false" "Generate: openssl rand -base64 32" false
    fi
else
    check ".env.prod exists" "false" "Copy: cp .env.production .env.prod" false
fi
echo ""

# Network checks
echo -e "${BLUE}Network Configuration:${NC}"

# Check if port 80 is free
if lsof -Pi :80 -sTCP:LISTEN -t >/dev/null 2>&1; then
    PORT_80_PROC=$(lsof -Pi :80 -sTCP:LISTEN -t | head -1)
    check "Port 80 available" "false" "Port in use by PID $PORT_80_PROC (stop for deployment)" true
else
    check "Port 80 available" "true"
fi

# Check if port 443 is free
if lsof -Pi :443 -sTCP:LISTEN -t >/dev/null 2>&1; then
    PORT_443_PROC=$(lsof -Pi :443 -sTCP:LISTEN -t | head -1)
    check "Port 443 available" "false" "Port in use by PID $PORT_443_PROC (stop for deployment)" true
else
    check "Port 443 available" "true"
fi

# Check internet connectivity
check "Internet connectivity" "ping -c 1 8.8.8.8 &>/dev/null"

echo ""

# Docker Compose validation
echo -e "${BLUE}Docker Configuration:${NC}"
if [ -f "./.env.prod" ]; then
    check "docker-compose.yml valid" "docker compose --env-file .env.prod config &>/dev/null"
else
    check "docker-compose.yml valid" "docker compose config &>/dev/null"
fi
echo ""

# Summary
echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  Verification Summary                                       ║${NC}"
echo -e "${GREEN}╠════════════════════════════════════════════════════════════╣${NC}"
printf "${GREEN}║  ${NC}%-30s %28s${GREEN}║${NC}\n" "Checks Passed:" "${GREEN}$CHECKS_PASSED${NC}"
printf "${GREEN}║  ${NC}%-30s %28s${GREEN}║${NC}\n" "Checks Failed:" "${RED}$CHECKS_FAILED${NC}"
printf "${GREEN}║  ${NC}%-30s %28s${GREEN}║${NC}\n" "Warnings:" "${YELLOW}$WARNINGS${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

if [ $CHECKS_FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All checks passed! You're ready to deploy.${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. Review your .env.prod configuration"
    echo "  2. Deploy: docker compose --env-file .env.prod up --build -d"
    echo "  3. Monitor logs: docker compose logs -f"
    echo ""
    echo "For detailed deployment guide, see: docs/PRODUCTION_DEPLOYMENT.md"
    exit 0
else
    echo -e "${RED}✗ Some checks failed. Please fix the issues above before deploying.${NC}"
    echo ""
    if [ $WARNINGS -gt 0 ]; then
        echo -e "${YELLOW}⚠ You also have $WARNINGS warning(s) to review.${NC}"
        echo ""
    fi
    echo "For help, see:"
    echo "  - docs/PRODUCTION_DEPLOYMENT.md (complete guide)"
    echo "  - START_PRODUCTION.md (quick start)"
    echo "  - DEPLOYMENT_CHECKLIST.md (step-by-step)"
    exit 1
fi
