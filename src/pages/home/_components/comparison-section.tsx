import { motion } from "motion/react";

const COMPETITORS = [
  {
    platform: "Andela",
    strength: "Developer training and placement, strong brand",
    edge: "No training overhead, broader skills, faster and cheaper",
  },
  {
    platform: "Deel",
    strength: "Global EOR, clean product, strong funding",
    edge: "Africa-specific compliance, local trust, local currency payroll",
  },
  {
    platform: "Remote.com",
    strength: "Global EOR and benefits management",
    edge: "Africa-first, faster onboarding, local human support",
  },
  {
    platform: "Jobberman",
    strength: "Strong Nigerian brand, large candidate database",
    edge: "Verified candidates, EOR, integrated HR \u2014 not just job ads",
  },
  {
    platform: "LinkedIn",
    strength: "Global reach and professional network",
    edge: "Africa-specific verification, managed hiring, compliance",
  },
] as const;

export default function ComparisonSection() {
  return (
    <section className="bg-background py-20 lg:py-28">
      <div className="mx-auto w-full max-w-6xl px-5">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Positioning
          </p>
          <h2 className="text-balance pt-4 font-serif text-3xl font-bold tracking-tight sm:text-4xl">
            Where Annex wins
          </h2>
        </div>

        <div className="overflow-hidden rounded-md border border-border pt-0 mt-12">
          <div className="hidden grid-cols-3 gap-4 bg-primary px-6 py-4 text-xs font-semibold uppercase tracking-[0.14em] text-primary-foreground md:grid">
            <span>Platform</span>
            <span>What they do well</span>
            <span>Where Annex wins</span>
          </div>
          {COMPETITORS.map((row, index) => (
            <motion.div
              key={row.platform}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true, amount: 0.5 }}
              transition={{ duration: 0.35, delay: index * 0.05, ease: "easeOut" }}
              className="grid gap-2 border-t border-border bg-card px-6 py-5 text-sm md:grid-cols-3 md:gap-4"
            >
              <span className="font-semibold">{row.platform}</span>
              <span className="text-muted-foreground">{row.strength}</span>
              <span className="text-foreground/85">{row.edge}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
