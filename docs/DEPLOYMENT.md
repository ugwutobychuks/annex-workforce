# Deployment Guide

This document covers running Annex Workforce in three modes: **local development**, **single-VM staging**, and **production on AWS**.

---

## Table of contents

1. [Prerequisites](#1-prerequisites)
2. [Local development](#2-local-development)
3. [Environment variables reference](#3-environment-variables-reference)
4. [Database management](#4-database-management)
5. [Single-VM staging deployment](#5-single-vm-staging-deployment)
6. [Production on AWS](#6-production-on-aws)
7. [Third-party integrations](#7-third-party-integrations)
8. [Operational runbook](#8-operational-runbook)
9. [Troubleshooting](#9-troubleshooting)

---

## 1. Prerequisites

| Tool | Version | Why |
|------|---------|-----|
| Node.js | 20+ | Both API and web run on Node 20 |
| npm | 10+ | Workspaces support |
| Docker | 24+ | Local infrastructure containers |
| Docker Compose | v2 | Bundled with Docker Desktop |
| PostgreSQL client | 16 (optional) | Manual DB inspection |

For production AWS deploys you'll additionally need an AWS account with permission to create RDS, ElastiCache, S3 buckets, ECR repositories, and either ECS or EKS clusters.

---

## 2. Local development

### One-shot setup

From the repo root:

```bash
cp .env.example .env
npm run setup    # installs deps, starts containers, runs migrations, seeds DB
npm run dev      # starts API on :4000 and web on :3000
```

### Step-by-step (if `setup` fails)

```bash
# Install dependencies for both apps
npm install

# Start infrastructure (postgres, redis, elasticsearch, minio, mailhog)
docker compose up -d

# Wait for containers to become healthy (~10 seconds)
docker compose ps

# Generate Prisma client + run migrations
cd apps/api
npx prisma generate
npx prisma migrate deploy   # uses migrations/ if present
# OR for first-run, create the initial migration:
npx prisma migrate dev --name init

# Seed demo data (admin, candidate, employer, sample job, 16 skills)
npx ts-node prisma/seed.ts

cd ../..
npm run dev
```

### Verifying the install

| Check | Expected result |
|-------|-----------------|
| `curl http://localhost:4000/health` | `{"status":"ok","info":{"database":{"status":"up"}}}` |
| Open http://localhost:4000/docs | Swagger UI with all endpoints listed |
| Open http://localhost:3000 | Annex Workforce landing page |
| Sign in with `candidate@example.com` / `Pass@1234` | Redirects to `/dashboard` |
| Sign in with `employer@techstartup.io` / `Pass@1234` | Redirects to `/employer/dashboard` |
| Open http://localhost:8025 | MailHog web UI shows verification emails |

### Stopping local infra

```bash
npm run infra:down                    # stops containers, keeps data
docker compose down -v                # stops AND wipes volumes (full reset)
```

---

## 3. Environment variables reference

All variables live in `.env` (copy from `.env.example`). The API loads them via `@nestjs/config` and the web app via Next.js's `NEXT_PUBLIC_*` convention.

### Database

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | Postgres connection string | `postgresql://annex:annexpass@localhost:5432/annex` |
| `POSTGRES_USER` | Used by docker-compose | `annex` |
| `POSTGRES_PASSWORD` | Used by docker-compose | `annexpass` |
| `POSTGRES_DB` | Used by docker-compose | `annex` |

### Redis

| Variable | Description |
|----------|-------------|
| `REDIS_URL` | Full URL with auth (`redis://:password@host:6379`) |
| `REDIS_PASSWORD` | Used by docker-compose only |

### Elasticsearch

| Variable | Description |
|----------|-------------|
| `ELASTICSEARCH_URL` | `http://localhost:9200` locally; the API auto-creates indices on boot |

### Object storage (S3 / MinIO)

| Variable | Description |
|----------|-------------|
| `S3_ENDPOINT` | `http://localhost:9000` for MinIO; omit or leave blank for AWS S3 |
| `S3_REGION` | `us-east-1` for MinIO; your real region for AWS |
| `S3_ACCESS_KEY` | MinIO root user, or AWS access key |
| `S3_SECRET_KEY` | MinIO root password, or AWS secret |
| `S3_BUCKET` | Default `annex-documents` |
| `S3_FORCE_PATH_STYLE` | `true` for MinIO, `false` for AWS S3 |

### JWT

| Variable | Description |
|----------|-------------|
| `JWT_SECRET` | Sign access tokens. **Generate a fresh 32+ char value for each environment.** |
| `JWT_REFRESH_SECRET` | Sign refresh tokens. Must differ from `JWT_SECRET`. |
| `JWT_ACCESS_TTL` | Default `15m` |
| `JWT_REFRESH_TTL` | Default `7d` |

Generate secrets with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### API + Web

| Variable | Description |
|----------|-------------|
| `API_PORT` | Default `4000` |
| `API_HOST` | Default `0.0.0.0` |
| `NODE_ENV` | `development` / `production` |
| `ALLOWED_ORIGINS` | Comma-separated frontend origins, e.g. `https://app.annexworkforce.com` |
| `NEXT_PUBLIC_API_URL` | Public API URL the browser will hit, e.g. `https://api.annexworkforce.com` |
| `NEXT_PUBLIC_APP_NAME` | Display name |

### Third-party (optional in dev, required in prod)

| Variable | Used by | Why it's needed |
|----------|---------|-----------------|
| `SENDGRID_API_KEY` | Email | Replace MailHog for transactional email |
| `SENDGRID_FROM_EMAIL` | Email | The "From" address |
| `TWILIO_*` | SMS (stub for now) | Phone OTP, future feature |
| `PAYSTACK_SECRET_KEY` | Payments | Bulk salary disbursement |
| `STRIPE_SECRET_KEY` | Payments | International EOR fees |
| `SMILE_IDENTITY_*` | Verification | NIN/BVN identity checks |
| `YOUVERIFY_API_KEY` | Verification | Employment / education checks |
| `DOCUSIGN_*` | EOR contracts | E-signature on contracts |

The platform runs without these — verification falls back to manual approval, payroll is computed but not actually disbursed, contracts can still be created and tracked.

---

## 4. Database management

### Migrations

Schema lives in `apps/api/prisma/schema.prisma`. To create a new migration after editing the schema:

```bash
cd apps/api
npx prisma migrate dev --name describe_your_change
```

In production, run **`prisma migrate deploy`** (not `migrate dev`):

```bash
cd apps/api
DATABASE_URL=postgresql://prod-user:...@prod-host:5432/annex npx prisma migrate deploy
```

### Seeding

The seed script (`apps/api/prisma/seed.ts`) is **idempotent** — it uses `upsert` for users, skills, and the demo job. Safe to re-run; produces no duplicates.

To seed in production with real data, write your own script or use Prisma Studio:

```bash
cd apps/api
npx prisma studio   # opens GUI at localhost:5555
```

### Backups

For production Postgres (RDS or self-hosted):

```bash
# Full dump
pg_dump $DATABASE_URL --format=custom --file=annex-$(date +%F).dump

# Restore
pg_restore --dbname=$DATABASE_URL --clean annex-YYYY-MM-DD.dump
```

RDS automated daily backups + 7-day point-in-time recovery is recommended for production.

### Resetting local data

```bash
cd apps/api
npx prisma migrate reset --force   # drops all tables, re-runs migrations + seed
```

---

## 5. Single-VM staging deployment

For a quick staging environment on a single VPS (DigitalOcean droplet, AWS EC2, Hetzner, etc.).

**Requirements:** Ubuntu 22.04+, 2 vCPU / 4 GB RAM minimum, Docker, Docker Compose, a domain name pointing to the VM.

### Setup

```bash
# On the VM
git clone <your-fork-or-tarball-extract> /opt/annex
cd /opt/annex

# Production env file
cp .env.example .env.prod
nano .env.prod   # see below for required edits

# Build production images
docker build -t annex-api:latest -f apps/api/Dockerfile apps/api
docker build -t annex-web:latest \
  --build-arg NEXT_PUBLIC_API_URL=https://api.your-domain.com \
  -f apps/web/Dockerfile apps/web

# Start infrastructure
docker compose up -d postgres redis elasticsearch minio

# Run migrations once
docker run --rm --network annex-workforce_default \
  --env-file .env.prod \
  annex-api:latest \
  sh -c "npx prisma migrate deploy && npx ts-node prisma/seed.ts"

# Run the apps
docker run -d --name annex-api --network annex-workforce_default \
  --env-file .env.prod -p 4000:4000 --restart unless-stopped \
  annex-api:latest

docker run -d --name annex-web --network annex-workforce_default \
  -e NEXT_PUBLIC_API_URL=https://api.your-domain.com \
  -p 3000:3000 --restart unless-stopped \
  annex-web:latest
```

### Required `.env.prod` edits

```bash
NODE_ENV=production
DATABASE_URL=postgresql://annex:STRONG_PASSWORD@postgres:5432/annex
POSTGRES_PASSWORD=STRONG_PASSWORD
REDIS_URL=redis://:STRONG_REDIS_PASSWORD@redis:6379
REDIS_PASSWORD=STRONG_REDIS_PASSWORD
JWT_SECRET=<64-char hex>
JWT_REFRESH_SECRET=<different 64-char hex>
ALLOWED_ORIGINS=https://app.your-domain.com
NEXT_PUBLIC_API_URL=https://api.your-domain.com
SENDGRID_API_KEY=SG.xxx
SENDGRID_FROM_EMAIL=noreply@your-domain.com
```

### Reverse proxy with Caddy

Caddy is the simplest way to terminate TLS in front of the apps. Install Caddy and create `/etc/caddy/Caddyfile`:

```
api.your-domain.com {
    reverse_proxy localhost:4000
}

app.your-domain.com {
    reverse_proxy localhost:3000
}
```

Then:

```bash
sudo systemctl reload caddy
```

Caddy will automatically obtain Let's Encrypt certificates.

---

## 6. Production on AWS

For real production. Recommended path: **AWS ECS Fargate** for the apps, **RDS PostgreSQL** for the database, **ElastiCache Redis**, **Amazon OpenSearch** (managed Elasticsearch), and **S3** for storage.

### High-level architecture

```
              ┌─────────────────────────┐
   Browser →  │  CloudFront + Route 53  │
              └─────────────┬───────────┘
                            │
                   ┌────────┴─────────┐
                   │  ALB (HTTPS)     │
                   └───┬──────────┬───┘
                       │          │
              ┌────────┴───┐  ┌───┴────────┐
              │ ECS: web   │  │ ECS: api   │
              │ (Next.js)  │  │ (NestJS)   │
              └────────────┘  └─┬──┬───┬──┘
                                │  │   │
        ┌───────────────────────┘  │   └──────────────┐
        │                  ┌───────┘                  │
   ┌────┴────┐      ┌──────┴──────┐         ┌─────────┴────────┐
   │  RDS    │      │ ElastiCache │         │  Amazon          │
   │ Postgres│      │  Redis      │         │  OpenSearch      │
   └─────────┘      └─────────────┘         └──────────────────┘
                                                     │
                                            ┌────────┴─────────┐
                                            │   S3 (uploads)   │
                                            └──────────────────┘
```

### Step 1: Provision infrastructure

You can do this through the AWS console initially, or use Terraform. Required resources:

- **VPC** with two private subnets (database tier) and two public subnets (load balancer)
- **RDS PostgreSQL 16**: `db.t4g.small` to start, encrypted, daily backups, in private subnets
- **ElastiCache Redis 7**: `cache.t4g.micro` to start, single-AZ for staging, multi-AZ for prod
- **Amazon OpenSearch**: `t3.small.search`, single node for staging, 3-node cluster for prod
- **S3 bucket**: `annex-documents-prod`, block public access, server-side encryption
- **ECR repositories**: `annex/api` and `annex/web`
- **Secrets Manager** entries for `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `S3_*`, `SENDGRID_API_KEY`

### Step 2: Build and push images

```bash
# Authenticate Docker to ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin <ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com

# API
docker build -t annex/api:$(git rev-parse --short HEAD) -f apps/api/Dockerfile apps/api
docker tag annex/api:$(git rev-parse --short HEAD) <ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/annex/api:latest
docker push <ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/annex/api:latest

# Web (note the build arg — baked into the image)
docker build \
  --build-arg NEXT_PUBLIC_API_URL=https://api.annexworkforce.com \
  -t annex/web:$(git rev-parse --short HEAD) -f apps/web/Dockerfile apps/web
docker tag annex/web:$(git rev-parse --short HEAD) <ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/annex/web:latest
docker push <ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/annex/web:latest
```

### Step 3: ECS task definitions

Create two ECS Fargate services (sample task def for the API):

```json
{
  "family": "annex-api",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "executionRoleArn": "arn:aws:iam::ACCOUNT:role/ecsTaskExecutionRole",
  "taskRoleArn": "arn:aws:iam::ACCOUNT:role/annex-api-task-role",
  "containerDefinitions": [{
    "name": "api",
    "image": "ACCOUNT.dkr.ecr.us-east-1.amazonaws.com/annex/api:latest",
    "portMappings": [{ "containerPort": 4000 }],
    "essential": true,
    "environment": [
      { "name": "NODE_ENV", "value": "production" },
      { "name": "API_PORT", "value": "4000" },
      { "name": "ALLOWED_ORIGINS", "value": "https://app.annexworkforce.com" },
      { "name": "ELASTICSEARCH_URL", "value": "https://search-...es.amazonaws.com" },
      { "name": "S3_BUCKET", "value": "annex-documents-prod" },
      { "name": "S3_REGION", "value": "us-east-1" }
    ],
    "secrets": [
      { "name": "DATABASE_URL", "valueFrom": "arn:aws:secretsmanager:...:DATABASE_URL" },
      { "name": "REDIS_URL", "valueFrom": "arn:aws:secretsmanager:...:REDIS_URL" },
      { "name": "JWT_SECRET", "valueFrom": "arn:aws:secretsmanager:...:JWT_SECRET" },
      { "name": "JWT_REFRESH_SECRET", "valueFrom": "arn:aws:secretsmanager:...:JWT_REFRESH_SECRET" },
      { "name": "S3_ACCESS_KEY", "valueFrom": "arn:aws:secretsmanager:...:S3_ACCESS_KEY" },
      { "name": "S3_SECRET_KEY", "valueFrom": "arn:aws:secretsmanager:...:S3_SECRET_KEY" },
      { "name": "SENDGRID_API_KEY", "valueFrom": "arn:aws:secretsmanager:...:SENDGRID_API_KEY" }
    ],
    "logConfiguration": {
      "logDriver": "awslogs",
      "options": {
        "awslogs-group": "/ecs/annex-api",
        "awslogs-region": "us-east-1",
        "awslogs-stream-prefix": "api"
      }
    },
    "healthCheck": {
      "command": ["CMD-SHELL", "wget -q --spider http://localhost:4000/health || exit 1"],
      "interval": 30, "timeout": 5, "retries": 3, "startPeriod": 30
    }
  }]
}
```

The web task is similar but uses port 3000 and only needs `NEXT_PUBLIC_API_URL` (already baked into the image at build time).

### Step 4: ALB rules

Create one ALB listening on 443. Add two target groups and two routing rules:

| Host header | Target group | Port |
|-------------|--------------|------|
| `api.annexworkforce.com` | `annex-api-tg` | 4000 |
| `app.annexworkforce.com` | `annex-web-tg` | 3000 |

Health check paths:
- API: `/health` (returns 200 with DB ping)
- Web: `/` (returns 200 with Next.js homepage)

### Step 5: Run database migrations

Run as a one-off ECS task:

```bash
aws ecs run-task --cluster annex-prod \
  --task-definition annex-api-migrate \
  --launch-type FARGATE \
  --network-configuration 'awsvpcConfiguration={subnets=[subnet-xxx],securityGroups=[sg-xxx]}' \
  --overrides '{"containerOverrides":[{"name":"api","command":["sh","-c","npx prisma migrate deploy"]}]}'
```

For the very first deploy, also seed:

```bash
# In the same one-off task, run:
sh -c "npx prisma migrate deploy && npx ts-node prisma/seed.ts"
```

### Step 6: DNS + CloudFront (optional but recommended)

Point `api.annexworkforce.com` and `app.annexworkforce.com` at the ALB via Route 53. For the web app, you can put a CloudFront distribution in front for global edge caching of static assets.

---

## 7. Third-party integrations

The platform is designed to work without these — they're additive. Wire them up when you need them.

### SendGrid (transactional email)

The notifications service auto-detects the SendGrid SMTP relay when `SENDGRID_API_KEY` is set:

```env
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxx
SENDGRID_FROM_EMAIL=noreply@annexworkforce.com
```

Verify the sender domain in SendGrid's UI. The HTML templates live in `apps/api/src/notifications/notifications.service.ts`.

### Smile Identity (NIN / BVN identity verification)

Add credentials:

```env
SMILE_IDENTITY_PARTNER_ID=xxxx
SMILE_IDENTITY_API_KEY=xxxx
```

Then implement the actual API call in `apps/api/src/verification/verification.service.ts` → `callSmileIdentity()`. Currently returns a stub success result. See [Smile ID docs](https://docs.smileidentity.com/products/biometric-kyc).

### Paystack (salary disbursement)

Currently `apps/api/src/payroll/payroll.service.ts` → `process()` just marks a run as `COMPLETED`. To actually disburse:

1. Add `PAYSTACK_SECRET_KEY` to env
2. In `process()`, iterate payslips and call Paystack's [transfer API](https://paystack.com/docs/api/transfer)
3. Store transfer reference in payslip's `pdfUrl` or a new `transferReference` field
4. Add a webhook handler at `/v1/webhooks/paystack` to receive disbursement status updates

### DocuSign (EOR contract e-signature)

When activating an EOR contract, you'd typically:

1. Generate a contract PDF from a template
2. Send to DocuSign envelope
3. Store the envelope ID in `EorContract.contractFileUrl`
4. Webhook completes the flow → update `signedAt`

---

## 8. Operational runbook

### Monthly payroll cycle

For each employer with active EOR contracts:

1. **By the 25th** — verify all contracts are still ACTIVE
2. **27th** — Create the run via `POST /v1/payroll/runs` with the period (e.g. `"2025-05"`). Status becomes `DRAFT`. Payslips are computed using the tax engine.
3. **27th–28th** — Employer reviews payslips in `/employer/payroll`. Status moves `DRAFT → APPROVED` via `POST /v1/payroll/runs/:id/approve`
4. **30th–31st** — Status moves `APPROVED → COMPLETED` via `POST /v1/payroll/runs/:id/process`. In production this triggers Paystack bulk transfer + statutory remittance jobs.
5. **First week of next month** — File PAYE with FIRS, remit pension to PFAs, remit NHF to Federal Mortgage Bank.

### Verification SLA

- Identity verifications via Smile Identity: typically <2 minutes (automated)
- Education / employment checks via Youverify: 3–5 business days
- Manual fallback: target <24h from queue entry

Admins watch the queue at `/admin/verification` and process via Approve/Reject.

### Secret rotation

JWT secrets should be rotated every 90 days:

```bash
# Generate new secret
NEW_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")

# Update Secrets Manager
aws secretsmanager update-secret --secret-id JWT_SECRET --secret-string "$NEW_SECRET"

# Force a rolling deploy of the API service
aws ecs update-service --cluster annex-prod --service annex-api --force-new-deployment
```

All currently-issued access tokens become invalid (15min TTL anyway). Refresh tokens in the database remain valid until their TTL expires; users will get a fresh access token via `/auth/refresh`.

### Logging + observability

Each app logs to stdout in JSON format (in production). Pipe to CloudWatch Logs (already configured in the ECS task def). For metrics + alerts, add CloudWatch alarms on:

- ALB 5xx rate > 1%
- ECS service CPU > 80% sustained
- RDS connection count > 80% of max
- ElastiCache evictions > 0

For app-level errors, wire up Sentry by adding `@sentry/node` to the API and `@sentry/nextjs` to the web — both have first-class NestJS / Next.js integrations.

---

## 9. Troubleshooting

### "Can't reach database server"

```bash
docker compose ps                     # is postgres healthy?
docker compose logs postgres          # check logs
docker compose exec postgres pg_isready -U annex
```

### "Elasticsearch not reachable"

The API logs `Elasticsearch not reachable` on boot but **continues to run** — search falls back to Postgres. To force ES:

```bash
docker compose logs elasticsearch
docker compose restart elasticsearch
curl http://localhost:9200/_cluster/health
```

### "MinIO bucket not found"

The API auto-creates buckets on startup. If it fails, manually create:

```bash
docker compose exec minio mc alias set local http://localhost:9000 annexminio miniopassword
docker compose exec minio mc mb local/annex-documents
```

### "JWT secret missing"

You'll see `JWT_SECRET` undefined errors. Make sure your `.env` is loaded — for production, the API expects env vars from the runtime environment, not from a `.env` file.

### "Prisma client not generated"

```bash
cd apps/api
npx prisma generate
```

This must run after `npm install` and before `nest start`. The build process runs it automatically; only an issue with manual workflows.

### Migration drift

If `prisma migrate deploy` fails because the DB has unmigrated changes:

```bash
# Inspect what's different
npx prisma migrate status

# Mark a known-applied migration as resolved
npx prisma migrate resolve --applied <migration_name>
```

### Port already in use

```bash
# Find what's holding the port
lsof -i :4000
lsof -i :3000

# Or just change ports
API_PORT=4001 npm run dev:api
```

### Web build fails with "Module not found"

```bash
rm -rf apps/web/.next apps/web/node_modules
npm install
npm run build
```

### Container OOM in production

The API container's default memory is 1024 MB. If you're running heavy Elasticsearch indexing operations:

- Bump ECS task memory to 2048 MB
- Or move indexing to a background job queue (BullMQ)

---

## What's not in this guide

- Kubernetes manifests — not built. ECS Fargate is simpler for a 2-service app and was chosen as the default. If you need K8s, the Dockerfiles are standard and will run anywhere.
- Terraform — not built. Console-based setup is documented above. Once you've provisioned manually, it's straightforward to import into Terraform with `terraform import`.
- CI/CD — not built. Sketch: GitHub Actions on push to `main` runs lint + build + test, then pushes images to ECR and calls `aws ecs update-service --force-new-deployment` for both services.

These are intentional omissions for the MVP. They'd add ~2,000 lines of infra-as-code that a real DevOps engineer should write specifically for your AWS account, networking, and compliance requirements.
