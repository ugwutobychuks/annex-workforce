# Annex Workforce

> Trusted talent infrastructure for Africa — verified marketplace, employer-of-record, and integrated HRMS in a single platform.

## What's in here

A monorepo containing two deployable apps:

```
annex-workforce/
├── apps/
│   ├── api/          NestJS modular monolith (TypeScript + Prisma + PostgreSQL)
│   └── web/          Next.js 14 frontend (App Router + Tailwind + React Query)
├── docker-compose.yml    Local infrastructure (postgres, redis, elasticsearch, minio, mailhog)
├── docs/
│   └── DEPLOYMENT.md     Full deployment guide
└── .env.example          All environment variables
```

The API is a **modular monolith** with bounded-context modules (auth, candidates, employers, jobs, applications, verification, eor, payroll, hrms). Each module can be extracted into its own service later without rewrites.

## Quick start (5 minutes)

Prerequisites: **Docker**, **Node.js 20+**, **npm 10+**.

```bash
# 1. Copy env file
cp .env.example .env

# 2. Install + start everything (postgres, redis, ES, minio, mailhog, migrations, seed)
npm run setup

# 3. Run the apps
npm run dev
```

That's it. Open:

- **Frontend** → http://localhost:3000
- **API docs (Swagger)** → http://localhost:4000/docs
- **MailHog (dev emails)** → http://localhost:8025
- **MinIO console** → http://localhost:9001 (`annexminio` / `miniopassword`)

## Demo credentials

The seed script creates three accounts:

| Role        | Email                          | Password     |
|-------------|--------------------------------|--------------|
| Super Admin | `admin@annexworkforce.com`     | `Admin@12345` |
| Candidate   | `candidate@example.com`        | `Pass@1234`   |
| Employer    | `employer@techstartup.io`      | `Pass@1234`   |

Plus one published EOR job and 16 pre-seeded skills.

## What works today

**For candidates** — register, complete profile (basics, skills, work experience, education, resume upload), browse jobs, apply with cover letter, track application status, initiate identity/credential verification, view payslips, request and track time off.

**For employers** — set up company profile (onboarding flow), post jobs (draft → publish → close), view applicants on a kanban-style pipeline (applied → screening → shortlisted → interview → offer → hired → rejected), drill into individual applications, search verified talent pool with filters, create EOR contracts with cost preview, run monthly payroll with Nigerian PAYE/Pension/NHF computed automatically, approve and disburse runs, approve/reject team leave requests.

**For admins** — review verification queue (approve / reject identity & credential checks), manage users (suspend, deactivate, reactivate), view platform stats.

## Built-in Nigerian compliance

The payroll engine in `apps/api/src/payroll/tax-engine.service.ts` implements:

- **PAYE** with the full Finance Act 2020 graduated bands (7% → 24%)
- **Consolidated Relief Allowance** (₦200k or 1% of gross + 20% of gross-after-statutory)
- **Pension** at 8% employee / 10% employer per Pension Reform Act 2014
- **NHF** at 2.5% of basic salary (when threshold met)

> ⚠️ Tax law evolves. The engine is structurally correct but should be verified against current FIRS guidelines before production payroll runs.

## Architecture

- **`apps/api`** — NestJS 10, Prisma 5, PostgreSQL 16, JWT auth with refresh-token rotation, Redis-backed rate limiting, Elasticsearch for talent + job search (with Postgres fallback), S3-compatible storage (MinIO locally, AWS S3 in prod), Nodemailer for email (MailHog dev / SendGrid prod).
- **`apps/web`** — Next.js 14 with App Router, route groups for `(auth)` / `(talent)` / `(employer)` / `(admin)`, Zustand for auth state, React Query for server state, Tailwind with a custom forest/sand/ember palette and Fraunces serif display font.

See [`docs/DEPLOYMENT.md`](./docs/DEPLOYMENT.md) for production deployment.

## Useful commands

```bash
npm run dev              # Run both apps in watch mode
npm run build            # Build all workspaces
npm run infra:up         # Start postgres/redis/es/minio/mailhog
npm run infra:down       # Stop infrastructure
npm run db:migrate       # Apply pending migrations
npm run db:seed          # Seed demo data
npm run db:studio        # Open Prisma Studio at :5555
```

## License

UNLICENSED — proprietary. Copyright © Annex Workforce Ltd.
