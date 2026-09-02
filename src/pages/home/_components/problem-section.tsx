import { motion } from "motion/react";
import {
  BadgeCheck,
  Clock,
  FileWarning,
  Layers,
  ScaleIcon,
} from "lucide-react";

const PROBLEMS = [
  {
    icon: BadgeCheck,
    problem: "No candidate verification",
    impact: "Employers cannot trust resumes or credentials, so bad hires cost them dearly.",
  },
  {
    icon: ScaleIcon,
    problem: "No compliance infrastructure",
    impact: "Foreign companies avoid hiring in Africa because of legal and payroll complexity.",
  },
  {
    icon: Layers,
    problem: "Fragmented HR operations",
    impact: "Companies juggle three to five separate tools for payroll, leave, and records.",
  },
  {
    icon: Clock,
    problem: "Slow, manual hiring",
    impact: "Time to hire in Nigeria runs 6\u201310 weeks, against 2\u20133 weeks globally.",
  },
  {
    icon: FileWarning,
    problem: "No EOR built for Africa",
    impact: "Global providers serve global markets but miss Africa-specific compliance.",
  },
] as const;

export default function ProblemSection() {
  return (
    <section className="bg-background py-20 lg:py-28">
      <div className="mx-auto w-full max-w-6xl px-5">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            The trust gap
          </p>
          <h2 className="text-balance pt-4 font-serif text-3xl font-bold tracking-tight sm:text-4xl">
            African talent is ready. The infrastructure is not.
          </h2>
          <p className="pt-4 text-base leading-relaxed text-muted-foreground">
            Five interconnected problems keep companies from hiring across the
            continent at scale. No single existing platform solves them together.
          </p>
        </div>

        <div className="grid gap-4 pt-12 md:grid-cols-2 lg:grid-cols-3">
          {PROBLEMS.map((item, index) => (
            <motion.div
              key={item.problem}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.45, delay: index * 0.06, ease: "easeOut" }}
              className="rounded-md border border-border bg-card p-6"
            >
              <item.icon className="size-5 text-accent" />
              <h3 className="pt-4 font-semibold">{item.problem}</h3>
              <p className="pt-2 text-sm leading-relaxed text-muted-foreground">
                {item.impact}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
