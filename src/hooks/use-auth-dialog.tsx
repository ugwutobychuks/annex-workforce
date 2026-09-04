import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

/**
 * Site-wide sign-in modal.
 *
 * Anywhere in the app can call `openAuth(...)` to prompt sign-in without
 * navigating away. Callers can pass `onSuccess` to run something after a
 * successful sign-in (e.g. reopen the apply dialog), or `next` to redirect
 * new registrations back to a specific page after role selection.
 */
export type OpenAuthArgs = {
  onSuccess?: () => void;
  /** In-app path to send new registrations back to after picking a role. */
  next?: string;
};

type AuthDialogCtx = {
  open: (args?: OpenAuthArgs) => void;
  close: () => void;
  state: OpenAuthArgs | null;
};

const Ctx = createContext<AuthDialogCtx>({
  open: () => {},
  close: () => {},
  state: null,
});

export function AuthDialogProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<OpenAuthArgs | null>(null);

  const open = useCallback((args?: OpenAuthArgs) => setState(args ?? {}), []);
  const close = useCallback(() => setState(null), []);
  const value = useMemo(() => ({ open, close, state }), [open, close, state]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuthDialog() {
  return useContext(Ctx);
}
