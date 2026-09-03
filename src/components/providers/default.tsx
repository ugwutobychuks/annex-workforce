import { ConvexReactClient } from "convex/react";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { Toaster } from "@/components/ui/sonner";
import type { ReactNode } from "react";

const convexUrl = import.meta.env.VITE_CONVEX_URL as string | undefined;
if (!convexUrl) {
  throw new Error(
    "VITE_CONVEX_URL is missing. Run `npx convex dev` once and it will populate .env.local for you."
  );
}
const convex = new ConvexReactClient(convexUrl);

export function DefaultProviders({ children }: { children: ReactNode }) {
  return (
    <ConvexAuthProvider client={convex}>
      {children}
      <Toaster richColors position="top-right" />
    </ConvexAuthProvider>
  );
}
