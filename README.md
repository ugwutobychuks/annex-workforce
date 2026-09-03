# Annex Workforce

> Trusted talent infrastructure for Africa — verified marketplace, employer-of-record, and integrated HRMS in a single platform.

---

## Hercules Rebuild (`hercules` branch)

This branch is a **full rebuild** of the Annex Workforce platform on the [Hercules](https://hercules.app) stack. The original codebase (Next.js + NestJS + PostgreSQL) is incompatible with the Hercules platform, so the entire product is being rebuilt milestone-by-milestone using:

| Layer | Technology |
|-------|------------|
| Frontend | Vite + React 19 + TypeScript |
| Styling | Tailwind CSS 4 + shadcn UI |
| Backend | Convex (serverless functions + reactive DB) |
| Auth | Hercules Auth (OIDC) |
| Hosting | Hercules Cloud |

**Theme:** Manrope/Inter fonts, corporate-blue palette, dark sidebar, full light/dark mode support.

---

## Feature Status

### Milestone 1 — Auth + Core Layout ✅ Built
- Landing / marketing page
- Hercules Auth integration (Google, email, etc.)
- Role selection onboarding (`candidate` | `employer` | `admin`)
- Shared dark sidebar + topbar for all roles
- Route guards per role
- Convex `users` table with `role` and `onboardingComplete`

### Milestone 2 — Candidate Flow ✅ Built
- Candidate profile: basic info, skills, work experience, education
- Browse Jobs: debounced search, filters, pagination
- Job Detail page with Apply Now + cover letter
- My Applications: status tracking across 7 pipeline stages
- Convex tables: `candidateProfiles`, `workExperiences`, `educations`, `applications`

### Milestone 3 — Employer Dashboard ✅ Built
- Company profile setup (name, industry, size, HQ, website, description)
- Job Postings: create / edit / delete, draft → publish → close status transitions
- Applicant Pipeline: 7-column kanban board (Applied → Screening → Shortlisted → Interview → Offer → Hired → Rejected)
- Applicant detail modal with cover letter viewer and inline status updates
- Talent Pool: searchable candidate grid (name, headline, skills, verified badge)
- Employer dashboard stats (total jobs, active, applications, hired)
- Convex tables: `companyProfiles`, `jobs`

### Milestone 4 — Admin Panel 🔲 Pending
- User management: list all users, change roles, view profiles
- Verification queue: approve / reject candidate and company profile verifications
- Platform-wide analytics dashboard (users, jobs, applications, hires)

### Milestone 5 — Payroll & EOR 🔲 Pending
- Employer-of-Record contract creation
- Monthly payroll runs with Nigerian PAYE / Pension / NHF computation
- Payslip generation and disbursement approval flow
- Leave / time-off requests and approvals

---

## Nigerian Payroll Compliance (planned for Milestone 5)

The payroll engine will implement:

- **PAYE** — Finance Act 2020 graduated bands (7% → 24%)
- **Consolidated Relief Allowance** — ₦200k or 1% of gross + 20% of gross-after-statutory
- **Pension** — 8% employee / 10% employer (Pension Reform Act 2014)
- **NHF** — 2.5% of basic salary when threshold is met

> ⚠️ Tax law evolves. Always verify against current FIRS guidelines before running production payroll.

---

## Original Codebase (`main` branch)

The original implementation lives on `main` and uses:

```
annex-workforce/
├── apps/
│   ├── api/    NestJS + Prisma + PostgreSQL
│   └── web/    Next.js 14 (App Router)
└── docker-compose.yml
```

See `docs/DEPLOYMENT.md` on `main` for the original deployment guide.

---

## License

UNLICENSED — proprietary. Copyright © Annex Workforce Ltd.
