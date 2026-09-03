import { v, ConvexError } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

async function requireUserId(ctx: { auth: { getUserIdentity: () => Promise<unknown> } } & Parameters<typeof getAuthUserId>[0]) {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new ConvexError({ message: "Not authenticated", code: "UNAUTHENTICATED" });
  return userId;
}

export const getMyProfile = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const user = await ctx.db.get(userId);
    if (!user) return null;

    const [profile, experiences, educations] = await Promise.all([
      ctx.db
        .query("candidateProfiles")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .unique(),
      ctx.db
        .query("workExperiences")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .collect(),
      ctx.db
        .query("educations")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .collect(),
    ]);

    return { user, profile, experiences, educations };
  },
});

export const upsertProfile = mutation({
  args: {
    headline: v.optional(v.string()),
    bio: v.optional(v.string()),
    location: v.optional(v.string()),
    phone: v.optional(v.string()),
    skills: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const existing = await ctx.db
      .query("candidateProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, args);
    } else {
      await ctx.db.insert("candidateProfiles", { userId, ...args, isVerified: false });
    }
    await ctx.db.patch(userId, { onboardingComplete: true });
  },
});

export const addWorkExperience = mutation({
  args: {
    company: v.string(),
    title: v.string(),
    startDate: v.string(),
    endDate: v.optional(v.string()),
    current: v.boolean(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    return await ctx.db.insert("workExperiences", { userId, ...args });
  },
});

export const deleteWorkExperience = mutation({
  args: { id: v.id("workExperiences") },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const exp = await ctx.db.get(args.id);
    if (!exp || exp.userId !== userId)
      throw new ConvexError({ message: "Forbidden", code: "FORBIDDEN" });
    await ctx.db.delete(args.id);
  },
});

export const addEducation = mutation({
  args: {
    institution: v.string(),
    degree: v.string(),
    field: v.string(),
    startYear: v.string(),
    endYear: v.optional(v.string()),
    current: v.boolean(),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    return await ctx.db.insert("educations", { userId, ...args });
  },
});

export const deleteEducation = mutation({
  args: { id: v.id("educations") },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const edu = await ctx.db.get(args.id);
    if (!edu || edu.userId !== userId)
      throw new ConvexError({ message: "Forbidden", code: "FORBIDDEN" });
    await ctx.db.delete(args.id);
  },
});
