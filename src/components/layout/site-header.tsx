import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { Authenticated, AuthLoading, Unauthenticated } from "convex/react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import Logo from "@/components/brand/logo.tsx";
import { Button } from "@/components/ui/button.tsx";
import { SignInButton } from "@/components/ui/signin.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";

type NavLink = { label: string; kind: "route" | "anchor"; target: string };

const NAV_LINKS: NavLink[] = [
  { label: "Talent Marketplace", kind: "route", target: "/jobs" },
  { label: "Managed Hiring", kind: "anchor", target: "eor" },
  { label: "HR Platform", kind: "anchor", target: "hrms" },
  { label: "Pricing", kind: "anchor", target: "pricing" },
];

function DashboardCta() {
  const user = useQuery(api.users.getCurrentUser);
  const navigate = useNavigate();
  const go = () => {
    const role = user?.role;
    if (!role) navigate("/onboarding/role");
    else if (role === "candidate") navigate("/candidate");
    else if (role === "employer") navigate("/employer");
    else navigate("/admin");
  };
  return <Button size="sm" onClick={go}>Go to dashboard</Button>;
}

export default function SiteHeader() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleNav = (link: NavLink) => {
    setOpen(false);
    if (link.kind === "route") {
      navigate(link.target);
    } else if (location.pathname !== "/") {
      // Anchors live on the landing page. If we're elsewhere, jump home first.
      navigate(`/#${link.target}`);
    } else {
      document.getElementById(link.target)?.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-5">
        <Link to="/" className="cursor-pointer" aria-label="Annex Workforce home">
          <Logo />
        </Link>

        <nav className="hidden items-center gap-7 lg:flex">
          {NAV_LINKS.map((link) => (
            <button
              key={link.target}
              type="button"
              onClick={() => handleNav(link)}
              className="cursor-pointer text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </button>
          ))}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          <AuthLoading>
            <Skeleton className="h-9 w-40" />
          </AuthLoading>
          <Unauthenticated>
            <SignInButton variant="ghost" size="sm" showIcon={false} signInText="Sign in" />
            <Button size="sm" onClick={() => navigate("/jobs")}>Browse jobs</Button>
          </Unauthenticated>
          <Authenticated>
            <DashboardCta />
          </Authenticated>
        </div>

        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          aria-label={open ? "Close menu" : "Open menu"}
          className="cursor-pointer rounded-sm p-2 text-foreground lg:hidden"
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-border/60 bg-background px-5 py-4 lg:hidden">
          <nav className="flex flex-col gap-1">
            {NAV_LINKS.map((link) => (
              <button
                key={link.target}
                type="button"
                onClick={() => handleNav(link)}
                className="cursor-pointer rounded-sm px-2 py-2.5 text-left text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                {link.label}
              </button>
            ))}
          </nav>
          <div className="flex flex-col gap-2 pt-3">
            <Unauthenticated>
              <SignInButton className="w-full" showIcon={false} signInText="Sign in" />
              <Button className="w-full" onClick={() => { setOpen(false); navigate("/jobs"); }}>
                Browse jobs
              </Button>
            </Unauthenticated>
            <Authenticated>
              <DashboardCta />
            </Authenticated>
          </div>
        </div>
      )}
    </header>
  );
}
