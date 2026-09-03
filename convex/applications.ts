import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { ConvexError } from "convex/values";
import { paginationOptsValidator } from "convex/server";

export const apply = mutation({
  args: {
    jobId: v.id("jobs"),
    coverLetter: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ message: "Not authenticated", code: "UNAUTHENTICATED" });

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
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

    return await ctx.db.insert("applications", {
      jobId: args.jobId,
      candidateId: user._id,
      coverLetter: args.coverLetter,
      status: "applied",
    });
  },
});

export const getMyApplications = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return { page: [], isDone: true, continueCursor: "" };

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user) return { page: [], isDone: true, continueCursor: "" };

    const result = await ctx.db
      .query("applications")
      .withIndex("by_candidate", (q) => q.eq("candidateId", user._id))
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
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return false;

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user) return false;

    const existing = await ctx.db
      .query("applications")
      .withIndex("by_job_and_candidate", (q) =>
        q.eq("jobId", args.jobId).eq("candidateId", user._id)
      )
      .unique();

    return !!existing;
  },
});
