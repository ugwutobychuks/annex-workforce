import { v, ConvexError } from "convex/values";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import { paginationOptsValidator } from "convex/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { computePayslip } from "./lib/payeCalc";
import { notify } from "./notifications";

async function requireEmployer(ctx: QueryCtx | MutationCtx) {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new ConvexError({ message: "Not authenticated", code: "UNAUTHENTICATED" });
  const user = await ctx.db.get(userId);
  if (!user || user.role !== "employer")
    throw new ConvexError({ message: "Forbidden", code: "FORBIDDEN" });
  return user;
}

async function getCurrent(ctx: QueryCtx | MutationCtx) {
  const userId = await getAuthUserId(ctx);
  if (!userId) return null;
  return await ctx.db.get(userId);
}

// ── Preview (pure function, safe for candidates + employers) ─────────────────

export const previewPayslip = query({
  args: {
    grossMonthly: v.number(),
    pensionRatePct: v.number(),
    employerPensionRatePct: v.number(),
    nhfEligible: v.boolean(),
  },
  handler: async (_ctx, args) => {
    if (args.grossMonthly < 0) throw new ConvexError({ message: "Gross must be >= 0", code: "BAD" });
    return computePayslip(args);
  },
});

// ── EOR contracts ────────────────────────────────────────────────────────────

export const listMyContracts = query({
  args: {},
  handler: async (ctx) => {
    const employer = await requireEmployer(ctx);
    const contracts = await ctx.db
      .query("eorContracts")
      .withIndex("by_employer", (q) => q.eq("employerId", employer._id))
      .order("desc")
      .collect();
    return await Promise.all(
      contracts.map(async (c) => {
        const candidate = await ctx.db.get(c.candidateId);
        return { ...c, candidate };
      })
    );
  },
});

export const createContract = mutation({
  args: {
    candidateId: v.id("users"),
    jobTitle: v.string(),
    grossMonthlyNGN: v.number(),
    startDate: v.string(),
    endDate: v.optional(v.string()),
    pensionRatePct: v.optional(v.number()),
    employerPensionRatePct: v.optional(v.number()),
    nhfEligible: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const employer = await requireEmployer(ctx);
    const candidate = await ctx.db.get(args.candidateId);
    if (!candidate || candidate.role !== "candidate")
      throw new ConvexError({ message: "Candidate not found", code: "NOT_FOUND" });
    if (args.grossMonthlyNGN <= 0)
      throw new ConvexError({ message: "Gross must be > 0", code: "BAD" });

    return await ctx.db.insert("eorContracts", {
      employerId: employer._id,
      candidateId: args.candidateId,
      jobTitle: args.jobTitle,
      grossMonthlyNGN: args.grossMonthlyNGN,
      startDate: args.startDate,
      endDate: args.endDate,
      pensionRatePct: args.pensionRatePct ?? 8,
      employerPensionRatePct: args.employerPensionRatePct ?? 10,
      nhfEligible: args.nhfEligible ?? false,
      status: "draft",
    });
  },
});

export const updateContractStatus = mutation({
  args: {
    id: v.id("eorContracts"),
    status: v.union(v.literal("draft"), v.literal("active"), v.literal("terminated")),
    terminationReason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const employer = await requireEmployer(ctx);
    const c = await ctx.db.get(args.id);
    if (!c || c.employerId !== employer._id)
      throw new ConvexError({ message: "Not found", code: "NOT_FOUND" });
    const patch: Record<string, unknown> = { status: args.status };
    if (args.status === "terminated") {
      patch.terminatedAt = Date.now();
      patch.terminationReason = args.terminationReason;
    }
    await ctx.db.patch(args.id, patch);
  },
});

export const deleteContract = mutation({
  args: { id: v.id("eorContracts") },
  handler: async (ctx, args) => {
    const employer = await requireEmployer(ctx);
    const c = await ctx.db.get(args.id);
    if (!c || c.employerId !== employer._id)
      throw new ConvexError({ message: "Not found", code: "NOT_FOUND" });
    if (c.status === "active")
      throw new ConvexError({ message: "Terminate the contract first", code: "CONFLICT" });
    await ctx.db.delete(args.id);
  },
});

// ── Payroll runs ─────────────────────────────────────────────────────────────

const PERIOD_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

