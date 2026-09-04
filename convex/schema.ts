import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

/**
 * Schema for Annex Workforce.
 *
 * `authTables` is spread in and provides: users, authAccounts, authSessions,
 * authRefreshTokens, authVerificationCodes, authVerifiers, authRateLimits.
 * We extend the `users` table with our app-level fields (role, banned, etc.)
 * by overriding it below — Convex Auth merges field definitions.
 */
export default defineSchema({
  ...authTables,

  users: defineTable({
    // Auth-managed fields (Convex Auth writes these):
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),
    // App-level fields:
    role: v.optional(v.union(v.literal("candidate"), v.literal("employer"), v.literal("admin"))),
    avatarUrl: v.optional(v.string()),
    onboardingComplete: v.optional(v.boolean()),
    isBanned: v.optional(v.boolean()),
    banReason: v.optional(v.string()),
  })
    .index("email", ["email"])
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
    // M10: promotion. featuredUntil is a millis timestamp; when > now the job
    // shows at the top of listings.
    featuredUntil: v.optional(v.number()),
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

  eorContracts: defineTable({
    employerId: v.id("users"),
    candidateId: v.id("users"),
    jobTitle: v.string(),
    grossMonthlyNGN: v.number(),
    startDate: v.string(),
    endDate: v.optional(v.string()),
    pensionRatePct: v.number(),
    employerPensionRatePct: v.number(),
    nhfEligible: v.boolean(),
    status: v.union(v.literal("draft"), v.literal("active"), v.literal("terminated")),
    terminatedAt: v.optional(v.number()),
    terminationReason: v.optional(v.string()),
    // M16: ISO country code (NG default for backward compat with pre-M16 rows)
    country: v.optional(v.string()),
  })
    .index("by_employer", ["employerId"])
    .index("by_candidate", ["candidateId"])
    .index("by_status", ["status"]),

  payrollRuns: defineTable({
    employerId: v.id("users"),
    period: v.string(),
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

  // ── M6 messaging ────────────────────────────────────────────────────────────
  messageThreads: defineTable({
    applicationId: v.id("applications"),
    employerId: v.id("users"),
    candidateId: v.id("users"),
    lastMessageAt: v.number(),
    lastMessagePreview: v.optional(v.string()),
    unreadEmployer: v.number(),
    unreadCandidate: v.number(),
  })
    .index("by_application", ["applicationId"])
    .index("by_employer", ["employerId"])
    .index("by_candidate", ["candidateId"]),

  messages: defineTable({
    threadId: v.id("messageThreads"),
    senderId: v.id("users"),
    body: v.string(),
  }).index("by_thread", ["threadId"]),

  // ── M13 post-hire reviews ───────────────────────────────────────────────────
  reviews: defineTable({
    fromUserId: v.id("users"),
    toUserId: v.id("users"),
    applicationId: v.id("applications"),
    rating: v.number(), // 1..5
    comment: v.optional(v.string()),
    kind: v.union(
      v.literal("candidate_of_employer"),
      v.literal("employer_of_candidate")
    ),
  })
    .index("by_to_user", ["toUserId"])
    .index("by_application", ["applicationId"])
    .index("by_from_and_application", ["fromUserId", "applicationId"]),

  // ── M12 HRMS ────────────────────────────────────────────────────────────────
  leaveRequests: defineTable({
    userId: v.id("users"),
    employerId: v.id("users"),
    kind: v.union(
      v.literal("annual"),
      v.literal("sick"),
      v.literal("maternity"),
      v.literal("paternity"),
      v.literal("unpaid"),
      v.literal("other")
    ),
    startDate: v.string(), // YYYY-MM-DD
    endDate: v.string(),
    days: v.number(),
    reason: v.optional(v.string()),
    status: v.union(
      v.literal("pending"),
      v.literal("approved"),
      v.literal("rejected"),
      v.literal("cancelled")
    ),
    reviewerId: v.optional(v.id("users")),
    reviewedAt: v.optional(v.number()),
    reviewerNote: v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_employer", ["employerId"])
    .index("by_employer_and_status", ["employerId", "status"]),

  attendance: defineTable({
    userId: v.id("users"),
    employerId: v.id("users"),
    checkedInAt: v.number(),
    checkedOutAt: v.optional(v.number()),
    notes: v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_employer_and_day", ["employerId", "checkedInAt"]),

  orgNodes: defineTable({
    employerId: v.id("users"),
    userId: v.optional(v.id("users")),
    title: v.string(), // role title
    department: v.optional(v.string()),
    managerId: v.optional(v.id("orgNodes")),
  }).index("by_employer", ["employerId"]),

  hrmsDocuments: defineTable({
    employerId: v.id("users"),
    uploaderId: v.id("users"),
    title: v.string(),
    kind: v.string(), // "handbook" | "policy" | "template" | "other"
    url: v.string(),
    visibility: v.union(v.literal("employer"), v.literal("workers"), v.literal("both")),
  }).index("by_employer", ["employerId"]),

  // ── M11 e-signature ─────────────────────────────────────────────────────────
  signatureDocuments: defineTable({
    ownerId: v.id("users"),
    targetUserId: v.id("users"),
    title: v.string(),
    kind: v.union(v.literal("offer_letter"), v.literal("eor_contract"), v.literal("custom")),
    content: v.string(),
    contentHash: v.string(), // sha-256 of content, hex
    status: v.union(
      v.literal("draft"),
      v.literal("sent"),
      v.literal("signed"),
      v.literal("declined")
    ),
    sentAt: v.optional(v.number()),
    signedAt: v.optional(v.number()),
    signatureText: v.optional(v.string()),
    signatureHash: v.optional(v.string()), // sha-256 of `${contentHash}|${signatureText}|${signerId}|${signedAt}`
    declineReason: v.optional(v.string()),
  })
    .index("by_owner", ["ownerId"])
    .index("by_target", ["targetUserId"]),

  // ── M10 payments ────────────────────────────────────────────────────────────
  payments: defineTable({
    userId: v.id("users"),
    kind: v.string(), // "featured_job" | "eor_disbursement" | ...
    amount: v.number(), // minor units, e.g. kobo
    currency: v.string(), // "NGN"
    provider: v.union(v.literal("stub"), v.literal("paystack"), v.literal("flutterwave")),
    status: v.union(
      v.literal("pending"),
      v.literal("succeeded"),
      v.literal("failed"),
      v.literal("refunded")
    ),
    reference: v.string(), // internal reference id, also passed to provider
    providerRef: v.optional(v.string()),
    checkoutUrl: v.optional(v.string()),
    // JSON blob for anything else (e.g. related jobId, featured window)
    metadata: v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_reference", ["reference"]),

  // ── M9 notifications ────────────────────────────────────────────────────────
  notifications: defineTable({
    userId: v.id("users"),
    kind: v.string(), // e.g. "application_new", "application_status", "message", "interview", "payslip", "verification", "assessment"
    title: v.string(),
    body: v.optional(v.string()),
    link: v.optional(v.string()),
    readAt: v.optional(v.number()),
  })
    .index("by_user", ["userId"])
    .index("by_user_unread", ["userId", "readAt"]),

  // ── M8 skills assessments ───────────────────────────────────────────────────
  assessments: defineTable({
    ownerId: v.id("users"),
    title: v.string(),
    description: v.optional(v.string()),
    skill: v.string(),
    passingScore: v.number(), // 0..100
    timeLimitMinutes: v.optional(v.number()),
    status: v.union(v.literal("draft"), v.literal("published"), v.literal("archived")),
  })
    .index("by_owner", ["ownerId"])
    .index("by_status", ["status"]),

  assessmentQuestions: defineTable({
    assessmentId: v.id("assessments"),
    order: v.number(),
    prompt: v.string(),
    options: v.array(v.string()),
    correctIndex: v.number(),
  }).index("by_assessment", ["assessmentId"]),

  assessmentAttempts: defineTable({
    assessmentId: v.id("assessments"),
    candidateId: v.id("users"),
    startedAt: v.number(),
    submittedAt: v.optional(v.number()),
    score: v.optional(v.number()),
    passed: v.optional(v.boolean()),
    // answers: JSON array of {questionId, selectedIndex, correct}
    answers: v.optional(v.string()),
  })
    .index("by_assessment", ["assessmentId"])
    .index("by_candidate", ["candidateId"])
    .index("by_assessment_and_candidate", ["assessmentId", "candidateId"]),

  // ── M7 interviews ───────────────────────────────────────────────────────────
  interviews: defineTable({
    applicationId: v.id("applications"),
    employerId: v.id("users"),
    candidateId: v.id("users"),
    title: v.string(),
    scheduledAt: v.number(),
    endAt: v.number(),
    location: v.optional(v.string()),
    meetingUrl: v.optional(v.string()),
    notes: v.optional(v.string()),
    status: v.union(
      v.literal("scheduled"),
      v.literal("completed"),
      v.literal("cancelled"),
      v.literal("no_show")
    ),
  })
    .index("by_application", ["applicationId"])
    .index("by_employer", ["employerId"])
    .index("by_candidate", ["candidateId"]),

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
    breakdown: v.string(),
    // M16: extras for non-NG countries (kept optional for old rows)
    country: v.optional(v.string()),
    currency: v.optional(v.string()),
    otherDeductionsJson: v.optional(v.string()),
  })
    .index("by_run", ["runId"])
    .index("by_candidate", ["candidateId"])
    .index("by_employer_and_period", ["employerId", "period"]),
});
