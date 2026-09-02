import SiteFooter from "@/components/layout/site-footer.tsx";
import SiteHeader from "@/components/layout/site-header.tsx";
import ComparisonSection from "./_components/comparison-section.tsx";
import CtaSection from "./_components/cta-section.tsx";
import HeroSection from "./_components/hero-section.tsx";
import PillarsSection from "./_components/pillars-section.tsx";
import PricingSection from "./_components/pricing-section.tsx";
import ProblemSection from "./_components/problem-section.tsx";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="flex-1">
        <HeroSection />
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
