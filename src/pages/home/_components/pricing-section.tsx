import { motion } from "motion/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button.tsx";

const PLANS = [
  {
    name: "Placement",
    price: "15\u201320%",
    unit: "of first-year salary",
    summary: "Pay only when you successfully hire from the verified marketplace.",
    features: [
      "Unlimited talent search",
      "Verified profiles and assessments",
      "Application pipeline tracking",
      "Included background check tier",
    ],
    featured: false,
  },
  {
    name: "Managed hiring (EOR)",
    price: "$150\u2013400",
    unit: "per employee / month",
    summary: "We become the legal employer so you can hire without a local entity.",
    features: [
      "Employment contracts and onboarding",
      "Local currency payroll with remittances",
      "PAYE, pension, and NHF handled",
      "Compliance certificates and reporting",
    ],
    featured: true,
  },
  {
    name: "HR platform",
    price: "$20\u201360",
    unit: "per employee / month",
    summary: "The full HR system for teams you already employ directly.",
    features: [
      "Leave and absence workflows",
      "Payroll and payslips",
      "Performance and OKR reviews",
      "Employee records and documents",
    ],
    featured: false,
  },
] as const;

export default function PricingSection() {
  return (
    <section
      id="pricing"
      className="scroll-mt-20 border-y border-border bg-secondary/40 py-20 lg:py-28"
    >
      <div className="mx-auto w-full max-w-6xl px-5">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Commercials
          </p>
          <h2 className="text-balance pt-4 font-serif text-3xl font-bold tracking-tight sm:text-4xl">
            Pay for outcomes, then for infrastructure
          </h2>
        </div>

        <div className="grid gap-5 pt-12 lg:grid-cols-3">
          {PLANS.map((plan, index) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.45, delay: index * 0.07, ease: "easeOut" }}
              className={
                plan.featured
                  ? "flex flex-col rounded-md border border-accent bg-sidebar p-7 text-sidebar-foreground shadow-xl"
                  : "flex flex-col rounded-md border border-border bg-card p-7"
              }
            >
              <p
                className={
                  plan.featured
                    ? "text-xs font-semibold uppercase tracking-[0.16em] text-sidebar-primary"
                    : "text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground"
                }
              >
                {plan.name}
              </p>
              <p className="pt-5 font-serif text-3xl font-bold tracking-tight">
                {plan.price}
              </p>
              <p
                className={
                  plan.featured
                    ? "pt-1 text-sm text-sidebar-foreground/70"
                    : "pt-1 text-sm text-muted-foreground"
                }
              >
                {plan.unit}
              </p>
              <p
                className={
                  plan.featured
                    ? "pt-5 text-sm leading-relaxed text-sidebar-foreground/80"
                    : "pt-5 text-sm leading-relaxed text-muted-foreground"
                }
              >
                {plan.summary}
              </p>

              <ul className="flex flex-1 flex-col gap-2.5 pt-6 text-sm">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex gap-2.5">
                    <span
                      className={
                        plan.featured
                          ? "mt-1.5 size-1.5 shrink-0 rounded-full bg-sidebar-primary"
                          : "mt-1.5 size-1.5 shrink-0 rounded-full bg-accent"
                      }
                    />
                    <span
                      className={
                        plan.featured
                          ? "text-sidebar-foreground/85"
                          : "text-foreground/85"
                      }
                    >
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>

              <Button
                className={
                  plan.featured
                    ? "mt-8 w-full cursor-pointer bg-accent text-accent-foreground hover:bg-accent/90"
                    : "mt-8 w-full cursor-pointer"
                }
                variant={plan.featured ? "default" : "secondary"}
                onClick={() =>
                  toast.info("Plan selection is coming soon in a future milestone!")
                }
              >
                Talk to sales
              </Button>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
