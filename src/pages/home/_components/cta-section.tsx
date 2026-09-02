import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button.tsx";

export default function CtaSection() {
  return (
    <section className="bg-background py-20 lg:py-28">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="mx-auto w-full max-w-6xl px-5"
      >
        <div className="relative overflow-hidden rounded-md border border-sidebar-border bg-sidebar px-7 py-14 text-center text-sidebar-foreground lg:px-16 lg:py-20">
          <div
            className="pointer-events-none absolute inset-0 opacity-20"
            style={{
              backgroundImage:
                "radial-gradient(circle at 50% 0%, oklch(0.8 0.12 82) 0, transparent 60%)",
            }}
          />
          <div className="relative">
            <h2 className="text-balance mx-auto max-w-2xl font-serif text-3xl font-bold tracking-tight sm:text-4xl">
              Build your African team on infrastructure you can trust
            </h2>
            <p className="mx-auto max-w-xl pt-5 text-base leading-relaxed text-sidebar-foreground/75">
              Whether you are a Lagos startup or a Silicon Valley firm hiring
              remotely, Annex handles verification, compliance, and payroll.
            </p>
            <div className="flex flex-col justify-center gap-3 pt-9 sm:flex-row">
              <Button
                size="lg"
                className="cursor-pointer bg-accent text-accent-foreground hover:bg-accent/90"
                onClick={() =>
                  toast.info("Employer onboarding is coming soon in a future milestone!")
                }
              >
                Start hiring
                <ArrowRight className="size-4" />
              </Button>
              <Button
                size="lg"
                variant="ghost"
                className="cursor-pointer border border-sidebar-border text-sidebar-foreground hover:bg-sidebar-accent"
                onClick={() =>
                  toast.info("Talent onboarding is coming soon in a future milestone!")
                }
              >
                Join as talent
              </Button>
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
