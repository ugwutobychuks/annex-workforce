import { v, ConvexError } from "convex/values";
import { mutation, query, type MutationCtx } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import type { Id } from "./_generated/dataModel";
import { notify } from "./notifications";

async function requireEmployerOnApplication(
  ctx: MutationCtx,
  applicationId: Id<"applications">,
) {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new ConvexError({ message: "Not authenticated", code: "UNAUTHENTICATED" });
  const application = await ctx.db.get(applicationId);
  if (!application) throw new ConvexError({ message: "Application not found", code: "NOT_FOUND" });
  const job = await ctx.db.get(application.jobId);
  if (!job || job.employerId !== userId)
    throw new ConvexError({ message: "Forbidden", code: "FORBIDDEN" });
  return { userId, application, job };
}

export const schedule = mutation({
  args: {
    applicationId: v.id("applications"),
    title: v.string(),
    scheduledAt: v.number(),
    endAt: v.number(),
    location: v.optional(v.string()),
    meetingUrl: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.endAt <= args.scheduledAt)
      throw new ConvexError({ message: "End must be after start", code: "BAD" });
    const { application, job } = await requireEmployerOnApplication(ctx, args.applicationId);
    const id = await ctx.db.insert("interviews", {
      applicationId: args.applicationId,
      employerId: job.employerId,
      candidateId: application.candidateId,
      title: args.title,
      scheduledAt: args.scheduledAt,
      endAt: args.endAt,
      location: args.location,
      meetingUrl: args.meetingUrl,
      notes: args.notes,
      status: "scheduled",
    });
    await notify(ctx, {
      userId: application.candidateId,
      kind: "interview",
      title: `Interview scheduled: ${args.title}`,
      body: `${new Date(args.scheduledAt).toLocaleString()}${args.location ? ` at ${args.location}` : ""}`,
      link: "/candidate/interviews",
    });
    return id;
  },
});

export const reschedule = mutation({
  args: {
    id: v.id("interviews"),
    scheduledAt: v.number(),
    endAt: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError({ message: "Not authenticated", code: "UNAUTHENTICATED" });
    const iv = await ctx.db.get(args.id);
    if (!iv) throw new ConvexError({ message: "Not found", code: "NOT_FOUND" });
    if (iv.employerId !== userId)
      throw new ConvexError({ message: "Forbidden", code: "FORBIDDEN" });
    if (args.endAt <= args.scheduledAt)
      throw new ConvexError({ message: "End must be after start", code: "BAD" });
    await ctx.db.patch(args.id, {
      scheduledAt: args.scheduledAt,
      endAt: args.endAt,
      status: "scheduled",
    });
  },
});

export const setStatus = mutation({
  args: {
    id: v.id("interviews"),
    status: v.union(
      v.literal("scheduled"),
      v.literal("completed"),
      v.literal("cancelled"),
      v.literal("no_show")
    ),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError({ message: "Not authenticated", code: "UNAUTHENTICATED" });
    const iv = await ctx.db.get(args.id);
    if (!iv) throw new ConvexError({ message: "Not found", code: "NOT_FOUND" });
    if (iv.employerId !== userId)
      throw new ConvexError({ message: "Forbidden", code: "FORBIDDEN" });
    await ctx.db.patch(args.id, { status: args.status });
  },
});

export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const user = await ctx.db.get(userId);
    if (!user) return [];
    const rows = user.role === "employer"
      ? await ctx.db.query("interviews").withIndex("by_employer", (q) => q.eq("employerId", userId)).collect()
      : await ctx.db.query("interviews").withIndex("by_candidate", (q) => q.eq("candidateId", userId)).collect();

    const enriched = await Promise.all(
      rows.map(async (iv) => {
        const other = user.role === "employer"
          ? await ctx.db.get(iv.candidateId)
          : await ctx.db.get(iv.employerId);
        const application = await ctx.db.get(iv.applicationId);
        const job = application ? await ctx.db.get(application.jobId) : null;
        return { ...iv, other, job };
      })
    );
    return enriched.sort((a, b) => a.scheduledAt - b.scheduledAt);
  },
});

export const listForApplication = query({
  args: { applicationId: v.id("applications") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const rows = await ctx.db
      .query("interviews")
      .withIndex("by_application", (q) => q.eq("applicationId", args.applicationId))
      .collect();
    // Only participants may see
    return rows.filter((r) => r.employerId === userId || r.candidateId === userId);
  },
});
