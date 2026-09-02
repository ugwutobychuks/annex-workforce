import { motion } from "motion/react";
import { Building2, Check, Search, UsersRound } from "lucide-react";

const PILLARS = [
  {
    id: "marketplace",
    eyebrow: "Pillar One",
    icon: Search,
    title: "Verified Talent Marketplace",
    blurb:
      "A curated, skill-indexed pool of pre-verified African talent that employers can hire with confidence.",
    points: [
      "Document and biometric identity verification (NIN, passport)",
      "Third-party checks on degrees and professional certifications",
      "Skill assessments per role category, automated and human-reviewed",
      "Smart filters: location, salary band, skill stack, experience level",
    ],
  },
  {
    id: "eor",
    eyebrow: "Pillar Two",
    icon: Building2,
    title: "Managed Hiring / Employer of Record",
    blurb:
      "Hire in Africa without setting up a local entity. Annex becomes the legal employer while you keep full management control.",
    points: [
      "Employment contracts drafted and administered digitally",
      "Monthly payroll in local currency with automated remittances",
      "Statutory deductions handled: PAYE, pension, and NHF",
      "Compliance certificates and managed service reporting",
    ],
  },
  {
    id: "hrms",
    eyebrow: "Pillar Three",
    icon: UsersRound,
    title: "Integrated HR Management",
    blurb:
      "A daily operational tool, not a one-time hiring service. Everything your HR team needs after the offer is signed.",
    points: [
      "Payroll engine with multi-currency and statutory compliance",
      "Leave and absence management with approval workflows",
      "Performance: OKR tracking, review cycles, 360 feedback",
      "Digital employee records with role-based access control",
    ],
  },
] as const;

export default function PillarsSection() {
  return (
    <section className="border-y border-border bg-secondary/40 py-20 lg:py-28">
      <div className="mx-auto w-full max-w-6xl px-5">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            The platform
          </p>
          <h2 className="text-balance pt-4 font-serif text-3xl font-bold tracking-tight sm:text-4xl">
            Three pillars on a single backbone
          </h2>
          <p className="pt-4 text-base leading-relaxed text-muted-foreground">
            Each pillar stands alone. Together they become infrastructure your
            company runs on every day.
          </p>
        </div>

        <div className="flex flex-col gap-6 pt-12">
          {PILLARS.map((pillar, index) => (
            <motion.article
              key={pillar.id}
              id={pillar.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.25 }}
              transition={{ duration: 0.5, delay: index * 0.05, ease: "easeOut" }}
              className="scroll-mt-24 rounded-md border border-border bg-card p-7 lg:p-9"
            >
              <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
                <div>
                  <div className="flex items-center gap-3">
                    <span className="flex size-10 items-center justify-center rounded-sm bg-primary text-primary-foreground">
                      <pillar.icon className="size-5" />
                    </span>
                    <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      {pillar.eyebrow}
                    </span>
                  </div>
                  <h3 className="pt-5 font-serif text-2xl font-bold tracking-tight">
                    {pillar.title}
                  </h3>
                  <p className="pt-3 text-sm leading-relaxed text-muted-foreground">
                    {pillar.blurb}
                  </p>
                </div>

                <ul className="flex flex-col gap-3 lg:border-l lg:border-border lg:pl-8">
                  {pillar.points.map((point) => (
                    <li key={point} className="flex gap-3 text-sm">
                      <Check className="mt-0.5 size-4 shrink-0 text-accent" />
                      <span className="text-foreground/85">{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
