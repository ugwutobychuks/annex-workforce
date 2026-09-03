import { NavLink, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils.ts";
import { useAuth } from "@/hooks/use-auth.ts";
import {
  LayoutDashboardIcon,
  BriefcaseIcon,
  UsersIcon,
  FileTextIcon,
  SettingsIcon,
  LogOutIcon,
  ChevronRightIcon,
} from "lucide-react";

type NavItem = {
  label: string;
  href: string;
  icon: React.ElementType;
};

type SidebarProps = {
  navItems: NavItem[];
  role: "candidate" | "employer" | "admin";
};

export default function Sidebar({ navItems, role }: SidebarProps) {
  const { signout } = useAuth();
  const navigate = useNavigate();

  const roleLabel = { candidate: "Candidate", employer: "Employer", admin: "Admin" }[role];
  const roleColor = {
    candidate: "bg-[oklch(0.55_0.18_240)]/20 text-[oklch(0.75_0.18_240)]",
    employer: "bg-[oklch(0.55_0.15_200)]/20 text-[oklch(0.72_0.15_200)]",
    admin: "bg-[oklch(0.55_0.2_50)]/20 text-[oklch(0.75_0.2_50)]",
  }[role];

  const handleSignOut = async () => {
    await signout();
    navigate("/");
  };

  return (
    <aside className="hidden md:flex w-60 flex-col h-full bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
      <div className="flex items-center gap-2 px-5 py-5 border-b border-sidebar-border">
        <div className="w-8 h-8 rounded-lg bg-[oklch(0.55_0.18_240)] flex items-center justify-center font-bold text-sm text-white shrink-0">
          AW
        </div>
        <div>
          <span className="font-bold text-sm">Annex Workforce</span>
          <span className={cn("ml-2 text-xs px-2 py-0.5 rounded-full font-medium", roleColor)}>
            {roleLabel}
          </span>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.href}
            to={item.href}
            end={item.href.split("/").length <= 2}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
              )
            }
          >
            <item.icon className="w-4 h-4 shrink-0" />
            {item.label}
            <ChevronRightIcon className="w-3 h-3 ml-auto opacity-30" />
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-sidebar-border px-3 py-3 space-y-1">
        <NavLink
          to={`/${role}/settings`}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors"
        >
          <SettingsIcon className="w-4 h-4" />
          Settings
        </NavLink>
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground/60 hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
        >
          <LogOutIcon className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}

export { LayoutDashboardIcon, BriefcaseIcon, UsersIcon, FileTextIcon };
