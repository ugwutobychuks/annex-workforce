import { v, ConvexError } from "convex/values";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import { paginationOptsValidator } from "convex/server";

async function requireAdmin(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new ConvexError({ message: "Not authenticated", code: "UNAUTHENTICATED" });
  const user = await ctx.db
    .query("users")
    .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
    .unique();
  if (!user || user.role !== "admin")
    throw new ConvexError({ message: "Forbidden", code: "FORBIDDEN" });
  return user;
}

// ── user management ───────────────────────────────────────────────────────────

export const listUsers = query({
  args: {
    role: v.optional(v.union(v.literal("candidate"), v.literal("employer"), v.literal("admin"))),
    search: v.optional(v.string()),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const page = args.role
      ? await ctx.db
          .query("users")
          .withIndex("by_role", (q) => q.eq("role", args.role))
          .order("desc")
          .paginate(args.paginationOpts)
      : await ctx.db.query("users").order("desc").paginate(args.paginationOpts);

    if (!args.search) return page;
    const q = args.search.toLowerCase();
    return {
      ...page,
      page: page.page.filter(
        (u) =>
          u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q)
      ),
    };
  },
});

export const setUserRole = mutation({
  args: {
    userId: v.id("users"),
    role: v.union(v.literal("candidate"), v.literal("employer"), v.literal("admin")),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    if (args.userId === admin._id && args.role !== "admin") {
      throw new ConvexError({ message: "Cannot demote yourself", code: "CONFLICT" });
    }
    await ctx.db.patch(args.userId, { role: args.role, onboardingComplete: true });
  },
});

export const setUserBanned = mutation({
  args: {
    userId: v.id("users"),
    banned: v.boolean(),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    if (args.userId === admin._id) {
      throw new ConvexError({ message: "Cannot ban yourself", code: "CONFLICT" });
    }
    await ctx.db.patch(args.userId, {
      isBanned: args.banned,
      banReason: args.banned ? args.reason : undefined,
    });
  },
});

// ── verification queue ────────────────────────────────────────────────────────

export const listVerifications = query({
  args: {
    status: v.optional(v.union(v.literal("pending"), v.literal("approved"), v.literal("rejected"))),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const page = args.status
      ? await ctx.db
          .query("verificationRequests")
          .withIndex("by_status", (q) => q.eq("status", args.status))
          .order("desc")
          .paginate(args.paginationOpts)
      : await ctx.db.query("verificationRequests").order("desc").paginate(args.paginationOpts);

    const enriched = await Promise.all(
      page.page.map(async (r) => {
        const subject = await ctx.db.get(r.subjectUserId);
        const candidateProfile =
          r.subjectType === "candidate" && subject
            ? await ctx.db
                .query("candidateProfiles")
                .withIndex("by_user", (q) => q.eq("userId", subject._id))
                .unique()
            : null;
        const companyProfile =
          r.subjectType === "employer" && subject
            ? await ctx.db
                .query("companyProfiles")
                .withIndex("by_employer", (q) => q.eq("employerId", subject._id))
                .unique()
            : null;
        return { ...r, subject, candidateProfile, companyProfile };
      })
    );

    return { ...page, page: enriched };
  },
});

export const reviewVerification = mutation({
  args: {
    requestId: v.id("verificationRequests"),
    decision: v.union(v.literal("approved"), v.literal("rejected")),
    reviewerNote: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const req = await ctx.db.get(args.requestId);
    if (!req) throw new ConvexError({ message: "Not found", code: "NOT_FOUND" });
    if (req.status !== "pending")
      throw new ConvexError({ message: "Already reviewed", code: "CONFLICT" });

    await ctx.db.patch(args.requestId, {
      status: args.decision,
      reviewerId: admin._id,
      reviewedAt: Date.now(),
      reviewerNote: args.reviewerNote,
    });

    if (args.decision === "approved") {
      if (req.subjectType === "candidate") {
        const profile = await ctx.db
          .query("candidateProfiles")
          .withIndex("by_user", (q) => q.eq("userId", req.subjectUserId))
          .unique();
        if (profile) await ctx.db.patch(profile._id, { isVerified: true });
      } else {
        const profile = await ctx.db
          .query("companyProfiles")
          .withIndex("by_employer", (q) => q.eq("employerId", req.subjectUserId))
          .unique();
        if (profile) await ctx.db.patch(profile._id, { isVerified: true });
      }
    }
  },
});

// ── platform analytics ────────────────────────────────────────────────────────

export const getPlatformAnalytics = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);

    const [users, jobs, applications, contracts, verifications] = await Promise.all([
      ctx.db.query("users").collect(),
      ctx.db.query("jobs").collect(),
      ctx.db.query("applications").collect(),
      ctx.db.query("eorContracts").collect(),
      ctx.db.query("verificationRequests").collect(),
    ]);

    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;
    const in7 = (t: number) => now - t <= 7 * day;
    const in30 = (t: number) => now - t <= 30 * day;

    return {
      users: {
        total: users.length,
        candidates: users.filter((u) => u.role === "candidate").length,
        employers: users.filter((u) => u.role === "employer").length,
        admins: users.filter((u) => u.role === "admin").length,
        banned: users.filter((u) => u.isBanned).length,
        new7d: users.filter((u) => in7(u._creationTime)).length,
        new30d: users.filter((u) => in30(u._creationTime)).length,
      },
      jobs: {
        total: jobs.length,
        published: jobs.filter((j) => j.status === "published").length,
        draft: jobs.filter((j) => j.status === "draft").length,
        closed: jobs.filter((j) => j.status === "closed").length,
        new30d: jobs.filter((j) => in30(j._creationTime)).length,
      },
      applications: {
        total: applications.length,
        hired: applications.filter((a) => a.status === "hired").length,
        inPipeline: applications.filter((a) =>
          ["applied", "screening", "shortlisted", "interview", "offer"].includes(a.status)
        ).length,
        new30d: applications.filter((a) => in30(a._creationTime)).length,
      },
      verifications: {
        pending: verifications.filter((v) => v.status === "pending").length,
        approved: verifications.filter((v) => v.status === "approved").length,
        rejected: verifications.filter((v) => v.status === "rejected").length,
      },
      eor: {
        contracts: contracts.length,
        active: contracts.filter((c) => c.status === "active").length,
      },
    };
  },
});
