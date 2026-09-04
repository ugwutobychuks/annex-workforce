import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuthActions } from "@convex-dev/auth/react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogInIcon, UserPlusIcon } from "lucide-react";
import { useAuthDialog } from "@/hooks/use-auth-dialog";

/**
 * Site-wide sign-in modal driven by useAuthDialog(). Rendered once at the
 * root; individual pages call `open({ onSuccess })` to trigger it.
 *
 * Sign-in: on success, runs the caller's onSuccess (e.g. reopen the apply
 * dialog) and closes.
 *
 * Sign-up: on success, we still need the user to pick a role, so we send
 * them to /onboarding/role?next=<current> and let RoleSelect route them
 * back to where they were.
 */
export default function AuthDialog() {
  const { state, close } = useAuthDialog();
  const isOpen = state !== null;

  const { signIn } = useAuthActions();
  const navigate = useNavigate();
  const location = useLocation();
  const [mode, setMode] = useState<"signIn" | "signUp">("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  // Reset on close so the next open starts clean.
  useEffect(() => {
    if (!isOpen) {
      setMode("signIn");
      setEmail("");
      setPassword("");
      setName("");
      setBusy(false);
    }
  }, [isOpen]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Email and password are required.");
      return;
    }
    setBusy(true);
    try {
      const data = new FormData();
      data.set("email", email);
      data.set("password", password);
      data.set("flow", mode);
      if (mode === "signUp" && name) data.set("name", name);
      await signIn("password", data);

      if (mode === "signIn") {
        toast.success("Welcome back.");
        close();
        state?.onSuccess?.();
      } else {
        // Fresh account still needs a role. Send them through onboarding,
        // carrying wherever they were (or the caller's requested next).
        const returnTo = state?.next ?? location.pathname + location.search;
        toast.success("Account created.");
        close();
        navigate(`/onboarding/role?next=${encodeURIComponent(returnTo)}`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Sign-in failed.";
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(next) => { if (!next) close(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {mode === "signIn" ? "Sign in to Annex" : "Create your Annex account"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          {mode === "signUp" && (
            <div className="space-y-1.5">
              <Label htmlFor="auth-name">Full name</Label>
              <Input
                id="auth-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ada Lovelace"
              />
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="auth-email">Email</Label>
            <Input
              id="auth-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="auth-password">Password</Label>
            <Input
              id="auth-password"
              type="password"
              autoComplete={mode === "signIn" ? "current-password" : "new-password"}
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
            />
          </div>
          <Button type="submit" className="w-full" disabled={busy}>
            {mode === "signIn"
              ? <LogInIcon className="w-4 h-4 mr-2" />
              : <UserPlusIcon className="w-4 h-4 mr-2" />}
            {busy ? "Working…" : mode === "signIn" ? "Sign in" : "Create account"}
          </Button>
        </form>
        <div className="mt-1 text-center text-sm text-muted-foreground">
          {mode === "signIn" ? (
            <>
              New to Annex?{" "}
              <button
                type="button"
                className="text-primary hover:underline"
                onClick={() => setMode("signUp")}
              >
                Create an account
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button
                type="button"
                className="text-primary hover:underline"
                onClick={() => setMode("signIn")}
              >
                Sign in
              </button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
