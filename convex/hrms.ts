import { v, ConvexError } from "convex/values";
import { mutation, query, type MutationCtx } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { notify } from "./notifications";

/**
 * The "employer of record" for an HRMS record is the employer party on an
 * active EOR contract with the user. We resolve that on demand rather than
 * storing it on the user row so an employee can transition between employers
 * without a migration.
 */
async function requireActiveContract(ctx: MutationCtx, userId: string) {
  const contracts = await ctx.db
    .query("eorContracts")
    .withIndex("by_candidate", (q) => q.eq("candidateId", userId as never))
    .collect();
  const active = contracts.find((c) => c.status === "active");
  if (!active) throw new ConvexError({ message: "No active employment contract", code: "FORBIDDEN" });
  return active;
}

// ── Leave ────────────────────────────────────────────────────────────────────

function daysBetween(a: string, b: string) {
  const ad = new Date(a).getTime();
  const bd = new Date(b).getTime();
  if (!Number.isFinite(ad) || !Number.isFinite(bd) || bd < ad) return 0;
  return Math.round((bd - ad) / (24 * 60 * 60 * 1000)) + 1;
}

export const requestLeave = mutation({
  args: {
    kind: v.union(
      v.literal("annual"),
      v.literal("sick"),
      v.literal("maternity"),
      v.literal("paternity"),
      v.literal("unpaid"),
      v.literal("other")
    ),
    startDate: v.string(),
    endDate: v.string(),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError({ message: "Not authenticated", code: "UNAUTHENTICATED" });
    const contract = await requireActiveContract(ctx, userId);
    const days = daysBetween(args.startDate, args.endDate);
    if (days <= 0) throw new ConvexError({ message: "End date must be on or after start", code: "BAD" });
    const id = await ctx.db.insert("leaveRequests", {
      userId,
      employerId: contract.employerId,
      kind: args.kind,
      startDate: args.startDate,
      endDate: args.endDate,
      days,
      reason: args.reason,
      status: "pending",
    });
    const worker = await ctx.db.get(userId);
    await notify(ctx, {
      userId: contract.employerId,
      kind: "leave",
      title: `Leave request: ${worker?.name ?? "worker"} — ${days} day${days === 1 ? "" : "s"} ${args.kind}`,
      body: args.reason,
      link: "/employer/hrms",
    });
    return id;
  },
});

export const reviewLeave = mutation({
  args: {
    id: v.id("leaveRequests"),
    decision: v.union(v.literal("approved"), v.literal("rejected")),
    reviewerNote: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError({ message: "Not authenticated", code: "UNAUTHENTICATED" });
    const req = await ctx.db.get(args.id);
    if (!req) throw new ConvexError({ message: "Not found", code: "NOT_FOUND" });
    if (req.employerId !== userId)
      throw new ConvexError({ message: "Forbidden", code: "FORBIDDEN" });
    if (req.status !== "pending")
      throw new ConvexError({ message: "Already reviewed", code: "CONFLICT" });
    await ctx.db.patch(args.id, {
      status: args.decision,
      reviewerId: userId,
      reviewedAt: Date.now(),
      reviewerNote: args.reviewerNote,
    });
    await notify(ctx, {
      userId: req.userId,
      kind: "leave",
      title: `Leave ${args.decision}`,
      body: args.reviewerNote,
      link: "/candidate/hrms",
    });
  },
});

export const cancelLeave = mutation({
  args: { id: v.id("leaveRequests") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError({ message: "Not authenticated", code: "UNAUTHENTICATED" });
    const req = await ctx.db.get(args.id);
    if (!req) throw new ConvexError({ message: "Not found", code: "NOT_FOUND" });
    if (req.userId !== userId)
      throw new ConvexError({ message: "Forbidden", code: "FORBIDDEN" });
    if (req.status !== "pending")
      throw new ConvexError({ message: "Can only cancel pending requests", code: "CONFLICT" });
    await ctx.db.patch(args.id, { status: "cancelled" });
  },
});

export const listMyLeave = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return await ctx.db
      .query("leaveRequests")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
  },
});

export const listPendingLeaveForEmployer = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const rows = await ctx.db
      .query("leaveRequests")
      .withIndex("by_employer_and_status", (q) => q.eq("employerId", userId).eq("status", "pending"))
      .collect();
    return await Promise.all(
      rows.map(async (r) => {
        const worker = await ctx.db.get(r.userId);
        return { ...r, worker };
      })
    );
  },
});

// ── Attendance ───────────────────────────────────────────────────────────────

export const checkIn = mutation({
  args: { notes: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError({ message: "Not authenticated", code: "UNAUTHENTICATED" });
    const contract = await requireActiveContract(ctx, userId);
    // No overlapping check-in: reject if a current session is open.
    const open = (await ctx.db
      .query("attendance")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(1))[0];
    if (open && !open.checkedOutAt)
      throw new ConvexError({ message: "You are already checked in", code: "CONFLICT" });
    return await ctx.db.insert("attendance", {
      userId,
      employerId: contract.employerId,
      checkedInAt: Date.now(),
      notes: args.notes,
    });
  },
});

