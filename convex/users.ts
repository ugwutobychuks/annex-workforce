import { v, ConvexError } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const updateMyName = mutation({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError({ message: "Not authenticated", code: "UNAUTHENTICATED" });
    const trimmed = args.name.trim();
    if (trimmed.length === 0)
      throw new ConvexError({ message: "Name cannot be empty", code: "BAD" });
    await ctx.db.patch(userId, { name: trimmed });
  },
});

export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    return await ctx.db.get(userId);
  },
});

export const setRole = mutation({
  args: {
    role: v.union(v.literal("candidate"), v.literal("employer")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError({ message: "Not authenticated", code: "UNAUTHENTICATED" });
    const user = await ctx.db.get(userId);
    if (!user) throw new ConvexError({ message: "User not found", code: "NOT_FOUND" });
    if (user.role) throw new ConvexError({ message: "Role already set", code: "CONFLICT" });
    await ctx.db.patch(userId, { role: args.role, onboardingComplete: false });
  },
});
