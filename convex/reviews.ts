import { v, ConvexError } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { notify } from "./notifications";
import type { Id } from "./_generated/dataModel";

/**
 * Post-hire reviews. Either side can leave one 1-5 rating per hired
 * application; each side sees only whether *they* have already left one
 * (the counterpart is public via listForUser aggregates on profile pages).
 */
export const canReview = query({
  args: { applicationId: v.id("applications") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { allowed: false, alreadyDone: false, otherPartyId: null as Id<"users"> | null, kind: null as "candidate_of_employer" | "employer_of_candidate" | null };
    const app = await ctx.db.get(args.applicationId);
    if (!app || app.status !== "hired")
      return { allowed: false, alreadyDone: false, otherPartyId: null, kind: null };
    const job = await ctx.db.get(app.jobId);
    if (!job) return { allowed: false, alreadyDone: false, otherPartyId: null, kind: null };

    let otherPartyId: Id<"users">;
    let kind: "candidate_of_employer" | "employer_of_candidate";
    if (userId === app.candidateId) {
      otherPartyId = job.employerId;
      kind = "candidate_of_employer";
    } else if (userId === job.employerId) {
      otherPartyId = app.candidateId;
      kind = "employer_of_candidate";
    } else {
      return { allowed: false, alreadyDone: false, otherPartyId: null, kind: null };
    }

    const mine = await ctx.db
      .query("reviews")
      .withIndex("by_from_and_application", (q) => q.eq("fromUserId", userId).eq("applicationId", args.applicationId))
      .unique();
    return { allowed: !mine, alreadyDone: !!mine, otherPartyId, kind };
  },
});

export const submitReview = mutation({
  args: {
    applicationId: v.id("applications"),
    rating: v.number(),
    comment: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError({ message: "Not authenticated", code: "UNAUTHENTICATED" });
    if (args.rating < 1 || args.rating > 5 || !Number.isInteger(args.rating))
      throw new ConvexError({ message: "Rating must be an integer 1-5", code: "BAD" });
    const app = await ctx.db.get(args.applicationId);
    if (!app || app.status !== "hired")
      throw new ConvexError({ message: "Only hired applications can be reviewed", code: "CONFLICT" });
    const job = await ctx.db.get(app.jobId);
    if (!job) throw new ConvexError({ message: "Job gone", code: "NOT_FOUND" });

    let toUserId: Id<"users">;
    let kind: "candidate_of_employer" | "employer_of_candidate";
    if (userId === app.candidateId) { toUserId = job.employerId; kind = "candidate_of_employer"; }
    else if (userId === job.employerId) { toUserId = app.candidateId; kind = "employer_of_candidate"; }
    else throw new ConvexError({ message: "Not a party to this application", code: "FORBIDDEN" });

    const existing = await ctx.db
      .query("reviews")
      .withIndex("by_from_and_application", (q) => q.eq("fromUserId", userId).eq("applicationId", args.applicationId))
      .unique();
    if (existing) throw new ConvexError({ message: "You already reviewed this hire", code: "CONFLICT" });

    await ctx.db.insert("reviews", {
      fromUserId: userId,
      toUserId,
      applicationId: args.applicationId,
      rating: args.rating,
      comment: args.comment,
      kind,
    });
    const rater = await ctx.db.get(userId);
    await notify(ctx, {
      userId: toUserId,
      kind: "review",
      title: `${rater?.name ?? "Someone"} left you a ${args.rating}-star review`,
      body: args.comment,
    });
  },
});

/** Aggregate + all reviews received by a user, for profile display. */
export const listForUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("reviews")
      .withIndex("by_to_user", (q) => q.eq("toUserId", args.userId))
      .order("desc")
      .collect();
    const total = rows.length;
    const avg = total === 0 ? 0 : rows.reduce((s, r) => s + r.rating, 0) / total;
    const enriched = await Promise.all(
      rows.slice(0, 20).map(async (r) => {
        const from = await ctx.db.get(r.fromUserId);
        return { ...r, from };
      })
    );
    return { average: Math.round(avg * 10) / 10, total, recent: enriched };
  },
});
