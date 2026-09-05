import { v, ConvexError } from "convex/values";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import type { Id, Doc } from "./_generated/dataModel";
import { notify } from "./notifications";

/**
 * Shared helper — for a set of candidate ids, returns each one's set of
 * distinct skills they've passed at least one published assessment for.
 * Called by employer.getApplicantsByJob and employer.searchTalentPool so
 * verified skills show as green badges without an extra client round-trip.
 */
export async function passedSkillsByUser(
  ctx: QueryCtx,
  candidateIds: Id<"users">[],
): Promise<Map<string, string[]>> {
  const out = new Map<string, string[]>();
  await Promise.all(
    candidateIds.map(async (uid) => {
      const attempts = await ctx.db
        .query("assessmentAttempts")
        .withIndex("by_candidate", (q) => q.eq("candidateId", uid))
        .collect();
      const passed = attempts.filter((a) => a.passed);
      const skills = new Set<string>();
      for (const a of passed) {
        const asm = await ctx.db.get(a.assessmentId);
        if (asm?.skill) skills.add(asm.skill);
      }
      out.set(uid, [...skills]);
    })
  );
  return out;
}

async function requireOwner(ctx: MutationCtx | QueryCtx, assessmentId: Id<"assessments">) {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new ConvexError({ message: "Not authenticated", code: "UNAUTHENTICATED" });
  const a = await ctx.db.get(assessmentId);
  if (!a) throw new ConvexError({ message: "Not found", code: "NOT_FOUND" });
  if (a.ownerId !== userId) throw new ConvexError({ message: "Forbidden", code: "FORBIDDEN" });
  return { userId, assessment: a };
}

// ── Employer (author) ────────────────────────────────────────────────────────

export const createAssessment = mutation({
  args: {
    title: v.string(),
    skill: v.string(),
    description: v.optional(v.string()),
    passingScore: v.number(),
    timeLimitMinutes: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError({ message: "Not authenticated", code: "UNAUTHENTICATED" });
    if (args.passingScore < 0 || args.passingScore > 100)
      throw new ConvexError({ message: "Passing score must be 0-100", code: "BAD" });
    return await ctx.db.insert("assessments", {
      ownerId: userId,
      title: args.title,
      description: args.description,
      skill: args.skill,
      passingScore: args.passingScore,
      timeLimitMinutes: args.timeLimitMinutes,
      status: "draft",
    });
  },
});

export const addQuestion = mutation({
  args: {
    assessmentId: v.id("assessments"),
    prompt: v.string(),
    options: v.array(v.string()),
    correctIndex: v.number(),
  },
  handler: async (ctx, args) => {
    await requireOwner(ctx, args.assessmentId);
    if (args.options.length < 2)
      throw new ConvexError({ message: "At least 2 options", code: "BAD" });
    if (args.correctIndex < 0 || args.correctIndex >= args.options.length)
      throw new ConvexError({ message: "Bad correctIndex", code: "BAD" });
    const existing = await ctx.db
      .query("assessmentQuestions")
      .withIndex("by_assessment", (q) => q.eq("assessmentId", args.assessmentId))
      .collect();
    return await ctx.db.insert("assessmentQuestions", {
      assessmentId: args.assessmentId,
      order: existing.length,
      prompt: args.prompt,
      options: args.options,
      correctIndex: args.correctIndex,
    });
  },
});

export const removeQuestion = mutation({
  args: { questionId: v.id("assessmentQuestions") },
  handler: async (ctx, args) => {
    const q = await ctx.db.get(args.questionId);
    if (!q) return;
    await requireOwner(ctx, q.assessmentId);
    await ctx.db.delete(args.questionId);
  },
});

