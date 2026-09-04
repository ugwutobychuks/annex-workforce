import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { useNavigate } from "react-router-dom";
import { LogOutIcon } from "lucide-react";

/**
 * Shared settings page — same content for candidate / employer / admin.
 * Router mounts this under each portal layout so it inherits their sidebar.
 */
export default function SettingsPage() {
  const user = useQuery(api.users.getCurrentUser);
  const updateName = useMutation(api.users.updateMyName);
  const { signout } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user?.name) setName(user.name);
  }, [user?.name]);

  if (user === undefined) {
    return (
      <div className="max-w-2xl space-y-4">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }
  if (user === null) return null;

  const save = async () => {
    if (name.trim() === "") {
      toast.error("Name can't be empty.");
      return;
    }
    setBusy(true);
    try {
      await updateName({ name: name.trim() });
      toast.success("Settings saved.");
    } catch {
      toast.error("Failed to save.");
    } finally {
      setBusy(false);
    }
  };

  const doSignOut = async () => {
    navigate("/", { replace: true });
    await signout();
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Settings</h2>
        <p className="text-muted-foreground mt-1">Manage your account.</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Account</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="settings-email">Email</Label>
            <Input id="settings-email" value={user.email ?? ""} disabled />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="settings-name">Full name</Label>
            <Input
              id="settings-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ada Lovelace"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Role</Label>
            <p className="text-sm text-muted-foreground capitalize">
              {user.role ?? "not set"}
            </p>
          </div>
          <Button onClick={save} disabled={busy}>
            {busy ? "Saving…" : "Save changes"}
          </Button>
        </CardContent>
      </Card>

      <Card className="border-destructive/40">
        <CardHeader><CardTitle className="text-base">Sign out</CardTitle></CardHeader>
        <CardContent className="flex items-center justify-between gap-3 flex-wrap">
          <p className="text-sm text-muted-foreground">
            End your session on this device. You can sign back in any time.
          </p>
          <Button variant="destructive" onClick={doSignOut}>
            <LogOutIcon className="w-4 h-4 mr-2" /> Sign out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
