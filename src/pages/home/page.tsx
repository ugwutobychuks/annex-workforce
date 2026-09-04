import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import SiteFooter from "@/components/layout/site-footer.tsx";
import SiteHeader from "@/components/layout/site-header.tsx";
import ComparisonSection from "./_components/comparison-section.tsx";
import CtaSection from "./_components/cta-section.tsx";
import FeaturedJobs from "./_components/featured-jobs.tsx";
import HeroSection from "./_components/hero-section.tsx";
import PillarsSection from "./_components/pillars-section.tsx";
import PricingSection from "./_components/pricing-section.tsx";
import ProblemSection from "./_components/problem-section.tsx";
import { useAuthDialog } from "@/hooks/use-auth-dialog";

type LandingLocationState = { auth?: boolean; next?: string } | null;

export default function HomePage() {
  const { open: openAuth } = useAuthDialog();
  const location = useLocation();
  const navigate = useNavigate();
  const openedForRef = useRef<string | null>(null);

  // If a locked module (e.g. /employer) bounced the visitor here to sign in,
  // pop the auth dialog automatically with a callback that carries them back.
  useEffect(() => {
    const state = location.state as LandingLocationState;
    if (!state?.auth) return;
    // Guard against re-opening if the same navigation state re-fires (StrictMode
    // double-invokes effects in dev).
    const key = `${state.next ?? ""}|${location.key}`;
    if (openedForRef.current === key) return;
    openedForRef.current = key;

    const next = state.next;
    openAuth({
      next,
      onSuccess: next ? () => navigate(next) : undefined,
    });
    // Clear the state so a manual refresh doesn't reopen the modal.
    navigate(location.pathname, { replace: true, state: null });
  }, [location, navigate, openAuth]);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="flex-1">
        <HeroSection />
        <FeaturedJobs />
        <ProblemSection />
        <PillarsSection />
        <ComparisonSection />
        <PricingSection />
        <CtaSection />
      </main>
      <SiteFooter />
    </div>
  );
}
