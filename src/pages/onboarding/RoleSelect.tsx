import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Authenticated, Unauthenticated } from "convex/react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { motion } from "motion/react";
import { SignInButton } from "@/components/ui/signin.tsx";
import { BriefcaseIcon, UserIcon } from "lucide-react";

function RoleSelectInner() {
  const user = useQuery(api.users.getCurrentUser);
  const setRole = useMutation(api.users.setRole);
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const nextRaw = params.get("next");
  const next = nextRaw && nextRaw.startsWith("/") ? nextRaw : null;

  const roleHome = (role: "candidate" | "employer" | "admin") =>
    role === "candidate" ? "/candidate" : role === "employer" ? "/employer" : "/admin";

  if (user?.role) {
    // If they already have a role, honor `next` (e.g. the job they were about
    // to apply to) — but only if it's an in-app path; otherwise their dashboard.
    navigate(next ?? roleHome(user.role));
    return null;
  }

  const handleSelect = async (role: "candidate" | "employer") => {
    try {
      await setRole({ role });
      navigate(next ?? roleHome(role));
    } catch {
      toast.error("Failed to set role. Please try again.");
    }
  };

  const options = [
    {
      role: "candidate" as const,
      icon: UserIcon,
      title: "I'm looking for work",
      description: "Create a profile, showcase your skills, apply to jobs, and get paid — all in one place.",
      color: "oklch(0.55_0.18_240)",
    },
    {
      role: "employer" as const,
      icon: BriefcaseIcon,
      title: "I'm hiring talent",
      description: "Post jobs, manage applicants, hire with EOR contracts, and run payroll compliantly.",
      color: "oklch(0.55_0.15_200)",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[oklch(0.15_0.03_240)] to-[oklch(0.13_0.02_240)] flex flex-col items-center justify-center px-4 text-white">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-2xl"
      >
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-2 mb-6">
            <div className="w-8 h-8 rounded-lg bg-[oklch(0.55_0.18_240)] flex items-center justify-center font-bold text-sm">
              AW
            </div>
            <span className="font-bold text-lg">Annex Workforce</span>
          </div>
          <h1 className="text-3xl font-bold mb-2">How will you use Annex?</h1>
          <p className="text-white/50">Choose your role to get started.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {options.map((opt) => (
            <motion.button
              key={opt.role}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleSelect(opt.role)}
              className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-white/30 hover:bg-white/10 transition-all text-left cursor-pointer"
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                style={{ background: `${opt.color}/20`, border: `1px solid ${opt.color}/30` }}
              >
                <opt.icon className="w-6 h-6" style={{ color: opt.color }} />
              </div>
              <h2 className="font-bold text-lg mb-2">{opt.title}</h2>
              <p className="text-sm text-white/50 leading-relaxed">{opt.description}</p>
            </motion.button>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

export default function RoleSelect() {
  return (
    <>
      <Authenticated>
        <RoleSelectInner />
      </Authenticated>
      <Unauthenticated>
        <div className="min-h-screen flex items-center justify-center bg-[oklch(0.13_0.02_240)]">
          <div className="text-center text-white">
            <p className="mb-4">Please sign in first.</p>
            <SignInButton />
          </div>
        </div>
      </Unauthenticated>
    </>
  );
}