export const setAssessmentStatus = mutation({
  args: {
    id: v.id("assessments"),
    status: v.union(v.literal("draft"), v.literal("published"), v.literal("archived")),
  },
  handler: async (ctx, args) => {
    await requireOwner(ctx, args.id);
    if (args.status === "published") {
      const qs = await ctx.db
        .query("assessmentQuestions")
        .withIndex("by_assessment", (q) => q.eq("assessmentId", args.id))
        .collect();
      if (qs.length === 0)
        throw new ConvexError({ message: "Add at least one question first", code: "BAD" });
    }
    await ctx.db.patch(args.id, { status: args.status });
  },
});

export const listMyAssessments = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return await ctx.db
      .query("assessments")
      .withIndex("by_owner", (q) => q.eq("ownerId", userId))
      .order("desc")
      .collect();
  },
});

export const getAssessmentDetail = query({
  args: { id: v.id("assessments") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const a = await ctx.db.get(args.id);
    if (!a || a.ownerId !== userId) return null;
    const questions = await ctx.db
      .query("assessmentQuestions")
      .withIndex("by_assessment", (q) => q.eq("assessmentId", args.id))
      .collect();
    const attempts = await ctx.db
      .query("assessmentAttempts")
      .withIndex("by_assessment", (q) => q.eq("assessmentId", args.id))
      .collect();
    const enrichedAttempts = await Promise.all(
      attempts.map(async (att) => {
        const c = await ctx.db.get(att.candidateId);
        return { ...att, candidate: c };
      })
    );
    return {
      assessment: a,
      questions: questions.sort((x, y) => x.order - y.order),
      attempts: enrichedAttempts,
    };
  },
});

// ── Candidate (take) ─────────────────────────────────────────────────────────

export const listPublishedAssessments = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    const rows = await ctx.db
      .query("assessments")
      .withIndex("by_status", (q) => q.eq("status", "published"))
      .order("desc")
      .collect();

    // Attach candidate's latest attempt (if any) per assessment.
    const withMine = await Promise.all(
      rows.map(async (a) => {
        let mine: Doc<"assessmentAttempts"> | null = null;
        if (userId) {
          mine = await ctx.db
            .query("assessmentAttempts")
            .withIndex("by_assessment_and_candidate", (q) =>
              q.eq("assessmentId", a._id).eq("candidateId", userId)
            )
            .unique();
        }
        const owner = await ctx.db.get(a.ownerId);
        return { ...a, mine, owner };
      })
    );
    return withMine;
  },
});

/**
 * Returns questions WITHOUT correctIndex for the taker.
 */
export const getAssessmentForTake = query({
  args: { id: v.id("assessments") },
  handler: async (ctx, args) => {
    const a = await ctx.db.get(args.id);
    if (!a || a.status !== "published") return null;
    const questions = await ctx.db
      .query("assessmentQuestions")
      .withIndex("by_assessment", (q) => q.eq("assessmentId", args.id))
      .collect();
    return {
      assessment: a,
      questions: questions
        .sort((x, y) => x.order - y.order)
        .map((q) => ({ _id: q._id, prompt: q.prompt, options: q.options })),
    };
  },
});

export const startAttempt = mutation({
  args: { assessmentId: v.id("assessments") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError({ message: "Not authenticated", code: "UNAUTHENTICATED" });
    const a = await ctx.db.get(args.assessmentId);
    if (!a || a.status !== "published")
      throw new ConvexError({ message: "Not available", code: "NOT_FOUND" });

    const existing = await ctx.db
      .query("assessmentAttempts")
      .withIndex("by_assessment_and_candidate", (q) =>
        q.eq("assessmentId", args.assessmentId).eq("candidateId", userId)
      )
      .unique();
    if (existing) return existing._id; // reuse for retake-in-progress

    return await ctx.db.insert("assessmentAttempts", {
      assessmentId: args.assessmentId,
      candidateId: userId,
      startedAt: Date.now(),
    });
  },
});

