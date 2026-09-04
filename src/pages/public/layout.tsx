import { Outlet } from "react-router-dom";
import SiteHeader from "@/components/layout/site-header";
import SiteFooter from "@/components/layout/site-footer";

/**
 * Public shell: no auth guard. Anyone can visit — the site header and footer
 * from the marketing landing are reused so a signed-out visitor can browse
 * the talent marketplace, then be prompted to sign in only when they apply.
 */
export default function PublicLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteHeader />
      <main className="flex-1">
        <div className="mx-auto w-full max-w-6xl px-5 py-8">
          <Outlet />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
