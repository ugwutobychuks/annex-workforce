import { useState } from "react";
import { Link } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { toast } from "sonner";
import { Authenticated, AuthLoading, Unauthenticated } from "convex/react";
import Logo from "@/components/brand/logo.tsx";
import { Button } from "@/components/ui/button.tsx";
import { SignInButton } from "@/components/ui/signin.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";

const NAV_LINKS = [
  { label: "Talent Marketplace", target: "marketplace" },
  { label: "Managed Hiring", target: "eor" },
  { label: "HR Platform", target: "hrms" },
  { label: "Pricing", target: "pricing" },
] as const;

export default function SiteHeader() {
  const [open, setOpen] = useState(false);

  const scrollTo = (id: string) => {
    setOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
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
              onClick={() => scrollTo(link.target)}
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
            <SignInButton
              variant="ghost"
              size="sm"
              showIcon={false}
              signInText="Sign in"
            />
            <Button
              size="sm"
              className="cursor-pointer"
              onClick={() =>
                toast.info("Talent and employer onboarding is coming soon in a future milestone!")
              }
            >
              Book a demo
            </Button>
          </Unauthenticated>
          <Authenticated>
            <Button
              size="sm"
              className="cursor-pointer"
              onClick={() =>
                toast.info("Your dashboard is coming soon in a future milestone!")
              }
            >
              Go to dashboard
            </Button>
            <SignInButton variant="ghost" size="sm" showIcon={false} />
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
                onClick={() => scrollTo(link.target)}
                className="cursor-pointer rounded-sm px-2 py-2.5 text-left text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                {link.label}
              </button>
            ))}
          </nav>
          <div className="flex flex-col gap-2 pt-3">
            <Unauthenticated>
              <SignInButton className="w-full" showIcon={false} signInText="Sign in" />
            </Unauthenticated>
            <Authenticated>
              <SignInButton className="w-full" showIcon={false} />
            </Authenticated>
          </div>
        </div>
      )}
    </header>
  );
}
