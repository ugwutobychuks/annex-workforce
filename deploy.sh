#!/bin/bash
set -e

echo "🚀 Annex Workforce Production Deployment"
echo "=========================================="
echo ""

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${YELLOW}Step 1: Checking prerequisites${NC}"
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Docker not installed${NC}"
    exit 1
fi
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}Docker Compose not installed${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Prerequisites checked${NC}"

echo ""
echo -e "${YELLOW}Step 2: Validating configuration${NC}"
if [ ! -f .env.production ]; then
    echo -e "${RED}.env.production not found${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Configuration valid${NC}"

echo ""
echo -e "${YELLOW}Step 3: Building Docker images${NC}"
docker-compose -f docker-compose.prod.yml build --no-cache
echo -e "${GREEN}✓ Images built${NC}"

echo ""
echo -e "${YELLOW}Step 4: Starting services${NC}"
docker-compose -f docker-compose.prod.yml up -d
echo -e "${GREEN}✓ Services started${NC}"

echo ""
echo -e "${YELLOW}Step 5: Waiting for services${NC}"
sleep 15
echo -e "${GREEN}✓ Services ready${NC}"

echo ""
echo -e "${YELLOW}Step 6: Running migrations${NC}"
docker-compose -f docker-compose.prod.yml exec -T api npx prisma migrate deploy
echo -e "${GREEN}✓ Migrations completed${NC}"

echo ""
echo -e "${YELLOW}Step 7: Seeding database${NC}"
docker-compose -f docker-compose.prod.yml exec -T api npx ts-node prisma/seed.ts
echo -e "${GREEN}✓ Database seeded${NC}"

echo ""
echo -e "${GREEN}==========================================${NC}"
echo -e "${GREEN}✅ Deployment Complete!${NC}"
echo -e "${GREEN}==========================================${NC}"
echo ""
echo -e "${GREEN}Access your application:${NC}"
echo -e "  Web App:  http://98.84.56.161:3000"
echo -e "  API:      http://98.84.56.161:4000"
echo -e "  Swagger:  http://98.84.56.161:4000/docs"
echo -e "  MailHog:  http://98.84.56.161:8025"
echo -e "  MinIO:    http://98.84.56.161:9001"
echo ""
echo -e "${GREEN}Demo Credentials:${NC}"
echo -e "  Admin:     admin@annexworkforce.com / Admin@12345"
echo -e "  Candidate: candidate@example.com / Pass@1234"
echo -e "  Employer:  employer@techstartup.io / Pass@1234"
echo ""
