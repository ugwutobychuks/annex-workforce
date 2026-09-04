import { v, ConvexError } from "convex/values";
import { mutation, query } from "./_generated/server";
import { paginationOptsValidator } from "convex/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { notify } from "./notifications";

export const apply = mutation({
  args: {
    jobId: v.id("jobs"),
    coverLetter: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError({ message: "Not authenticated", code: "UNAUTHENTICATED" });
    const user = await ctx.db.get(userId);
    if (!user) throw new ConvexError({ message: "User not found", code: "NOT_FOUND" });
    if (user.role !== "candidate")
      throw new ConvexError({ message: "Only candidates can apply", code: "FORBIDDEN" });

    const existing = await ctx.db
      .query("applications")
      .withIndex("by_job_and_candidate", (q) =>
        q.eq("jobId", args.jobId).eq("candidateId", user._id)
      )
      .unique();
    if (existing) throw new ConvexError({ message: "Already applied", code: "CONFLICT" });

    const applicationId = await ctx.db.insert("applications", {
      jobId: args.jobId,
      candidateId: user._id,
      coverLetter: args.coverLetter,
      status: "applied",
    });

    const job = await ctx.db.get(args.jobId);
    if (job) {
      await notify(ctx, {
        userId: job.employerId,
        kind: "application_new",
        title: `New application: ${user.name ?? "A candidate"} for ${job.title}`,
        body: args.coverLetter?.slice(0, 200),
        link: `/employer/applicants`,
      });
    }
    return applicationId;
  },
});

export const getMyApplications = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { page: [], isDone: true, continueCursor: "" };

    const result = await ctx.db
      .query("applications")
      .withIndex("by_candidate", (q) => q.eq("candidateId", userId))
      .order("desc")
      .paginate(args.paginationOpts);

    const page = await Promise.all(
      result.page.map(async (app) => {
        const job = await ctx.db.get(app.jobId);
        return { ...app, job };
      })
    );

    return { ...result, page };
  },
});

export const hasApplied = query({
  args: { jobId: v.id("jobs") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return false;

    const existing = await ctx.db
      .query("applications")
      .withIndex("by_job_and_candidate", (q) =>
        q.eq("jobId", args.jobId).eq("candidateId", userId)
      )
      .unique();

    return !!existing;
  },
});
