/**
 * LLM adapters. Provider is picked from ANTHROPIC_API_KEY availability:
 * if set → real Anthropic; otherwise → stub that returns deterministic
 * canned text so local dev works without a key.
 */

const STUB = "stub" as const;
const ANTHROPIC = "anthropic" as const;
type Provider = typeof STUB | typeof ANTHROPIC;

export function pickAiProvider(): Provider {
  return process.env.ANTHROPIC_API_KEY ? ANTHROPIC : STUB;
}

async function anthropicChat(system: string, user: string): Promise<string> {
  const key = process.env.ANTHROPIC_API_KEY!;
  const model = process.env.ANTHROPIC_MODEL || "claude-3-5-sonnet-latest";
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 1024,
      system,
      messages: [{ role: "user", content: user }],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic ${res.status}: ${await res.text()}`);
  const json = (await res.json()) as { content: Array<{ type: string; text?: string }> };
  return json.content?.map((b) => b.text ?? "").join("") ?? "";
}

// ── JD writer ────────────────────────────────────────────────────────────────

export type JdInput = {
  title: string;
  skills: string[];
  location: string;
  type: string;
  salary?: string;
  company?: string;
};

export async function generateJobDescription(input: JdInput): Promise<{ description: string; requirements: string }> {
  const provider = pickAiProvider();
  if (provider === STUB) {
    return {
      description: [
        `We're hiring a ${input.title}${input.company ? ` at ${input.company}` : ""} — ${input.type} in ${input.location}.`,
        ``,
        `You'll own real work in ${input.skills.slice(0, 3).join(", ")}${input.skills.length > 3 ? " and adjacent areas" : ""}. Expect autonomy, tight feedback loops, and a small team where your work is visible.`,
      ].join("\n"),
      requirements: [
        `${input.skills[0] ?? "Relevant"} experience in a shipping context.`,
        `Comfort with ambiguity; you can pick a direction from a fuzzy brief and defend it.`,
        `Strong written communication.`,
        input.skills.length > 1 ? `Bonus: ${input.skills.slice(1).join(", ")}.` : "",
      ].filter(Boolean).join("\n"),
    };
  }
  const system = `You write short, honest job descriptions for African talent marketplaces. No fluff. Use plain sentences.`;
  const user = `Return JSON with two fields "description" and "requirements".
Job: ${input.title}
Type: ${input.type}
Location: ${input.location}
${input.salary ? `Salary: ${input.salary}\n` : ""}Skills: ${input.skills.join(", ") || "n/a"}
Description should be 3-4 short paragraphs.
Requirements should be 4-6 bullet-style lines separated by newlines.`;
  const out = await anthropicChat(system, user);
  try {
    const jsonMatch = out.match(/\{[\s\S]*\}/);
    const obj = JSON.parse(jsonMatch ? jsonMatch[0] : out);
    return {
      description: String(obj.description ?? ""),
      requirements: String(obj.requirements ?? ""),
    };
  } catch {
    return { description: out, requirements: "" };
  }
}

// ── Resume parser ────────────────────────────────────────────────────────────

export type ParsedResume = {
  headline: string;
  bio: string;
  skills: string[];
};

export async function parseResume(text: string): Promise<ParsedResume> {
  const provider = pickAiProvider();
  if (provider === STUB) {
    // Heuristic: pull skills as any capitalised or hyphenated tokens > 2 chars.
    const words = Array.from(new Set(
      text.split(/[^A-Za-z0-9+#.\-]+/).filter((w) => w.length >= 2 && /[A-Za-z]/.test(w))
    ));
    // Prefer known-looking tech words if present
    const knownList = ["React","TypeScript","Node","Python","Go","Java","Kotlin","Swift","SQL","Postgres","Kafka","Kubernetes","AWS","GCP","Figma","Product","Design","Analytics","SEO","Marketing","Sales","Payroll","KYC","AML","Compliance"];
    const skills = words.filter((w) => knownList.some((k) => k.toLowerCase() === w.toLowerCase())).slice(0, 10);
    return {
      headline: text.split(/\n/)[0]?.slice(0, 120).trim() || "Experienced professional",
      bio: text.slice(0, 400).trim(),
      skills: skills.length > 0 ? skills : ["Product", "Communication"],
    };
  }
  const system = `You extract structured resume data. Return strict JSON only.`;
  const user = `Return JSON with keys "headline" (string), "bio" (short professional summary, 1-2 sentences), "skills" (array of concise skill tags).

Resume:
${text.slice(0, 8000)}`;
  const out = await anthropicChat(system, user);
  try {
    const jsonMatch = out.match(/\{[\s\S]*\}/);
    const obj = JSON.parse(jsonMatch ? jsonMatch[0] : out);
    return {
      headline: String(obj.headline ?? "").slice(0, 120),
      bio: String(obj.bio ?? "").slice(0, 500),
      skills: Array.isArray(obj.skills)
        ? obj.skills.map(String).slice(0, 20)
        : [],
    };
  } catch {
    return { headline: "", bio: out.slice(0, 500), skills: [] };
  }
}

// ── Candidate → job matcher (deterministic, no LLM required) ─────────────────
// This is a simple cosine-ish overlap between job skills and candidate skills,
// weighted by headline keyword overlap. Deterministic + fast + works offline.

export function scoreMatch(job: { skills: string[]; title: string }, candidate: { skills?: string[]; headline?: string }): number {
  const jSkills = new Set(job.skills.map((s) => s.toLowerCase()));
  const cSkills = new Set((candidate.skills ?? []).map((s) => s.toLowerCase()));
  let overlap = 0;
  for (const s of cSkills) if (jSkills.has(s)) overlap++;
  const denom = Math.max(1, jSkills.size);
  const skillScore = overlap / denom; // 0..1
  const titleTokens = new Set(job.title.toLowerCase().split(/\s+/));
  const headlineTokens = new Set((candidate.headline ?? "").toLowerCase().split(/\s+/));
  let hOverlap = 0;
  for (const t of headlineTokens) if (titleTokens.has(t)) hOverlap++;
  const headlineScore = titleTokens.size === 0 ? 0 : hOverlap / titleTokens.size;
  return Math.round((skillScore * 0.75 + headlineScore * 0.25) * 100);
}
