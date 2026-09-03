import { v, ConvexError } from "convex/values";
import { mutation, query } from "./_generated/server";

// Any authenticated candidate or employer can request verification of themselves.
// Only one active pending request is allowed at a time per user.

export const getMyVerificationStatus = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user) return null;

    const requests = await ctx.db
      .query("verificationRequests")
      .withIndex("by_subject", (q) => q.eq("subjectUserId", user._id))
      .order("desc")
      .take(5);

    let isVerified = false;
    if (user.role === "candidate") {
      const p = await ctx.db
        .query("candidateProfiles")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .unique();
      isVerified = !!p?.isVerified;
    } else if (user.role === "employer") {
      const p = await ctx.db
        .query("companyProfiles")
        .withIndex("by_employer", (q) => q.eq("employerId", user._id))
        .unique();
      isVerified = !!p?.isVerified;
    }

    return { isVerified, requests };
  },
});

export const requestVerification = mutation({
  args: {
    note: v.optional(v.string()),
    documentUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ message: "Not authenticated", code: "UNAUTHENTICATED" });
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user) throw new ConvexError({ message: "User not found", code: "NOT_FOUND" });
    if (user.role !== "candidate" && user.role !== "employer")
      throw new ConvexError({ message: "Verification not available for this role", code: "FORBIDDEN" });

    const existing = await ctx.db
      .query("verificationRequests")
      .withIndex("by_subject", (q) => q.eq("subjectUserId", user._id))
      .collect();
    if (existing.some((r) => r.status === "pending"))
      throw new ConvexError({ message: "A pending request already exists", code: "CONFLICT" });

    await ctx.db.insert("verificationRequests", {
      subjectUserId: user._id,
      subjectType: user.role,
      status: "pending",
      note: args.note,
      documentUrl: args.documentUrl,
    });
  },
});
