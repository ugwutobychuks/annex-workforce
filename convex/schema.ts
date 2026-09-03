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
  })
    .index("by_token", ["tokenIdentifier"])
    .index("by_role", ["role"]),
});
