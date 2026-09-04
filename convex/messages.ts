import { v, ConvexError } from "convex/values";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import type { Id } from "./_generated/dataModel";

async function requireUser(ctx: QueryCtx | MutationCtx) {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new ConvexError({ message: "Not authenticated", code: "UNAUTHENTICATED" });
  return userId;
}

/**
 * Threads are 1-1 between a candidate and an employer, anchored on an
 * application. Any authorised participant can post; the other side sees
 * an incremented unread counter until they open the thread.
 */
export const getOrCreateThread = mutation({
  args: { applicationId: v.id("applications") },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    const application = await ctx.db.get(args.applicationId);
    if (!application) throw new ConvexError({ message: "Application not found", code: "NOT_FOUND" });

    const job = await ctx.db.get(application.jobId);
    if (!job) throw new ConvexError({ message: "Job not found", code: "NOT_FOUND" });

    // Only the two parties on the application can talk.
    if (userId !== application.candidateId && userId !== job.employerId)
      throw new ConvexError({ message: "Forbidden", code: "FORBIDDEN" });

    const existing = await ctx.db
      .query("messageThreads")
      .withIndex("by_application", (q) => q.eq("applicationId", args.applicationId))
      .unique();
    if (existing) return existing._id;

    return await ctx.db.insert("messageThreads", {
      applicationId: args.applicationId,
      employerId: job.employerId,
      candidateId: application.candidateId,
      lastMessageAt: Date.now(),
      unreadEmployer: 0,
      unreadCandidate: 0,
    });
  },
});

export const sendMessage = mutation({
  args: { threadId: v.id("messageThreads"), body: v.string() },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    const body = args.body.trim();
    if (body.length === 0) throw new ConvexError({ message: "Empty message", code: "BAD" });
    if (body.length > 4000) throw new ConvexError({ message: "Message too long", code: "BAD" });

    const thread = await ctx.db.get(args.threadId);
    if (!thread) throw new ConvexError({ message: "Thread not found", code: "NOT_FOUND" });
    if (userId !== thread.employerId && userId !== thread.candidateId)
      throw new ConvexError({ message: "Forbidden", code: "FORBIDDEN" });

    await ctx.db.insert("messages", { threadId: args.threadId, senderId: userId, body });

    const isEmployer = userId === thread.employerId;
    await ctx.db.patch(args.threadId, {
      lastMessageAt: Date.now(),
      lastMessagePreview: body.slice(0, 140),
      unreadEmployer: isEmployer ? thread.unreadEmployer : thread.unreadEmployer + 1,
      unreadCandidate: isEmployer ? thread.unreadCandidate + 1 : thread.unreadCandidate,
    });
  },
});

export const markRead = mutation({
  args: { threadId: v.id("messageThreads") },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    const thread = await ctx.db.get(args.threadId);
    if (!thread) return;
    if (userId !== thread.employerId && userId !== thread.candidateId) return;
    const isEmployer = userId === thread.employerId;
    await ctx.db.patch(args.threadId, {
      unreadEmployer: isEmployer ? 0 : thread.unreadEmployer,
      unreadCandidate: isEmployer ? thread.unreadCandidate : 0,
    });
  },
});

export const listMyThreads = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const user = await ctx.db.get(userId);
    if (!user) return [];

    const raw = user.role === "employer"
      ? await ctx.db.query("messageThreads").withIndex("by_employer", (q) => q.eq("employerId", userId)).collect()
      : await ctx.db.query("messageThreads").withIndex("by_candidate", (q) => q.eq("candidateId", userId)).collect();

    const enriched = await Promise.all(
      raw.map(async (t) => {
        const other = user.role === "employer"
          ? await ctx.db.get(t.candidateId)
          : await ctx.db.get(t.employerId);
        const application = await ctx.db.get(t.applicationId);
        const job = application ? await ctx.db.get(application.jobId) : null;
        return {
          ...t,
          other,
          job,
          unread: user.role === "employer" ? t.unreadEmployer : t.unreadCandidate,
        };
      })
    );

    return enriched.sort((a, b) => b.lastMessageAt - a.lastMessageAt);
  },
});

export const getThread = query({
  args: { threadId: v.id("messageThreads") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const thread = await ctx.db.get(args.threadId);
    if (!thread) return null;
    if (userId !== thread.employerId && userId !== thread.candidateId) return null;

    const messages = await ctx.db
      .query("messages")
      .withIndex("by_thread", (q) => q.eq("threadId", args.threadId))
      .order("asc")
      .collect();

    const other = userId === thread.employerId
      ? await ctx.db.get(thread.candidateId)
      : await ctx.db.get(thread.employerId);
    const application = await ctx.db.get(thread.applicationId);
    const job = application ? await ctx.db.get(application.jobId) : null;

    return {
      thread,
      messages,
      other,
      application,
      job,
      viewerId: userId as Id<"users">,
    };
  },
});
