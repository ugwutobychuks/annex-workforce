import { v, ConvexError } from "convex/values";
import { action, query, mutation, internalMutation } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";
import type { Id } from "./_generated/dataModel";
import {
  pickProvider,
  stubCheckout, stubVerify,
  paystackCheckout, paystackVerify,
  flutterwaveCheckout, flutterwaveVerify,
} from "./lib/payments";

const FEATURED_PRICE_NGN = 15_000; // ₦15,000
const FEATURED_DAYS = 7;

// Feature a job for FEATURED_DAYS. Called by the client after checkout redirect.
export const featureJobCheckout = action({
  args: {
    jobId: v.id("jobs"),
    callbackUrl: v.string(),
  },
  handler: async (ctx, args): Promise<{ reference: string; checkoutUrl: string; autoSucceeded?: boolean }> => {
    const user = await ctx.runQuery(api.users.getCurrentUser, {});
    if (!user) throw new ConvexError({ message: "Not authenticated", code: "UNAUTHENTICATED" });
    if (user.role !== "employer") throw new ConvexError({ message: "Employers only", code: "FORBIDDEN" });

    const reference = `feat_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    const amountMinorUnits = FEATURED_PRICE_NGN * 100;
    const provider = pickProvider();

    const input = {
      reference,
      amountMinorUnits,
      currency: "NGN",
      email: user.email ?? "unknown@example.com",
      metadata: { jobId: args.jobId, featureDays: FEATURED_DAYS },
      callbackUrl: args.callbackUrl,
    };

    let checkout;
    if (provider === "paystack") checkout = await paystackCheckout(input);
    else if (provider === "flutterwave") checkout = await flutterwaveCheckout(input);
    else checkout = stubCheckout(input);

    if (!checkout.ok) throw new ConvexError({ message: checkout.error, code: "PROVIDER" });

    await ctx.runMutation(internal.payments._recordPending, {
      userId: user._id,
      kind: "featured_job",
      amount: amountMinorUnits,
      currency: "NGN",
      provider,
      reference,
      providerRef: checkout.providerRef,
      checkoutUrl: checkout.checkoutUrl,
      metadata: JSON.stringify({ jobId: args.jobId, featureDays: FEATURED_DAYS }),
    });

    // The stub auto-succeeds immediately so local development works without
    // any real provider round-trip.
    if (checkout.autoSucceeded) {
      await ctx.runMutation(internal.payments._markSucceeded, { reference });
    }
    return { reference, checkoutUrl: checkout.checkoutUrl, autoSucceeded: checkout.autoSucceeded };
  },
});

// Called by the callback page (or a webhook) to confirm and apply the effect.
export const verifyAndApply = action({
  args: { reference: v.string() },
  handler: async (ctx, args): Promise<{ status: "succeeded" | "failed" }> => {
    const payment = await ctx.runQuery(api.payments.byReference, { reference: args.reference });
    if (!payment) throw new ConvexError({ message: "Unknown payment", code: "NOT_FOUND" });
    if (payment.status === "succeeded") return { status: "succeeded" };

    const provider = payment.provider;
    let verify;
    if (provider === "paystack") verify = await paystackVerify(args.reference);
    else if (provider === "flutterwave") verify = await flutterwaveVerify(args.reference);
    else verify = stubVerify({
      reference: args.reference,
      amountMinorUnits: payment.amount,
      currency: payment.currency,
    });

    if (!verify.ok) throw new ConvexError({ message: verify.error, code: "PROVIDER" });
    if (verify.status === "failed") {
      await ctx.runMutation(internal.payments._markFailed, { reference: args.reference });
      return { status: "failed" };
    }

    await ctx.runMutation(internal.payments._markSucceeded, { reference: args.reference });
    return { status: "succeeded" };
  },
});

// ── Queries ──────────────────────────────────────────────────────────────────

export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return await ctx.db
      .query("payments")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
  },
});

export const byReference = query({
  args: { reference: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("payments")
      .withIndex("by_reference", (q) => q.eq("reference", args.reference))
      .unique();
  },
});

// ── Internal mutations (called from the actions above) ───────────────────────

export const _recordPending = internalMutation({
  args: {
    userId: v.id("users"),
    kind: v.string(),
    amount: v.number(),
    currency: v.string(),
    provider: v.union(v.literal("stub"), v.literal("paystack"), v.literal("flutterwave")),
    reference: v.string(),
    providerRef: v.optional(v.string()),
    checkoutUrl: v.optional(v.string()),
    metadata: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("payments", {
      ...args,
      status: "pending",
    });
  },
});

export const _markSucceeded = internalMutation({
  args: { reference: v.string() },
  handler: async (ctx, args) => {
    const p = await ctx.db
      .query("payments")
      .withIndex("by_reference", (q) => q.eq("reference", args.reference))
      .unique();
    if (!p) return;
    if (p.status === "succeeded") return;
    await ctx.db.patch(p._id, { status: "succeeded" });

    // Apply the side-effect of the purchase, based on `kind`.
    if (p.kind === "featured_job") {
      try {
        const meta = JSON.parse(p.metadata ?? "{}") as { jobId?: Id<"jobs">; featureDays?: number };
        if (meta.jobId && meta.featureDays) {
          const until = Date.now() + meta.featureDays * 24 * 60 * 60 * 1000;
          await ctx.db.patch(meta.jobId, { featuredUntil: until });
        }
      } catch {
        // metadata was malformed; the payment still counts as succeeded
      }
    }
  },
});

export const _markFailed = internalMutation({
  args: { reference: v.string() },
  handler: async (ctx, args) => {
    const p = await ctx.db
      .query("payments")
      .withIndex("by_reference", (q) => q.eq("reference", args.reference))
      .unique();
    if (!p || p.status === "succeeded") return;
    await ctx.db.patch(p._id, { status: "failed" });
  },
});

// A user-visible mutation to re-record a webhook-style confirmation manually,
// useful during local development when there is no webhook endpoint.
export const confirmSuccessManually = mutation({
  args: { reference: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError({ message: "Not authenticated", code: "UNAUTHENTICATED" });
    const p = await ctx.db
      .query("payments")
      .withIndex("by_reference", (q) => q.eq("reference", args.reference))
      .unique();
    if (!p || p.userId !== userId) throw new ConvexError({ message: "Not found", code: "NOT_FOUND" });
    if (p.status === "succeeded") return;
    if (p.provider !== "stub")
      throw new ConvexError({ message: "Real providers must confirm via webhook", code: "FORBIDDEN" });
    await ctx.db.patch(p._id, { status: "succeeded" });
    if (p.kind === "featured_job") {
      try {
        const meta = JSON.parse(p.metadata ?? "{}") as { jobId?: Id<"jobs">; featureDays?: number };
        if (meta.jobId && meta.featureDays) {
          const until = Date.now() + meta.featureDays * 24 * 60 * 60 * 1000;
          await ctx.db.patch(meta.jobId, { featuredUntil: until });
        }
      } catch { /* ignore */ }
    }
  },
});
