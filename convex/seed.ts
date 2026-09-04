import { mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Development-only seed. Adds a demo employer + a handful of published jobs
 * so the public /jobs marketplace has something to render on a fresh local
 * install. Idempotent: re-running it does nothing when the demo employer
 * already exists.
 *
 * Invoke with: npx convex run seed:demoJobs
 */
export const demoJobs = mutation({
  args: {},
  handler: async (ctx) => {
    const email = "demo-employer@annex.local";
    const existing = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", email))
      .unique();
    if (existing) return { skipped: true, employerId: existing._id };

    const employerId = await ctx.db.insert("users", {
      name: "Zango Technologies",
      email,
      role: "employer",
      onboardingComplete: true,
    });

    await ctx.db.insert("companyProfiles", {
      employerId,
      name: "Zango Technologies",
      industry: "Technology",
      size: "51-200",
      website: "https://example.com",
      location: "Lagos, Nigeria",
      description:
        "We build payments infrastructure for African merchants. Remote-friendly, engineering-led.",
      isVerified: true,
    });

    const jobs: Array<{
      title: string;
      location: string;
      type: "full-time" | "part-time" | "contract" | "internship";
      salary?: string;
      description: string;
      requirements: string;
      skills: string[];
    }> = [
      {
        title: "Senior Backend Engineer (Go)",
        location: "Lagos, Nigeria (remote)",
        type: "full-time",
        salary: "₦850k–₦1.4M / month",
        description:
          "Design and build the core payments engine. You'll work across gateway integrations, idempotency, and reconciliation.",
        requirements:
          "5+ years Go or similar. Strong SQL. Experience with payments, high-throughput systems, or fintech is a bonus.",
        skills: ["Go", "PostgreSQL", "Kafka", "gRPC", "Kubernetes"],
      },
      {
        title: "Product Designer",
        location: "Remote (Africa)",
        type: "full-time",
        salary: "₦600k–₦900k / month",
        description:
          "Own the design of merchant-facing dashboards and mobile flows. Ship weekly, collaborate with engineering.",
        requirements:
          "3+ years product design. Portfolio of shipped B2B or fintech work. Figma fluency required.",
        skills: ["Figma", "Product Design", "Prototyping", "Design Systems"],
      },
      {
        title: "Frontend Engineer",
        location: "Nairobi, Kenya",
        type: "contract",
        salary: "$50/hr",
        description:
          "6-month contract to help ship the merchant onboarding revamp. React + TypeScript stack.",
        requirements:
          "3+ years React. Comfortable with design tokens and accessibility. Bonus: Convex or Firebase experience.",
        skills: ["React", "TypeScript", "Tailwind", "Vite"],
      },
      {
        title: "Compliance Analyst (KYC)",
        location: "Abuja, Nigeria",
        type: "full-time",
        description:
          "Own the merchant onboarding and periodic KYC review pipeline. Interface with regulators and internal ops.",
        requirements:
          "2+ years compliance or AML/KYC operations. Familiarity with CBN circulars and Nigerian data-protection law.",
        skills: ["KYC", "AML", "Compliance", "Risk"],
      },
      {
        title: "Internship — Data Analytics",
        location: "Lagos, Nigeria",
        type: "internship",
        salary: "₦180k / month",
        description:
          "3-month paid internship on the analytics team. You'll help build dashboards for merchant success.",
        requirements:
          "Comfortable with SQL and one BI tool. Basic Python a plus. Recent grad or final-year student.",
        skills: ["SQL", "Analytics", "Python"],
      },
    ];

    for (const j of jobs) {
      await ctx.db.insert("jobs", {
        employerId,
        company: "Zango Technologies",
        status: "published",
        ...j,
      });
    }

    return { skipped: false, employerId, jobs: jobs.length };
  },
});

/**
 * Wipes the demo employer, their company profile, their jobs, and any
 * applications to those jobs. Any candidate accounts / real users are left
 * alone. Invoke with: npx convex run seed:resetDemo
 *
 * Pair with demoJobs to fully reset the marketplace fixture:
 *   npx convex run seed:resetDemo
 *   npx convex run seed:demoJobs
 *
 * Pass `alsoReseed: true` to do both in one call:
 *   npx convex run seed:resetDemo '{"alsoReseed": true}'
 */
export const resetDemo = mutation({
  args: { alsoReseed: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    const email = "demo-employer@annex.local";
    const employer = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", email))
      .unique();
    if (!employer) return { removed: 0, reseeded: false };

    const jobs = await ctx.db
      .query("jobs")
      .withIndex("by_employer", (q) => q.eq("employerId", employer._id))
      .collect();
    let removedApps = 0;
    for (const job of jobs) {
      const apps = await ctx.db
        .query("applications")
        .withIndex("by_job", (q) => q.eq("jobId", job._id))
        .collect();
      for (const a of apps) {
        await ctx.db.delete(a._id);
        removedApps++;
      }
      await ctx.db.delete(job._id);
    }

    const company = await ctx.db
      .query("companyProfiles")
      .withIndex("by_employer", (q) => q.eq("employerId", employer._id))
      .unique();
    if (company) await ctx.db.delete(company._id);

    await ctx.db.delete(employer._id);

    // Optional convenience: re-seed in the same call by re-inserting the
    // same fixture as demoJobs. We inline it (not call the other mutation)
    // because Convex mutations can't invoke other mutations directly.
    let reseeded = 0;
    if (args.alsoReseed) {
      const employerId = await ctx.db.insert("users", {
        name: "Zango Technologies",
        email,
        role: "employer",
        onboardingComplete: true,
      });
      await ctx.db.insert("companyProfiles", {
        employerId,
        name: "Zango Technologies",
        industry: "Technology",
        size: "51-200",
        website: "https://example.com",
        location: "Lagos, Nigeria",
        description:
          "We build payments infrastructure for African merchants. Remote-friendly, engineering-led.",
        isVerified: true,
      });
      const fixtures = FIXTURE_JOBS;
      for (const j of fixtures) {
        await ctx.db.insert("jobs", {
          employerId,
          company: "Zango Technologies",
          status: "published",
          ...j,
        });
      }
      reseeded = fixtures.length;
    }

    return {
      removed: jobs.length + (company ? 1 : 0) + 1,
      removedApplications: removedApps,
      reseeded,
    };
  },
});

const FIXTURE_JOBS: Array<{
  title: string;
  location: string;
  type: "full-time" | "part-time" | "contract" | "internship";
  salary?: string;
  description: string;
  requirements: string;
  skills: string[];
}> = [
  {
    title: "Senior Backend Engineer (Go)",
    location: "Lagos, Nigeria (remote)",
    type: "full-time",
    salary: "₦850k–₦1.4M / month",
    description:
      "Design and build the core payments engine. You'll work across gateway integrations, idempotency, and reconciliation.",
    requirements:
      "5+ years Go or similar. Strong SQL. Experience with payments, high-throughput systems, or fintech is a bonus.",
    skills: ["Go", "PostgreSQL", "Kafka", "gRPC", "Kubernetes"],
  },
  {
    title: "Product Designer",
    location: "Remote (Africa)",
    type: "full-time",
    salary: "₦600k–₦900k / month",
    description:
      "Own the design of merchant-facing dashboards and mobile flows. Ship weekly, collaborate with engineering.",
    requirements:
      "3+ years product design. Portfolio of shipped B2B or fintech work. Figma fluency required.",
    skills: ["Figma", "Product Design", "Prototyping", "Design Systems"],
  },
  {
    title: "Frontend Engineer",
    location: "Nairobi, Kenya",
    type: "contract",
    salary: "$50/hr",
    description:
      "6-month contract to help ship the merchant onboarding revamp. React + TypeScript stack.",
    requirements:
      "3+ years React. Comfortable with design tokens and accessibility. Bonus: Convex or Firebase experience.",
    skills: ["React", "TypeScript", "Tailwind", "Vite"],
  },
  {
    title: "Compliance Analyst (KYC)",
    location: "Abuja, Nigeria",
    type: "full-time",
    description:
      "Own the merchant onboarding and periodic KYC review pipeline. Interface with regulators and internal ops.",
    requirements:
      "2+ years compliance or AML/KYC operations. Familiarity with CBN circulars and Nigerian data-protection law.",
    skills: ["KYC", "AML", "Compliance", "Risk"],
  },
  {
    title: "Internship — Data Analytics",
    location: "Lagos, Nigeria",
    type: "internship",
    salary: "₦180k / month",
    description:
      "3-month paid internship on the analytics team. You'll help build dashboards for merchant success.",
    requirements:
      "Comfortable with SQL and one BI tool. Basic Python a plus. Recent grad or final-year student.",
    skills: ["SQL", "Analytics", "Python"],
  },
];
