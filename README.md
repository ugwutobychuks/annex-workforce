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

### Milestone 4 — Admin Panel ✅ Built
- User management: paginated list with search + role filter, role changes, ban / unban with reason
- Verification queue: filterable by status; approve / reject with reviewer notes; flips `isVerified` on the underlying profile
- Platform analytics: user / job / application / verification / EOR breakdowns with 7d and 30d growth
- Candidates and employers self-request verification from their own profile page
- Convex tables added: `verificationRequests`; `users.isBanned` + `banReason` fields

### Milestone 5 — Payroll & EOR ✅ Built
- **EOR contracts** — create for any candidate; per-contract pension rate, employer pension rate, NHF eligibility, start/end dates; draft → active → terminated lifecycle
- **Payroll runs** — one-click run for a period (`YYYY-MM`); generates payslips for every active contract; draft runs are editable, `finalize` locks them
- **Payslips** — full breakdown of gross / CRA / taxable / PAYE / employee pension / NHF / net + employer pension; candidates see their own with CSV download
- **Nigerian PAYE calculator** — pure function in `convex/lib/payeCalc.ts` implementing Finance Act 2020 graduated bands (7% → 24%), Consolidated Relief Allowance (₦200k or 1% of gross, plus 20% of gross), 8%/10% pension, 2.5% NHF
- Convex tables added: `eorContracts`, `payrollRuns`, `payslips`

---

## Nigerian Payroll Compliance

The payroll engine implements:

- **PAYE** — Finance Act 2020 graduated bands (7% → 24%)
- **Consolidated Relief Allowance** — ₦200k or 1% of gross + 20% of gross
- **Pension** — 8% employee / 10% employer (Pension Reform Act 2014, per-contract configurable)
- **NHF** — 2.5% of gross when the employee is NHF-eligible

> ⚠️ Tax law evolves. The calculator applies CRA against gross (a minor simplification vs. the strict basic/housing/transport basis). Always verify against current FIRS and state-IRS guidance before running production payroll.

---

## Suggested Next Milestones

Roadmap items that fit naturally on top of what's shipped:

- **M6 — In-app messaging** between candidates and employers, threaded around a job application.
- **M7 — Interview scheduling** with Google/Outlook calendar sync and self-serve booking links.
- **M8 — Assessments & skills tests** for verifiable proficiency signals in the marketplace.
- **M9 — Notifications** — email + in-app inbox for pipeline changes, new payslips, and verification decisions.
- **M10 — Payments** via Paystack / Flutterwave for job-post fees, subscriptions, and EOR salary disbursement.
- **M11 — E-signature** for offer letters and EOR contracts (integrate with a provider or build native).
- **M12 — HRMS** — leave & time-off, attendance, org chart, document store.
- **M13 — Ratings & reviews** on both sides after a hire completes.
- **M14 — Mobile app** (Expo / React Native) reusing the Convex backend directly.
- **M15 — AI features** — JD writer, resume parser, candidate-to-job matching, interview summarizer.
- **M16 — Multi-country payroll** — Kenya, Ghana, South Africa, Egypt to match the "for Africa" positioning.

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
