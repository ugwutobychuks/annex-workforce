import { Outlet, useNavigate } from "react-router-dom";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { useEffect } from "react";
import Sidebar from "@/components/sidebar.tsx";
import Topbar from "@/components/topbar.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import AuthGuardRedirect from "@/components/auth-guard-redirect.tsx";
import {
  LayoutDashboardIcon,
  BriefcaseIcon,
  UsersIcon,
  DollarSignIcon,
  BuildingIcon,
  MessageSquareIcon,
  CalendarIcon,
  ClipboardCheckIcon,
} from "lucide-react";

const navItems = [
  { label: "Dashboard", href: "/employer", icon: LayoutDashboardIcon },
  { label: "Company Profile", href: "/employer/company", icon: BuildingIcon },
  { label: "Job Postings", href: "/employer/jobs", icon: BriefcaseIcon },
  { label: "Applicants", href: "/employer/applicants", icon: UsersIcon },
  { label: "Messages", href: "/employer/messages", icon: MessageSquareIcon },
  { label: "Interviews", href: "/employer/interviews", icon: CalendarIcon },
  { label: "Assessments", href: "/employer/assessments", icon: ClipboardCheckIcon },
  { label: "Talent Pool", href: "/employer/talent", icon: UsersIcon },
  { label: "Payroll & EOR", href: "/employer/payroll", icon: DollarSignIcon },
];

function EmployerGuard() {
  const user = useQuery(api.users.getCurrentUser);
  const navigate = useNavigate();

  useEffect(() => {
    if (user === undefined) return;
    if (!user) { navigate("/"); return; }
    if (!user.role) { navigate("/onboarding/role"); return; }
    if (user.role !== "employer") { navigate(`/${user.role}`); return; }
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
      <Sidebar navItems={navItems} role="employer" />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Topbar title="Employer Portal" />
        <main className="flex-1 overflow-y-auto bg-background p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default function EmployerLayout() {
  return (
    <>
      <AuthLoading>
        <div className="min-h-screen flex items-center justify-center">
          <Skeleton className="h-8 w-48" />
        </div>
      </AuthLoading>
      <Unauthenticated>
        <AuthGuardRedirect />
      </Unauthenticated>
      <Authenticated>
        <EmployerGuard />
      </Authenticated>
    </>
  );
}
