import { v, ConvexError } from "convex/values";
import { mutation, query, internalMutation, type MutationCtx } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { paginationOptsValidator } from "convex/server";
import type { Id } from "./_generated/dataModel";

/**
 * Internal helper — call this from other mutations to fan out a notification
 * to a specific user. Callers must have already established authorisation
 * (this helper does not check permissions).
 */
export async function notify(
  ctx: MutationCtx,
  args: {
    userId: Id<"users">;
    kind: string;
    title: string;
    body?: string;
    link?: string;
  },
) {
  await ctx.db.insert("notifications", {
    userId: args.userId,
    kind: args.kind,
    title: args.title,
    body: args.body,
    link: args.link,
  });
  // Email adapter — swap this for Resend/Postmark/SES later. The stub logs
  // so you can see delivery attempts in `npx convex dev` output.
  try {
    const user = await ctx.db.get(args.userId);
    if (user?.email) {
      console.log(
        `[email:stub] to=${user.email} subject="${args.title}" body="${args.body ?? ""}"`
      );
    }
  } catch {
    // never let email failures break the caller mutation
  }
}

/**
 * Public wrapper if you ever need to fire from an internal action; it re-uses
 * the same helper but requires `internal` access. Prefer `notify` from other
 * mutation files directly.
 */
export const emit = internalMutation({
  args: {
    userId: v.id("users"),
    kind: v.string(),
    title: v.string(),
    body: v.optional(v.string()),
    link: v.optional(v.string()),
  },
  handler: notify,
});

// ── User-facing queries ──────────────────────────────────────────────────────

export const listMine = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { page: [], isDone: true, continueCursor: "" };
    return await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .paginate(args.paginationOpts);
  },
});

export const unreadCount = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return 0;
    const rows = await ctx.db
      .query("notifications")
      .withIndex("by_user_unread", (q) => q.eq("userId", userId).eq("readAt", undefined))
      .collect();
    return rows.length;
  },
});

export const markRead = mutation({
  args: { id: v.id("notifications") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError({ message: "Not authenticated", code: "UNAUTHENTICATED" });
    const n = await ctx.db.get(args.id);
    if (!n || n.userId !== userId) return;
    if (n.readAt) return;
    await ctx.db.patch(args.id, { readAt: Date.now() });
  },
});

export const markAllRead = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return;
    const rows = await ctx.db
      .query("notifications")
      .withIndex("by_user_unread", (q) => q.eq("userId", userId).eq("readAt", undefined))
      .collect();
    const now = Date.now();
    for (const r of rows) await ctx.db.patch(r._id, { readAt: now });
  },
});
