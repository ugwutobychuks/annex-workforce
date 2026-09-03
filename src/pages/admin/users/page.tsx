import { usePaginatedQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu.tsx";
import { MoreHorizontalIcon, UserIcon, ShieldIcon, BanIcon, CheckCircleIcon, SearchIcon } from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel.d.ts";

type UserRow = {
  _id: Id<"users">;
  _creationTime: number;
  name?: string;
  email?: string;
  role?: "candidate" | "employer" | "admin";
  isBanned?: boolean;
  banReason?: string;
};

type RoleFilter = "all" | "candidate" | "employer" | "admin";

export default function AdminUsers() {
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [search, setSearch] = useState("");
  const { results, status, loadMore } = usePaginatedQuery(
    api.admin.listUsers,
    { role: roleFilter === "all" ? undefined : roleFilter, search: search || undefined },
    { initialNumItems: 25 }
  );

  const setRole = useMutation(api.admin.setUserRole);
  const setBanned = useMutation(api.admin.setUserBanned);

  const [banTarget, setBanTarget] = useState<UserRow | null>(null);
  const [banReason, setBanReason] = useState("");
  const [busy, setBusy] = useState(false);

  const handleRoleChange = async (u: UserRow, role: "candidate" | "employer" | "admin") => {
    try {
      await setRole({ userId: u._id, role });
      toast.success(`Role changed to ${role}.`);
    } catch (err: unknown) {
      toast.error((err as { data?: { message?: string } }).data?.message ?? "Failed.");
    }
  };

  const handleBan = async () => {
    if (!banTarget) return;
    setBusy(true);
    try {
      await setBanned({ userId: banTarget._id, banned: true, reason: banReason || undefined });
      toast.success("User banned.");
      setBanTarget(null);
      setBanReason("");
    } catch (err: unknown) {
      toast.error((err as { data?: { message?: string } }).data?.message ?? "Failed.");
    } finally {
      setBusy(false);
    }
  };

  const handleUnban = async (u: UserRow) => {
    try {
      await setBanned({ userId: u._id, banned: false });
      toast.success("User unbanned.");
    } catch {
      toast.error("Failed.");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">User Management</h2>
        <p className="text-muted-foreground mt-1">All platform accounts.</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <SearchIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v as RoleFilter)}>
          <SelectTrigger className="sm:w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All roles</SelectItem>
            <SelectItem value="candidate">Candidates</SelectItem>
            <SelectItem value="employer">Employers</SelectItem>
            <SelectItem value="admin">Admins</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {status === "LoadingFirstPage" ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-16" />)}
        </div>
      ) : results.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground border rounded-xl border-dashed">
          No users match your filter.
        </div>
      ) : (
        <div className="space-y-2">
          {(results as UserRow[]).map((u) => (
            <Card key={u._id}>
              <CardContent className="flex items-center gap-3 py-3">
                <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center shrink-0">
                  <UserIcon className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium truncate">{u.name ?? "Unnamed"}</p>
                    {u.isBanned && <Badge variant="destructive" className="text-xs">Banned</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{u.email ?? "—"}</p>
                </div>
                <Badge variant="secondary" className="capitalize">{u.role ?? "no role"}</Badge>
                <span className="text-xs text-muted-foreground hidden md:inline">
                  {new Date(u._creationTime).toLocaleDateString()}
                </span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="icon" variant="ghost" className="h-8 w-8">
                      <MoreHorizontalIcon className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {u.role !== "candidate" && (
                      <DropdownMenuItem onClick={() => handleRoleChange(u, "candidate")}>
                        Set as Candidate
                      </DropdownMenuItem>
                    )}
                    {u.role !== "employer" && (
                      <DropdownMenuItem onClick={() => handleRoleChange(u, "employer")}>
                        Set as Employer
                      </DropdownMenuItem>
                    )}
                    {u.role !== "admin" && (
                      <DropdownMenuItem onClick={() => handleRoleChange(u, "admin")}>
                        <ShieldIcon className="w-3.5 h-3.5 mr-2" /> Promote to Admin
                      </DropdownMenuItem>
                    )}
                    {u.isBanned ? (
                      <DropdownMenuItem onClick={() => handleUnban(u)}>
                        <CheckCircleIcon className="w-3.5 h-3.5 mr-2" /> Unban
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => setBanTarget(u)}
                      >
                        <BanIcon className="w-3.5 h-3.5 mr-2" /> Ban
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardContent>
            </Card>
          ))}
          {status === "CanLoadMore" && (
            <div className="text-center pt-2">
              <Button variant="secondary" onClick={() => loadMore(25)}>Load More</Button>
            </div>
          )}
        </div>
      )}

      <Dialog open={!!banTarget} onOpenChange={(o) => { if (!o) { setBanTarget(null); setBanReason(""); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Ban {banTarget?.name ?? "user"}?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            A banned user cannot sign in or interact with the platform until unbanned.
          </p>
          <Textarea
            placeholder="Reason (optional, shown to reviewers)…"
            value={banReason}
            onChange={(e) => setBanReason(e.target.value)}
          />
          <DialogFooter>
            <Button variant="secondary" onClick={() => setBanTarget(null)}>Cancel</Button>
            <Button variant="destructive" disabled={busy} onClick={handleBan}>
              {busy ? "Banning…" : "Ban User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
