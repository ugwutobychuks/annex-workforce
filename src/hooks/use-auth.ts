import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth } from "convex/react";

/**
 * Thin wrapper around @convex-dev/auth for the app's sign-in / sign-out UI.
 * signin() is intentionally a no-op link — the login page owns the form.
 */
export function useAuth() {
  const { signIn, signOut } = useAuthActions();
  const { isAuthenticated, isLoading } = useConvexAuth();
  return {
    isAuthenticated,
    isLoading,
    signin: () => {
      window.location.href = "/login";
    },
    signout: async () => {
      await signOut();
    },
    signIn,
  };
}