export const checkOut = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError({ message: "Not authenticated", code: "UNAUTHENTICATED" });
    const open = (await ctx.db
      .query("attendance")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(1))[0];
    if (!open || open.checkedOutAt)
      throw new ConvexError({ message: "You are not checked in", code: "CONFLICT" });
    await ctx.db.patch(open._id, { checkedOutAt: Date.now() });
  },
});

export const listMyAttendance = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return await ctx.db
      .query("attendance")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(30);
  },
});

export const listTodayForEmployer = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const rows = await ctx.db
      .query("attendance")
      .withIndex("by_employer_and_day", (q) =>
        q.eq("employerId", userId).gte("checkedInAt", startOfDay.getTime())
      )
      .collect();
    return await Promise.all(
      rows.map(async (r) => {
        const worker = await ctx.db.get(r.userId);
        return { ...r, worker };
      })
    );
  },
});

// ── Org chart ────────────────────────────────────────────────────────────────

export const upsertOrgNode = mutation({
  args: {
    id: v.optional(v.id("orgNodes")),
    title: v.string(),
    department: v.optional(v.string()),
    userId: v.optional(v.id("users")),
    managerId: v.optional(v.id("orgNodes")),
  },
  handler: async (ctx, args) => {
    const employerId = await getAuthUserId(ctx);
    if (!employerId) throw new ConvexError({ message: "Not authenticated", code: "UNAUTHENTICATED" });
    if (args.id) {
      const existing = await ctx.db.get(args.id);
      if (!existing || existing.employerId !== employerId)
        throw new ConvexError({ message: "Not found", code: "NOT_FOUND" });
      const { id, ...patch } = args;
      await ctx.db.patch(id, patch);
      return id;
    }
    return await ctx.db.insert("orgNodes", {
      employerId,
      title: args.title,
      department: args.department,
      userId: args.userId,
      managerId: args.managerId,
    });
  },
});

export const deleteOrgNode = mutation({
  args: { id: v.id("orgNodes") },
  handler: async (ctx, args) => {
    const employerId = await getAuthUserId(ctx);
    if (!employerId) throw new ConvexError({ message: "Not authenticated", code: "UNAUTHENTICATED" });
    const node = await ctx.db.get(args.id);
    if (!node || node.employerId !== employerId)
      throw new ConvexError({ message: "Not found", code: "NOT_FOUND" });
    // Detach any reports so we don't leave dangling references.
    const children = await ctx.db
      .query("orgNodes")
      .withIndex("by_employer", (q) => q.eq("employerId", employerId))
      .collect();
    for (const c of children) {
      if (c.managerId === args.id) await ctx.db.patch(c._id, { managerId: undefined });
    }
    await ctx.db.delete(args.id);
  },
});

export const listOrgChart = query({
  args: {},
  handler: async (ctx) => {
    const employerId = await getAuthUserId(ctx);
    if (!employerId) return [];
    const nodes = await ctx.db
      .query("orgNodes")
      .withIndex("by_employer", (q) => q.eq("employerId", employerId))
      .collect();
    return await Promise.all(
      nodes.map(async (n) => {
        const user = n.userId ? await ctx.db.get(n.userId) : null;
        return { ...n, user };
      })
    );
  },
});

// ── Documents ────────────────────────────────────────────────────────────────

export const createHrmsDoc = mutation({
  args: {
    title: v.string(),
    kind: v.string(),
    url: v.string(),
    visibility: v.union(v.literal("employer"), v.literal("workers"), v.literal("both")),
  },
  handler: async (ctx, args) => {
    const employerId = await getAuthUserId(ctx);
    if (!employerId) throw new ConvexError({ message: "Not authenticated", code: "UNAUTHENTICATED" });
    return await ctx.db.insert("hrmsDocuments", {
      employerId,
      uploaderId: employerId,
      title: args.title,
      kind: args.kind,
      url: args.url,
      visibility: args.visibility,
    });
  },
});

export const deleteHrmsDoc = mutation({
  args: { id: v.id("hrmsDocuments") },
  handler: async (ctx, args) => {
    const employerId = await getAuthUserId(ctx);
    if (!employerId) throw new ConvexError({ message: "Not authenticated", code: "UNAUTHENTICATED" });
    const d = await ctx.db.get(args.id);
    if (!d || d.employerId !== employerId)
      throw new ConvexError({ message: "Not found", code: "NOT_FOUND" });
    await ctx.db.delete(args.id);
  },
});

export const listHrmsDocs = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const user = await ctx.db.get(userId);
    if (!user) return [];
    if (user.role === "employer") {
      return await ctx.db
        .query("hrmsDocuments")
        .withIndex("by_employer", (q) => q.eq("employerId", userId))
        .collect();
    }
    // Candidate view: filter by visibility, from any employer whose contract is active
    const contracts = await ctx.db
      .query("eorContracts")
      .withIndex("by_candidate", (q) => q.eq("candidateId", userId))
      .collect();
    const employerIds = Array.from(new Set(
      contracts.filter((c) => c.status === "active").map((c) => c.employerId)
    ));
    const out: Array<unknown> = [];
    for (const eid of employerIds) {
      const docs = await ctx.db
        .query("hrmsDocuments")
        .withIndex("by_employer", (q) => q.eq("employerId", eid))
        .collect();
      for (const d of docs) {
        if (d.visibility === "workers" || d.visibility === "both") out.push(d);
      }
    }
    return out as never[];
  },
});
