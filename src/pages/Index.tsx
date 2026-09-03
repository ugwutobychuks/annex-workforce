import { SignInButton } from "@/components/ui/signin.tsx";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { motion } from "motion/react";

function AuthenticatedRedirect() {
  const user = useQuery(api.users.getCurrentUser);
  const navigate = useNavigate();

  useEffect(() => {
    if (user === undefined) return;
    if (!user) return;
    if (!user.role) {
      navigate("/onboarding/role");
    } else if (user.role === "candidate") {
      navigate("/candidate");
    } else if (user.role === "employer") {
      navigate("/employer");
    } else if (user.role === "admin") {
      navigate("/admin");
    }
  }, [user, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <Skeleton className="h-8 w-48" />
    </div>
  );
}

export default function Index() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[oklch(0.15_0.03_240)] via-[oklch(0.2_0.04_240)] to-[oklch(0.13_0.02_240)] text-white relative overflow-hidden">
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `linear-gradient(oklch(0.6_0.15_240) 1px, transparent 1px), linear-gradient(90deg, oklch(0.6_0.15_240) 1px, transparent 1px)`,
          backgroundSize: "64px 64px",
        }}
      />
      <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full bg-[oklch(0.45_0.18_240)] opacity-10 blur-3xl" />
      <div className="absolute bottom-[-10%] left-[-5%] w-[400px] h-[400px] rounded-full bg-[oklch(0.5_0.2_200)] opacity-10 blur-3xl" />

      <nav className="relative z-10 flex items-center justify-between px-6 py-5 max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[oklch(0.55_0.18_240)] flex items-center justify-center font-bold text-sm">
            AW
          </div>
          <span className="font-bold text-lg tracking-tight">Annex Workforce</span>
        </div>
        <Unauthenticated>
          <SignInButton className="bg-white/10 hover:bg-white/20 text-white border border-white/20 backdrop-blur-sm" />
        </Unauthenticated>
      </nav>

      <div className="relative z-10 max-w-5xl mx-auto px-6 pt-16 pb-32 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-[oklch(0.45_0.18_240)]/30 border border-[oklch(0.55_0.18_240)]/40 text-[oklch(0.8_0.1_240)] mb-6">
            Trusted Talent Infrastructure for Africa
          </span>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-balance leading-[1.1] mb-6">
            Hire, Manage &{" "}
            <span className="text-[oklch(0.7_0.18_240)]">Pay</span> African
            <br />
            Talent — Compliantly
          </h1>
          <p className="text-lg md:text-xl text-white/60 max-w-2xl mx-auto text-balance mb-10">
            Verified talent marketplace, employer-of-record, and integrated HRMS in one
            platform. Built for Nigerian compliance from the ground up.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Unauthenticated>
              <SignInButton className="bg-[oklch(0.55_0.18_240)] hover:bg-[oklch(0.5_0.18_240)] text-white px-8 py-3 rounded-lg font-semibold text-base border-0" />
            </Unauthenticated>
            <AuthLoading>
              <Skeleton className="h-12 w-36 rounded-lg" />
            </AuthLoading>
            <Authenticated>
              <AuthenticatedRedirect />
            </Authenticated>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }}
          className="flex flex-wrap justify-center gap-3 mt-16"
        >
          {[
            "Identity Verification",
            "Nigerian Payroll (PAYE/Pension/NHF)",
            "EOR Contracts",
            "Talent Marketplace",
            "HRMS",
            "Leave Management",
          ].map((feature) => (
            <span
              key={feature}
              className="px-4 py-2 rounded-full text-sm bg-white/5 border border-white/10 text-white/70"
            >
              {feature}
            </span>
          ))}
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.5 }}
        className="relative z-10 max-w-4xl mx-auto px-6 pb-24"
      >
        <div className="grid grid-cols-3 gap-6 text-center">
          {[
            { value: "10K+", label: "Verified Talents" },
            { value: "500+", label: "Employers" },
            { value: "₦2B+", label: "Payroll Processed" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm"
            >
              <div className="text-3xl font-bold text-[oklch(0.75_0.18_240)]">{stat.value}</div>
              <div className="text-sm text-white/50 mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
