"use node";

import { v, ConvexError } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";
import { generateJobDescription, parseResume, scoreMatch } from "./lib/ai";

export const writeJobDescription = action({
  args: {
    title: v.string(),
    skills: v.array(v.string()),
    location: v.string(),
    type: v.string(),
    salary: v.optional(v.string()),
    company: v.optional(v.string()),
  },
  handler: async (_ctx, args): Promise<{ description: string; requirements: string }> => {
    if (!args.title) throw new ConvexError({ message: "Title is required", code: "BAD" });
    return await generateJobDescription({
      title: args.title,
      skills: args.skills,
      location: args.location,
      type: args.type,
      salary: args.salary,
      company: args.company,
    });
  },
});

export const parseResumeText = action({
  args: { text: v.string() },
  handler: async (_ctx, args): Promise<{ headline: string; bio: string; skills: string[] }> => {
    const t = args.text.trim();
    if (t.length < 40) throw new ConvexError({ message: "Paste more resume text", code: "BAD" });
    return await parseResume(t);
  },
});

/**
 * Ranks candidates for a given job. Uses a deterministic skill/title overlap
 * score (no LLM required). Employers only; only candidates whose profile
 * lists at least one skill are considered.
 */
export const matchCandidates = action({
  args: { jobId: v.id("jobs"), limit: v.optional(v.number()) },
  handler: async (ctx, args): Promise<Array<{ candidateId: string; name?: string; headline?: string; score: number; skills: string[] }>> => {
    const currentUser = await ctx.runQuery(api.users.getCurrentUser, {});
    if (!currentUser || currentUser.role !== "employer")
      throw new ConvexError({ message: "Employer only", code: "FORBIDDEN" });

    const job = await ctx.runQuery(api.jobs.getById, { id: args.jobId });
    if (!job) throw new ConvexError({ message: "Job not found", code: "NOT_FOUND" });

    const pool = await ctx.runQuery(api.employer.searchTalentPool, {
      paginationOpts: { numItems: 200, cursor: null },
    });
    const limit = args.limit ?? 10;
    const scored = pool.page
      .map((row) => {
        const s = scoreMatch(job, {
          skills: row.profile?.skills ?? [],
          headline: row.profile?.headline,
        });
        return {
          candidateId: row.user._id as string,
          name: row.user.name,
          headline: row.profile?.headline,
          skills: row.profile?.skills ?? [],
          score: s,
        };
      })
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
    return scored;
  },
});
