import { v, ConvexError } from "convex/values";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import { paginationOptsValidator } from "convex/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { notify } from "./notifications";
import { passedSkillsByUser } from "./assessments";

async function getCurrentUser(ctx: QueryCtx | MutationCtx) {
  const userId = await getAuthUserId(ctx);
  if (!userId) return null;
  return await ctx.db.get(userId);
}

async function requireEmployer(ctx: QueryCtx | MutationCtx) {
  const user = await getCurrentUser(ctx);
  if (!user) throw new ConvexError({ message: "Not authenticated", code: "UNAUTHENTICATED" });
  if (user.role !== "employer")
    throw new ConvexError({ message: "Forbidden", code: "FORBIDDEN" });
  return user;
}

// ── company profile ───────────────────────────────────────────────────────────

export const getCompanyProfile = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;
    return await ctx.db
      .query("companyProfiles")
      .withIndex("by_employer", (q) => q.eq("employerId", user._id))
      .unique();
  },
});

export const upsertCompanyProfile = mutation({
  args: {
    name: v.string(),
    industry: v.optional(v.string()),
    size: v.optional(v.string()),
    website: v.optional(v.string()),
    description: v.optional(v.string()),
    location: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireEmployer(ctx);
    const existing = await ctx.db
      .query("companyProfiles")
      .withIndex("by_employer", (q) => q.eq("employerId", user._id))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, args);
    } else {
      await ctx.db.insert("companyProfiles", { ...args, employerId: user._id });
    }
    await ctx.db.patch(user._id, { onboardingComplete: true });
  },
});

// ── jobs management ───────────────────────────────────────────────────────────

export const listMyJobs = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return { page: [], isDone: true, continueCursor: "" };
    return await ctx.db
      .query("jobs")
      .withIndex("by_employer", (q) => q.eq("employerId", user._id))
      .order("desc")
      .paginate(args.paginationOpts);
  },
});

export const updateJob = mutation({
  args: {
    id: v.id("jobs"),
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
    skills: v.array(v.string()),
    status: v.union(v.literal("draft"), v.literal("published"), v.literal("closed")),
  },
  handler: async (ctx, args) => {
    const user = await requireEmployer(ctx);
    const job = await ctx.db.get(args.id);
    if (!job || job.employerId !== user._id)
      throw new ConvexError({ message: "Not found", code: "NOT_FOUND" });
    const { id, ...fields } = args;
    await ctx.db.patch(id, fields);
  },
});

export const updateJobStatus = mutation({
  args: {
    id: v.id("jobs"),
    status: v.union(v.literal("draft"), v.literal("published"), v.literal("closed")),
  },
  handler: async (ctx, args) => {
    const user = await requireEmployer(ctx);
    const job = await ctx.db.get(args.id);
    if (!job || job.employerId !== user._id)
      throw new ConvexError({ message: "Not found", code: "NOT_FOUND" });
    await ctx.db.patch(args.id, { status: args.status });
  },
});

export const deleteJob = mutation({
  args: { id: v.id("jobs") },
  handler: async (ctx, args) => {
    const user = await requireEmployer(ctx);
    const job = await ctx.db.get(args.id);
    if (!job || job.employerId !== user._id)
      throw new ConvexError({ message: "Not found", code: "NOT_FOUND" });
    await ctx.db.delete(args.id);
  },
});

// ── applicant pipeline ────────────────────────────────────────────────────────

export const getApplicantsByJob = query({
  args: { jobId: v.id("jobs") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user || user.role !== "employer") return [];
    const job = await ctx.db.get(args.jobId);
    if (!job || job.employerId !== user._id) return [];

    const applications = await ctx.db
      .query("applications")
      .withIndex("by_job", (q) => q.eq("jobId", args.jobId))
      .collect();

    const passedMap = await passedSkillsByUser(
      ctx,
      applications.map((a) => a.candidateId)
    );

    return await Promise.all(
      applications.map(async (app) => {
        const candidate = await ctx.db.get(app.candidateId);
        const profile = candidate
          ? await ctx.db
              .query("candidateProfiles")
              .withIndex("by_user", (q) => q.eq("userId", candidate._id))
              .unique()
          : null;
        return {
          ...app,
          candidate,
          profile,
          passedSkills: passedMap.get(app.candidateId) ?? [],
        };
      })
    );
  },
});

export const updateApplicationStatus = mutation({
  args: {
    applicationId: v.id("applications"),
    status: v.union(
      v.literal("applied"),
      v.literal("screening"),
      v.literal("shortlisted"),
      v.literal("interview"),
      v.literal("offer"),
      v.literal("hired"),
      v.literal("rejected")
    ),
  },
  handler: async (ctx, args) => {
    const user = await requireEmployer(ctx);
    const application = await ctx.db.get(args.applicationId);
    if (!application) throw new ConvexError({ message: "Not found", code: "NOT_FOUND" });
    const job = await ctx.db.get(application.jobId);
    if (!job || job.employerId !== user._id)
      throw new ConvexError({ message: "Forbidden", code: "FORBIDDEN" });
    await ctx.db.patch(args.applicationId, { status: args.status });
    await notify(ctx, {
      userId: application.candidateId,
      kind: "application_status",
      title: `Your application for ${job.title} is now: ${args.status}`,
      link: "/candidate/applications",
    });
  },
});

// ── talent pool ───────────────────────────────────────────────────────────────

export const searchTalentPool = query({
  args: {
    search: v.optional(v.string()),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user || user.role !== "employer")
      return { page: [], isDone: true, continueCursor: "" };

    const candidateUsers = await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", "candidate"))
      .take(200);

    const passedMap = await passedSkillsByUser(
      ctx,
      candidateUsers.map((u) => u._id)
    );
    const results = await Promise.all(
      candidateUsers.map(async (u) => {
        const profile = await ctx.db
          .query("candidateProfiles")
          .withIndex("by_user", (q) => q.eq("userId", u._id))
          .unique();
        return { user: u, profile, passedSkills: passedMap.get(u._id) ?? [] };
      })
    );

    const filtered = args.search
      ? results.filter((r) => {
          const q = args.search!.toLowerCase();
          return (
            r.user.name?.toLowerCase().includes(q) ||
            r.profile?.headline?.toLowerCase().includes(q) ||
            r.profile?.skills.some((s) => s.toLowerCase().includes(q))
          );
        })
      : results;

    return { page: filtered, isDone: true, continueCursor: "" };
  },
});

// ── dashboard stats ───────────────────────────────────────────────────────────

export const getDashboardStats = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user || user.role !== "employer") return null;

    const jobs = await ctx.db
      .query("jobs")
      .withIndex("by_employer", (q) => q.eq("employerId", user._id))
      .collect();

    const publishedJobs = jobs.filter((j) => j.status === "published");
    const jobIds = jobs.map((j) => j._id);

    let totalApplications = 0;
    let shortlisted = 0;
    let hired = 0;

    for (const jobId of jobIds) {
      const apps = await ctx.db
        .query("applications")
        .withIndex("by_job", (q) => q.eq("jobId", jobId))
        .collect();
      totalApplications += apps.length;
      shortlisted += apps.filter((a) => a.status === "shortlisted").length;
      hired += apps.filter((a) => a.status === "hired").length;
    }

    return {
      totalJobs: jobs.length,
      publishedJobs: publishedJobs.length,
      totalApplications,
      shortlisted,
      hired,
    };
  },
});
