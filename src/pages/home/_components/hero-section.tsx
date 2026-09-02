import { motion } from "motion/react";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button.tsx";

const HERO_IMAGE = "https://hercules-cdn.com/file_ulBzL4q9gfnBTdYng5i3OcYU";

const STATS = [
  { value: "2\u20133 wks", label: "Time to hire" },
  { value: "100%", label: "Identity verified" },
  { value: "NGN", label: "Local payroll" },
] as const;

export default function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-sidebar text-sidebar-foreground">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.16]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 15% 20%, oklch(0.8 0.12 82) 0, transparent 45%), radial-gradient(circle at 85% 70%, oklch(0.55 0.1 232) 0, transparent 50%)",
        }}
      />
      <div className="relative mx-auto grid w-full max-w-6xl gap-14 px-5 py-20 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:py-28">
        <div>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="inline-flex items-center gap-2 rounded-full border border-sidebar-border bg-sidebar-accent/60 px-3.5 py-1.5 text-xs font-medium uppercase tracking-[0.16em] text-sidebar-primary"
          >
            <ShieldCheck className="size-3.5" />
            Africa-first talent infrastructure
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.08, ease: "easeOut" }}
            className="max-w-2xl text-balance pt-6 font-serif text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl"
          >
            Hire, manage, and pay African talent
            <span className="text-sidebar-primary"> without the risk</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.16, ease: "easeOut" }}
            className="max-w-xl text-pretty pt-6 text-base leading-relaxed text-sidebar-foreground/75 sm:text-lg"
          >
            Verified talent, employer-of-record compliance, and a full HR system
            in one platform. Built for the African context, ready for global
            hiring.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.24, ease: "easeOut" }}
            className="flex flex-col gap-3 pt-9 sm:flex-row"
          >
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
          </motion.div>

          <motion.dl
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.36, ease: "easeOut" }}
            className="mt-12 grid max-w-lg grid-cols-3 gap-6 border-t border-sidebar-border pt-8"
          >
            {STATS.map((stat) => (
              <div key={stat.label}>
                <dt className="font-serif text-2xl font-bold text-sidebar-primary">
                  {stat.value}
                </dt>
                <dd className="pt-1 text-xs uppercase tracking-[0.12em] text-sidebar-foreground/60">
                  {stat.label}
                </dd>
              </div>
            ))}
          </motion.dl>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.15, ease: "easeOut" }}
          className="relative"
        >
          <div className="overflow-hidden rounded-md border border-sidebar-border shadow-2xl">
            <img
              src={HERO_IMAGE}
              alt="African professionals collaborating in a modern office"
              className="aspect-[4/3] w-full object-cover"
            />
          </div>
          <div className="absolute -bottom-5 left-5 right-5 rounded-md border border-sidebar-border bg-sidebar/95 p-4 backdrop-blur-sm sm:left-8 sm:right-auto sm:w-72">
            <p className="text-xs uppercase tracking-[0.16em] text-sidebar-primary">
              Verified profile
            </p>
            <p className="pt-2 text-sm text-sidebar-foreground/80">
              Identity, credentials, and employment history checked before any
              employer sees a candidate.
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
