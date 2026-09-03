import { Outlet, useNavigate } from "react-router-dom";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { useEffect } from "react";
import Sidebar from "@/components/sidebar.tsx";
import Topbar from "@/components/topbar.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { SignInButton } from "@/components/ui/signin.tsx";
import {
  LayoutDashboardIcon,
  BriefcaseIcon,
  FileTextIcon,
  UserIcon,
  CheckSquareIcon,
  DollarSignIcon,
  CalendarIcon,
} from "lucide-react";

const navItems = [
  { label: "Dashboard", href: "/candidate", icon: LayoutDashboardIcon },
  { label: "My Profile", href: "/candidate/profile", icon: UserIcon },
  { label: "Browse Jobs", href: "/candidate/jobs", icon: BriefcaseIcon },
  { label: "Applications", href: "/candidate/applications", icon: FileTextIcon },
  { label: "Verification", href: "/candidate/verification", icon: CheckSquareIcon },
  { label: "Payslips", href: "/candidate/payslips", icon: DollarSignIcon },
  { label: "Time Off", href: "/candidate/time-off", icon: CalendarIcon },
];

function CandidateGuard() {
  const user = useQuery(api.users.getCurrentUser);
  const navigate = useNavigate();

  useEffect(() => {
    if (user === undefined) return;
    if (!user) { navigate("/"); return; }
    if (!user.role) { navigate("/onboarding/role"); return; }
    if (user.role !== "candidate") { navigate(`/${user.role}`); return; }
  }, [user, navigate]);

  if (user === undefined) {
    return (
      <div className="min-h-screen flex">
        <div className="hidden md:block w-60 bg-sidebar border-r border-sidebar-border" />
        <div className="flex-1 p-8 space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar navItems={navItems} role="candidate" />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Topbar title="Candidate Portal" />
        <main className="flex-1 overflow-y-auto bg-background p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default function CandidateLayout() {
  return (
    <>
      <AuthLoading>
        <div className="min-h-screen flex items-center justify-center">
          <Skeleton className="h-8 w-48" />
        </div>
      </AuthLoading>
      <Unauthenticated>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center space-y-4">
            <p>Please sign in to access the candidate portal.</p>
            <SignInButton />
          </div>
        </div>
      </Unauthenticated>
      <Authenticated>
        <CandidateGuard />
      </Authenticated>
    </>
  );
}
