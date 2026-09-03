import { v, ConvexError } from "convex/values";
import { mutation, query } from "./_generated/server";
import { paginationOptsValidator } from "convex/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const listPublished = query({
  args: {
    paginationOpts: paginationOptsValidator,
    search: v.optional(v.string()),
    type: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.search) {
      return await ctx.db
        .query("jobs")
        .withSearchIndex("search_jobs", (q) =>
          q.search("title", args.search!).eq("status", "published")
        )
        .paginate(args.paginationOpts);
    }
    return await ctx.db
      .query("jobs")
      .withIndex("by_status", (q) => q.eq("status", "published"))
      .order("desc")
      .paginate(args.paginationOpts);
  },
});

export const getById = query({
  args: { id: v.id("jobs") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const createJob = mutation({
  args: {
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
    status: v.union(v.literal("draft"), v.literal("published")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError({ message: "Not authenticated", code: "UNAUTHENTICATED" });
    const user = await ctx.db.get(userId);
    if (!user || user.role !== "employer")
      throw new ConvexError({ message: "Forbidden", code: "FORBIDDEN" });

    return await ctx.db.insert("jobs", { ...args, employerId: user._id });
  },
});