export const submitAttempt = mutation({
  args: {
    attemptId: v.id("assessmentAttempts"),
    // Array of {questionId, selectedIndex} — client filled everything.
    answers: v.array(
      v.object({
        questionId: v.id("assessmentQuestions"),
        selectedIndex: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError({ message: "Not authenticated", code: "UNAUTHENTICATED" });
    const attempt = await ctx.db.get(args.attemptId);
    if (!attempt) throw new ConvexError({ message: "Not found", code: "NOT_FOUND" });
    if (attempt.candidateId !== userId)
      throw new ConvexError({ message: "Forbidden", code: "FORBIDDEN" });
    if (attempt.submittedAt)
      throw new ConvexError({ message: "Already submitted", code: "CONFLICT" });

    const a = await ctx.db.get(attempt.assessmentId);
    if (!a) throw new ConvexError({ message: "Assessment gone", code: "NOT_FOUND" });

    // Enforce time limit if set.
    if (a.timeLimitMinutes) {
      const elapsedMs = Date.now() - attempt.startedAt;
      if (elapsedMs > a.timeLimitMinutes * 60 * 1000 + 60 * 1000) {
        // 60s grace
        throw new ConvexError({ message: "Time limit exceeded", code: "BAD" });
      }
    }

    const questions = await ctx.db
      .query("assessmentQuestions")
      .withIndex("by_assessment", (q) => q.eq("assessmentId", attempt.assessmentId))
      .collect();

    let correct = 0;
    const graded = questions.map((q) => {
      const submitted = args.answers.find((s) => s.questionId === q._id);
      const ok = submitted?.selectedIndex === q.correctIndex;
      if (ok) correct++;
      return {
        questionId: q._id,
        selectedIndex: submitted?.selectedIndex ?? -1,
        correct: ok,
      };
    });
    const score = questions.length === 0 ? 0 : Math.round((correct / questions.length) * 100);
    const passed = score >= a.passingScore;

    await ctx.db.patch(args.attemptId, {
      submittedAt: Date.now(),
      score,
      passed,
      answers: JSON.stringify(graded),
    });

    const taker = await ctx.db.get(userId);
    await notify(ctx, {
      userId: a.ownerId,
      kind: "assessment",
      title: `${taker?.name ?? "A candidate"} ${passed ? "passed" : "attempted"} "${a.title}"`,
      body: `Score ${score}% (pass ≥ ${a.passingScore}%)`,
      link: `/employer/assessments/${a._id}`,
    });
    // Also notify the candidate themselves — passing earns a verified badge
    // on their profile, so surface it in their inbox.
    await notify(ctx, {
      userId,
      kind: "assessment",
      title: passed
        ? `You passed "${a.title}" — verified ${a.skill} badge earned`
        : `Assessment "${a.title}" scored ${score}% (pass ≥ ${a.passingScore}%)`,
      link: "/candidate/assessments",
    });
    return { score, passed };
  },
});

export const getMyAttempts = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const rows = await ctx.db
      .query("assessmentAttempts")
      .withIndex("by_candidate", (q) => q.eq("candidateId", userId))
      .order("desc")
      .collect();
    return await Promise.all(
      rows.map(async (att) => {
        const a = await ctx.db.get(att.assessmentId);
        return { ...att, assessment: a };
      })
    );
  },
});

/** Public — for badges on candidate profiles. */
export const getPassedAssessmentsForUser = query({
  args: { candidateId: v.id("users") },
  handler: async (ctx, args) => {
    const attempts = await ctx.db
      .query("assessmentAttempts")
      .withIndex("by_candidate", (q) => q.eq("candidateId", args.candidateId))
      .collect();
    const passed = attempts.filter((a) => a.passed);
    return await Promise.all(
      passed.map(async (att) => {
        const a = await ctx.db.get(att.assessmentId);
        return {
          skill: a?.skill ?? "",
          title: a?.title ?? "",
          score: att.score ?? 0,
          when: att.submittedAt ?? att.startedAt,
        };
      })
    );
  },
});