export const runPayroll = mutation({
  args: { period: v.string() },
  handler: async (ctx, args) => {
    const employer = await requireEmployer(ctx);
    if (!PERIOD_RE.test(args.period))
      throw new ConvexError({ message: "Period must be YYYY-MM", code: "BAD" });

    const existing = await ctx.db
      .query("payrollRuns")
      .withIndex("by_employer_and_period", (q) =>
        q.eq("employerId", employer._id).eq("period", args.period)
      )
      .unique();
    if (existing)
      throw new ConvexError({ message: "Payroll for this period already exists", code: "CONFLICT" });

    const contracts = await ctx.db
      .query("eorContracts")
      .withIndex("by_employer", (q) => q.eq("employerId", employer._id))
      .collect();
    const active = contracts.filter((c) => c.status === "active");
    if (active.length === 0)
      throw new ConvexError({ message: "No active contracts to run payroll for", code: "BAD" });

    const runId = await ctx.db.insert("payrollRuns", {
      employerId: employer._id,
      period: args.period,
      runAt: Date.now(),
      status: "draft",
      totalGross: 0,
      totalPaye: 0,
      totalPension: 0,
      totalNhf: 0,
      totalNet: 0,
      totalEmployerPension: 0,
      payslipCount: 0,
    });

    let totals = { gross: 0, paye: 0, pension: 0, nhf: 0, net: 0, employerPension: 0 };

    for (const c of active) {
      const calc = computePayslip({
        grossMonthly: c.grossMonthlyNGN,
        pensionRatePct: c.pensionRatePct,
        employerPensionRatePct: c.employerPensionRatePct,
        nhfEligible: c.nhfEligible,
      });
      await notify(ctx, {
        userId: c.candidateId,
        kind: "payslip",
        title: `New payslip: ${args.period}`,
        body: `Net ₦${Math.round(calc.net).toLocaleString()}`,
        link: "/candidate/payslips",
      });
      await ctx.db.insert("payslips", {
        runId,
        contractId: c._id,
        employerId: employer._id,
        candidateId: c.candidateId,
        period: args.period,
        gross: calc.gross,
        craMonthly: calc.craMonthly,
        taxableMonthly: calc.taxableMonthly,
        paye: calc.paye,
        pension: calc.pension,
        nhf: calc.nhf,
        net: calc.net,
        employerPension: calc.employerPension,
        breakdown: JSON.stringify(calc.bands),
      });
      totals.gross += calc.gross;
      totals.paye += calc.paye;
      totals.pension += calc.pension;
      totals.nhf += calc.nhf;
      totals.net += calc.net;
      totals.employerPension += calc.employerPension;
    }

    await ctx.db.patch(runId, {
      totalGross: totals.gross,
      totalPaye: totals.paye,
      totalPension: totals.pension,
      totalNhf: totals.nhf,
      totalNet: totals.net,
      totalEmployerPension: totals.employerPension,
      payslipCount: active.length,
    });

    return runId;
  },
});

export const finalizeRun = mutation({
  args: { runId: v.id("payrollRuns") },
  handler: async (ctx, args) => {
    const employer = await requireEmployer(ctx);
    const run = await ctx.db.get(args.runId);
    if (!run || run.employerId !== employer._id)
      throw new ConvexError({ message: "Not found", code: "NOT_FOUND" });
    if (run.status === "finalized")
      throw new ConvexError({ message: "Already finalized", code: "CONFLICT" });
    await ctx.db.patch(args.runId, { status: "finalized" });
  },
});

export const deleteRun = mutation({
  args: { runId: v.id("payrollRuns") },
  handler: async (ctx, args) => {
    const employer = await requireEmployer(ctx);
    const run = await ctx.db.get(args.runId);
    if (!run || run.employerId !== employer._id)
      throw new ConvexError({ message: "Not found", code: "NOT_FOUND" });
    if (run.status === "finalized")
      throw new ConvexError({ message: "Cannot delete a finalized run", code: "CONFLICT" });
    const payslips = await ctx.db
      .query("payslips")
      .withIndex("by_run", (q) => q.eq("runId", args.runId))
      .collect();
    for (const p of payslips) await ctx.db.delete(p._id);
    await ctx.db.delete(args.runId);
  },
});

export const listMyRuns = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    const employer = await requireEmployer(ctx);
    return await ctx.db
      .query("payrollRuns")
      .withIndex("by_employer", (q) => q.eq("employerId", employer._id))
      .order("desc")
      .paginate(args.paginationOpts);
  },
});

export const getRun = query({
  args: { runId: v.id("payrollRuns") },
  handler: async (ctx, args) => {
    const employer = await requireEmployer(ctx);
    const run = await ctx.db.get(args.runId);
    if (!run || run.employerId !== employer._id) return null;
    const payslips = await ctx.db
      .query("payslips")
      .withIndex("by_run", (q) => q.eq("runId", args.runId))
      .collect();
    const enriched = await Promise.all(
      payslips.map(async (p) => {
        const candidate = await ctx.db.get(p.candidateId);
        return { ...p, candidate };
      })
    );
    return { run, payslips: enriched };
  },
});

// ── Candidate view ───────────────────────────────────────────────────────────

export const getMyPayslips = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrent(ctx);
    if (!user) return [];
    const slips = await ctx.db
      .query("payslips")
      .withIndex("by_candidate", (q) => q.eq("candidateId", user._id))
      .order("desc")
      .collect();
    return await Promise.all(
      slips.map(async (s) => {
        const contract = await ctx.db.get(s.contractId);
        const run = await ctx.db.get(s.runId);
        return { ...s, contract, run };
      })
    );
  },
});
