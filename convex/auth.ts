import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";

/**
 * Local, self-hosted email + password auth via @convex-dev/auth.
 * The Password provider handles register + sign-in + sessions.
 * All app-level authorisation reads the current user with getAuthUserId(ctx).
 */
export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Password],
});
