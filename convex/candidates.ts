import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { ConvexError } from "convex/values";

export const getMyProfile = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();

    if (!user) return null;

    const profile = await ctx.db
      .query("candidateProfiles")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .unique();

    const experiences = await ctx.db
      .query("workExperiences")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const educations = await ctx.db
      .query("educations")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

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
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ message: "Not authenticated", code: "UNAUTHENTICATED" });

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user) throw new ConvexError({ message: "User not found", code: "NOT_FOUND" });

    const existing = await ctx.db
      .query("candidateProfiles")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, args);
    } else {
      await ctx.db.insert("candidateProfiles", { userId: user._id, ...args, isVerified: false });
    }

    await ctx.db.patch(user._id, { onboardingComplete: true });
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
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ message: "Not authenticated", code: "UNAUTHENTICATED" });

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user) throw new ConvexError({ message: "User not found", code: "NOT_FOUND" });

    return await ctx.db.insert("workExperiences", { userId: user._id, ...args });
  },
});

export const deleteWorkExperience = mutation({
  args: { id: v.id("workExperiences") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ message: "Not authenticated", code: "UNAUTHENTICATED" });

    const exp = await ctx.db.get(args.id);
    if (!exp) throw new ConvexError({ message: "Not found", code: "NOT_FOUND" });

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user || exp.userId !== user._id)
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
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ message: "Not authenticated", code: "UNAUTHENTICATED" });

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user) throw new ConvexError({ message: "User not found", code: "NOT_FOUND" });

    return await ctx.db.insert("educations", { userId: user._id, ...args });
  },
});

export const deleteEducation = mutation({
  args: { id: v.id("educations") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ message: "Not authenticated", code: "UNAUTHENTICATED" });

    const edu = await ctx.db.get(args.id);
    if (!edu) throw new ConvexError({ message: "Not found", code: "NOT_FOUND" });

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user || edu.userId !== user._id)
      throw new ConvexError({ message: "Forbidden", code: "FORBIDDEN" });

    await ctx.db.delete(args.id);
  },
});
