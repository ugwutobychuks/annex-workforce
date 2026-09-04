import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Used inside <Unauthenticated>: bounces the visitor back to the landing
 * page and asks it to open the sign-in modal, carrying `next` so a
 * successful sign-in sends them where they were trying to go.
 *
 * Rendered as a lightweight loading skeleton while the redirect runs so we
 * don't flash a broken protected UI.
 */
export default function AuthGuardRedirect() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    navigate("/", {
      replace: true,
      state: { auth: true, next: location.pathname + location.search },
    });
  }, [navigate, location.pathname, location.search]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <Skeleton className="h-8 w-48" />
    </div>
  );
}
