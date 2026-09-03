import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    tokenIdentifier: v.string(),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    role: v.optional(v.union(v.literal("candidate"), v.literal("employer"), v.literal("admin"))),
    avatarUrl: v.optional(v.string()),
    onboardingComplete: v.optional(v.boolean()),
    isBanned: v.optional(v.boolean()),
    banReason: v.optional(v.string()),
  })
    .index("by_token", ["tokenIdentifier"])
    .index("by_role", ["role"]),

  companyProfiles: defineTable({
    employerId: v.id("users"),
    name: v.string(),
    industry: v.optional(v.string()),
    size: v.optional(v.string()),
    website: v.optional(v.string()),
    description: v.optional(v.string()),
    location: v.optional(v.string()),
    logoUrl: v.optional(v.string()),
    isVerified: v.optional(v.boolean()),
  }).index("by_employer", ["employerId"]),

  candidateProfiles: defineTable({
    userId: v.id("users"),
    headline: v.optional(v.string()),
    bio: v.optional(v.string()),
    location: v.optional(v.string()),
    phone: v.optional(v.string()),
    skills: v.array(v.string()),
    resumeUrl: v.optional(v.string()),
    isVerified: v.optional(v.boolean()),
  }).index("by_user", ["userId"]),

  workExperiences: defineTable({
    userId: v.id("users"),
    company: v.string(),
    title: v.string(),
    startDate: v.string(),
    endDate: v.optional(v.string()),
    current: v.boolean(),
    description: v.optional(v.string()),
  }).index("by_user", ["userId"]),

  educations: defineTable({
    userId: v.id("users"),
    institution: v.string(),
    degree: v.string(),
    field: v.string(),
    startYear: v.string(),
    endYear: v.optional(v.string()),
    current: v.boolean(),
  }).index("by_user", ["userId"]),

  jobs: defineTable({
    employerId: v.id("users"),
    title: v.string(),
    company: v.string(),
    location: v.string(),
    type: v.union(
      v.literal("full-time"),
      v.literal("part-time"),
      v.literal("contract"),
      v.literal("internship")
    ),
    description: v.string(),
    requirements: v.string(),
    salary: v.optional(v.string()),
    status: v.union(v.literal("draft"), v.literal("published"), v.literal("closed")),
    skills: v.array(v.string()),
  })
    .index("by_employer", ["employerId"])
    .index("by_status", ["status"])
    .searchIndex("search_jobs", {
      searchField: "title",
      filterFields: ["status", "type"],
    }),

  applications: defineTable({
    jobId: v.id("jobs"),
    candidateId: v.id("users"),
    coverLetter: v.optional(v.string()),
    status: v.union(
      v.literal("applied"),
      v.literal("screening"),
      v.literal("shortlisted"),
      v.literal("interview"),
      v.literal("offer"),
      v.literal("hired"),
      v.literal("rejected")
    ),
  })
    .index("by_job", ["jobId"])
    .index("by_candidate", ["candidateId"])
    .index("by_job_and_candidate", ["jobId", "candidateId"]),

  // ── Milestone 4: verification queue ─────────────────────────────────────────
  verificationRequests: defineTable({
    subjectUserId: v.id("users"),
    subjectType: v.union(v.literal("candidate"), v.literal("employer")),
    status: v.union(v.literal("pending"), v.literal("approved"), v.literal("rejected")),
    note: v.optional(v.string()),
    documentUrl: v.optional(v.string()),
    reviewerId: v.optional(v.id("users")),
    reviewedAt: v.optional(v.number()),
    reviewerNote: v.optional(v.string()),
  })
    .index("by_status", ["status"])
    .index("by_subject", ["subjectUserId"]),

  // ── Milestone 5: EOR + payroll ──────────────────────────────────────────────
  eorContracts: defineTable({
    employerId: v.id("users"),
    candidateId: v.id("users"),
    jobTitle: v.string(),
    grossMonthlyNGN: v.number(),
    startDate: v.string(), // YYYY-MM-DD
    endDate: v.optional(v.string()),
    pensionRatePct: v.number(), // employee share, typically 8
    employerPensionRatePct: v.number(), // typically 10
    nhfEligible: v.boolean(),
    status: v.union(v.literal("draft"), v.literal("active"), v.literal("terminated")),
    terminatedAt: v.optional(v.number()),
    terminationReason: v.optional(v.string()),
  })
    .index("by_employer", ["employerId"])
    .index("by_candidate", ["candidateId"])
    .index("by_status", ["status"]),

  payrollRuns: defineTable({
    employerId: v.id("users"),
    period: v.string(), // YYYY-MM
    runAt: v.number(),
    status: v.union(v.literal("draft"), v.literal("finalized")),
    totalGross: v.number(),
    totalPaye: v.number(),
    totalPension: v.number(),
    totalNhf: v.number(),
    totalNet: v.number(),
    totalEmployerPension: v.number(),
    payslipCount: v.number(),
  })
    .index("by_employer", ["employerId"])
    .index("by_employer_and_period", ["employerId", "period"]),

  payslips: defineTable({
    runId: v.id("payrollRuns"),
    contractId: v.id("eorContracts"),
    employerId: v.id("users"),
    candidateId: v.id("users"),
    period: v.string(),
    gross: v.number(),
    craMonthly: v.number(),
    taxableMonthly: v.number(),
    paye: v.number(),
    pension: v.number(),
    nhf: v.number(),
    net: v.number(),
    employerPension: v.number(),
    breakdown: v.string(), // JSON of PAYE bands applied
  })
    .index("by_run", ["runId"])
    .index("by_candidate", ["candidateId"])
    .index("by_employer_and_period", ["employerId", "period"]),
});
