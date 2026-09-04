import { useState } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { useAuthActions } from "@convex-dev/auth/react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogInIcon, UserPlusIcon } from "lucide-react";

/**
 * Local sign-in / register page powered by @convex-dev/auth's Password provider.
 * After success, Convex Auth stores a session cookie; the app re-renders and
 * onboarding takes over (/onboarding/role for first-time users).
 */
export default function Login() {
  const { signIn } = useAuthActions();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  // Where to send the visitor after auth succeeds. Only accept in-app
  // paths (starting with "/") to prevent open-redirect abuse.
  const nextRaw = params.get("next");
  const next = nextRaw && nextRaw.startsWith("/") ? nextRaw : null;
  const [mode, setMode] = useState<"signIn" | "signUp">("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

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
      toast.success(mode === "signIn" ? "Welcome back." : "Account created.");
      // For a brand-new account we must send them through role selection first,
      // carrying `next` so they land back where they started after onboarding.
      // An existing user with a role goes straight back to `next`.
      if (mode === "signUp") {
        navigate(next ? `/onboarding/role?next=${encodeURIComponent(next)}` : "/onboarding/role");
      } else {
        navigate(next ?? "/onboarding/role");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Sign-in failed.";
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <Link to="/" className="inline-flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center font-bold text-sm text-primary-foreground">
              AW
            </div>
            <span className="font-bold text-lg">Annex Workforce</span>
          </Link>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">
              {mode === "signIn" ? "Sign in" : "Create your account"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-4">
              {mode === "signUp" && (
                <div className="space-y-1.5">
                  <Label htmlFor="name">Full name</Label>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ada Lovelace" />
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
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
                {mode === "signIn" ? <LogInIcon className="w-4 h-4 mr-2" /> : <UserPlusIcon className="w-4 h-4 mr-2" />}
                {busy ? "Working…" : mode === "signIn" ? "Sign in" : "Create account"}
              </Button>
            </form>

            <div className="mt-4 text-center text-sm text-muted-foreground">
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
