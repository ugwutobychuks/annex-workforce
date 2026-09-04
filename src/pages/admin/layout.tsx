import { Outlet, useNavigate } from "react-router-dom";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { useEffect } from "react";
import Sidebar from "@/components/sidebar.tsx";
import Topbar from "@/components/topbar.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import AuthGuardRedirect from "@/components/auth-guard-redirect.tsx";
import { LayoutDashboardIcon, UsersIcon, ShieldCheckIcon, BarChartIcon } from "lucide-react";

const navItems = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboardIcon },
  { label: "User Management", href: "/admin/users", icon: UsersIcon },
  { label: "Verification Queue", href: "/admin/verification", icon: ShieldCheckIcon },
  { label: "Analytics", href: "/admin/analytics", icon: BarChartIcon },
];

function AdminGuard() {
  const user = useQuery(api.users.getCurrentUser);
  const navigate = useNavigate();

  useEffect(() => {
    if (user === undefined) return;
    if (!user) { navigate("/"); return; }
    if (user.role !== "admin") { navigate("/"); return; }
  }, [user, navigate]);

  if (user === undefined) {
    return (
      <div className="min-h-screen flex">
        <div className="hidden md:block w-60 bg-sidebar border-r border-sidebar-border" />
        <div className="flex-1 p-8 space-y-4">
          <Skeleton className="h-8 w-48" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar navItems={navItems} role="admin" />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Topbar title="Admin Panel" />
        <main className="flex-1 overflow-y-auto bg-background p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default function AdminLayout() {
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
        <AdminGuard />
      </Authenticated>
    </>
  );
}
