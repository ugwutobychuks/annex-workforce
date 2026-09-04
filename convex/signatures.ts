import { v, ConvexError } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { sha256Hex } from "./lib/hash";
import { notify } from "./notifications";

/**
 * Employer authors and sends a document (offer letter, EOR contract, custom)
 * to a specific candidate. When the candidate signs, we store the typed
 * signature and a tamper-evidence hash of {content|signature|signerId|time}.
 * That hash lets any future viewer verify the document hasn't been altered
 * since signing (recompute against the stored content + fields — mismatch =
 * altered).
 */
export const createDocument = mutation({
  args: {
    targetUserId: v.id("users"),
    title: v.string(),
    kind: v.union(v.literal("offer_letter"), v.literal("eor_contract"), v.literal("custom")),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError({ message: "Not authenticated", code: "UNAUTHENTICATED" });
    if (args.content.trim().length < 20)
      throw new ConvexError({ message: "Content is too short", code: "BAD" });
    const contentHash = await sha256Hex(args.content);
    return await ctx.db.insert("signatureDocuments", {
      ownerId: userId,
      targetUserId: args.targetUserId,
      title: args.title,
      kind: args.kind,
      content: args.content,
      contentHash,
      status: "draft",
    });
  },
});

export const sendDocument = mutation({
  args: { id: v.id("signatureDocuments") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError({ message: "Not authenticated", code: "UNAUTHENTICATED" });
    const doc = await ctx.db.get(args.id);
    if (!doc) throw new ConvexError({ message: "Not found", code: "NOT_FOUND" });
    if (doc.ownerId !== userId) throw new ConvexError({ message: "Forbidden", code: "FORBIDDEN" });
    if (doc.status !== "draft") throw new ConvexError({ message: "Already sent", code: "CONFLICT" });
    await ctx.db.patch(args.id, { status: "sent", sentAt: Date.now() });
    await notify(ctx, {
      userId: doc.targetUserId,
      kind: "signature",
      title: `Please sign: ${doc.title}`,
      link: "/candidate/signatures",
    });
  },
});

export const signDocument = mutation({
  args: { id: v.id("signatureDocuments"), signatureText: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError({ message: "Not authenticated", code: "UNAUTHENTICATED" });
    const doc = await ctx.db.get(args.id);
    if (!doc) throw new ConvexError({ message: "Not found", code: "NOT_FOUND" });
    if (doc.targetUserId !== userId)
      throw new ConvexError({ message: "Only the recipient can sign", code: "FORBIDDEN" });
    if (doc.status !== "sent")
      throw new ConvexError({ message: `Cannot sign a ${doc.status} document`, code: "CONFLICT" });
    const sig = args.signatureText.trim();
    if (sig.length < 3) throw new ConvexError({ message: "Signature is too short", code: "BAD" });
    const signedAt = Date.now();
    const signatureHash = await sha256Hex(`${doc.contentHash}|${sig}|${userId}|${signedAt}`);
    await ctx.db.patch(args.id, {
      status: "signed",
      signedAt,
      signatureText: sig,
      signatureHash,
    });
    await notify(ctx, {
      userId: doc.ownerId,
      kind: "signature",
      title: `Signed: ${doc.title}`,
      body: `by ${sig}`,
      link: "/employer/signatures",
    });
  },
});

export const declineDocument = mutation({
  args: { id: v.id("signatureDocuments"), reason: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError({ message: "Not authenticated", code: "UNAUTHENTICATED" });
    const doc = await ctx.db.get(args.id);
    if (!doc) throw new ConvexError({ message: "Not found", code: "NOT_FOUND" });
    if (doc.targetUserId !== userId)
      throw new ConvexError({ message: "Forbidden", code: "FORBIDDEN" });
    if (doc.status !== "sent")
      throw new ConvexError({ message: `Cannot decline ${doc.status} document`, code: "CONFLICT" });
    await ctx.db.patch(args.id, { status: "declined", declineReason: args.reason });
    await notify(ctx, {
      userId: doc.ownerId,
      kind: "signature",
      title: `Declined: ${doc.title}`,
      body: args.reason,
      link: "/employer/signatures",
    });
  },
});

// Queries

export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const user = await ctx.db.get(userId);
    if (!user) return [];
    const rows = user.role === "candidate"
      ? await ctx.db.query("signatureDocuments").withIndex("by_target", (q) => q.eq("targetUserId", userId)).collect()
      : await ctx.db.query("signatureDocuments").withIndex("by_owner", (q) => q.eq("ownerId", userId)).collect();
    return await Promise.all(
      rows.map(async (d) => {
        const other = user.role === "candidate"
          ? await ctx.db.get(d.ownerId)
          : await ctx.db.get(d.targetUserId);
        return { ...d, other };
      })
    );
  },
});

export const getDocument = query({
  args: { id: v.id("signatureDocuments") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const d = await ctx.db.get(args.id);
    if (!d) return null;
    if (d.ownerId !== userId && d.targetUserId !== userId) return null;
    const owner = await ctx.db.get(d.ownerId);
    const target = await ctx.db.get(d.targetUserId);
    return { ...d, owner, target, viewerId: userId };
  },
});
