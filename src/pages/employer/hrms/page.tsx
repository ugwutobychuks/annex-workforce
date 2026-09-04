import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { PlusIcon, CheckIcon, XIcon, TrashIcon, UserIcon, FileIcon, ExternalLinkIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Id } from "@/convex/_generated/dataModel";

type Tab = "leave" | "attendance" | "org" | "docs";

export default function EmployerHrms() {
  const [tab, setTab] = useState<Tab>("leave");
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">HR Management</h2>
        <p className="text-muted-foreground mt-1">Leave approvals, attendance, org chart, and shared documents.</p>
      </div>
      <div className="inline-flex rounded-lg border p-1 bg-muted">
        {(["leave", "attendance", "org", "docs"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "px-4 py-1.5 rounded-md text-sm font-medium capitalize",
              tab === t ? "bg-background shadow-sm" : "text-muted-foreground"
            )}
          >{t === "org" ? "Org chart" : t}</button>
        ))}
      </div>
      {tab === "leave" && <LeaveQueue />}
      {tab === "attendance" && <AttendanceToday />}
      {tab === "org" && <OrgChart />}
      {tab === "docs" && <Docs />}
    </div>
  );
}

function LeaveQueue() {
  const rows = useQuery(api.hrms.listPendingLeaveForEmployer);
  const review = useMutation(api.hrms.reviewLeave);

  const decide = async (id: Id<"leaveRequests">, decision: "approved" | "rejected") => {
    try { await review({ id, decision }); toast.success(`Marked ${decision}.`); }
    catch (e:unknown) { toast.error((e as {data?:{message?:string}}).data?.message ?? "Failed."); }
  };

  if (rows === undefined) return <Skeleton className="h-24 max-w-3xl" />;
  if (rows.length === 0) return <p className="text-sm text-muted-foreground max-w-3xl rounded-xl border border-dashed py-10 text-center">No pending leave requests.</p>;

  return (
    <div className="space-y-2 max-w-3xl">
      {rows.map((r) => (
        <Card key={r._id}>
          <CardContent className="py-3 flex items-center gap-3 flex-wrap">
            <div className="min-w-0 flex-1">
              <p className="font-medium">{r.worker?.name ?? "Unknown"} — <span className="capitalize">{r.kind}</span></p>
              <p className="text-xs text-muted-foreground">
                {r.startDate} → {r.endDate} ({r.days} day{r.days === 1 ? "" : "s"})
              </p>
              {r.reason && <p className="text-sm mt-1">{r.reason}</p>}
            </div>
            <Button size="sm" onClick={() => decide(r._id, "approved")}>
              <CheckIcon className="w-4 h-4 mr-1" /> Approve
            </Button>
            <Button size="sm" variant="destructive" onClick={() => decide(r._id, "rejected")}>
              <XIcon className="w-4 h-4 mr-1" /> Reject
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function AttendanceToday() {
  const rows = useQuery(api.hrms.listTodayForEmployer);
  if (rows === undefined) return <Skeleton className="h-24 max-w-3xl" />;
  if (rows.length === 0) return <p className="text-sm text-muted-foreground max-w-3xl rounded-xl border border-dashed py-10 text-center">No check-ins today.</p>;

  return (
    <div className="space-y-2 max-w-3xl">
      {rows.map((r) => (
        <Card key={r._id}>
          <CardContent className="py-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0"><UserIcon className="w-4 h-4 text-muted-foreground" /></div>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{r.worker?.name ?? "Unknown"}</p>
              <p className="text-xs text-muted-foreground">
                In {new Date(r.checkedInAt).toLocaleTimeString()}
                {r.checkedOutAt ? ` → Out ${new Date(r.checkedOutAt).toLocaleTimeString()}` : ""}
              </p>
            </div>
            <Badge variant={r.checkedOutAt ? "secondary" : "default"}>
              {r.checkedOutAt ? "Done" : "Open"}
            </Badge>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function OrgChart() {
  const nodes = useQuery(api.hrms.listOrgChart);
  const upsert = useMutation(api.hrms.upsertOrgNode);
  const del = useMutation(api.hrms.deleteOrgNode);

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [department, setDepartment] = useState("");
  const [manager, setManager] = useState<string>("");

  const create = async () => {
    if (!title) return;
    try {
      await upsert({ title, department: department || undefined, managerId: manager ? manager as Id<"orgNodes"> : undefined });
      setOpen(false); setTitle(""); setDepartment(""); setManager("");
      toast.success("Node added.");
    } catch (e:unknown) { toast.error((e as {data?:{message?:string}}).data?.message ?? "Failed."); }
  };

  if (nodes === undefined) return <Skeleton className="h-24 max-w-3xl" />;

  // Simple tree indent by traversing managerId links.
  const byId = new Map(nodes.map((n) => [n._id, n]));
  const depth = (n: (typeof nodes)[number], seen = new Set<string>()): number => {
    if (!n.managerId || seen.has(n._id)) return 0;
    seen.add(n._id);
    const parent = byId.get(n.managerId);
    return parent ? depth(parent, seen) + 1 : 0;
  };
  const sorted = [...nodes].sort((a, b) => depth(a) - depth(b) || a.title.localeCompare(b.title));

  return (
    <div className="max-w-3xl space-y-3">
      <div className="flex justify-end">
        <Button onClick={() => setOpen(true)}><PlusIcon className="w-4 h-4 mr-2" /> Add role</Button>
      </div>

      {nodes.length === 0 ? (
        <p className="text-sm text-muted-foreground rounded-xl border border-dashed py-10 text-center">
          No org nodes yet.
        </p>
      ) : (
        <div className="space-y-1">
          {sorted.map((n) => (
            <div
              key={n._id}
              className="flex items-center gap-3 py-2 pr-3 rounded-md hover:bg-muted"
              style={{ paddingLeft: `${depth(n) * 24 + 12}px` }}
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{n.title}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {n.user?.name ?? "Unassigned"}{n.department ? ` · ${n.department}` : ""}
                </p>
              </div>
              <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => del({ id: n._id })}>
                <TrashIcon className="w-3.5 h-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New role</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Head of Engineering" /></div>
            <div><Label>Department (optional)</Label><Input value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="Engineering" /></div>
            <div>
              <Label>Reports to (optional)</Label>
              <Select value={manager} onValueChange={setManager}>
                <SelectTrigger><SelectValue placeholder="No manager (top-level)" /></SelectTrigger>
                <SelectContent>
                  {nodes.map((n) => <SelectItem key={n._id} value={n._id}>{n.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={create}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Docs() {
  const rows = useQuery(api.hrms.listHrmsDocs);
  const create = useMutation(api.hrms.createHrmsDoc);
  const del = useMutation(api.hrms.deleteHrmsDoc);

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState("policy");
  const [url, setUrl] = useState("");
  const [vis, setVis] = useState<"employer" | "workers" | "both">("both");

  const submit = async () => {
    if (!title || !url) { toast.error("Title and URL are required."); return; }
    try {
      await create({ title, kind, url, visibility: vis });
      setOpen(false); setTitle(""); setUrl(""); setKind("policy"); setVis("both");
      toast.success("Added.");
    } catch (e:unknown) { toast.error((e as {data?:{message?:string}}).data?.message ?? "Failed."); }
  };

  if (rows === undefined) return <Skeleton className="h-24 max-w-3xl" />;

  return (
    <div className="max-w-3xl space-y-3">
      <div className="flex justify-end">
        <Button onClick={() => setOpen(true)}><PlusIcon className="w-4 h-4 mr-2" /> Add document</Button>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground rounded-xl border border-dashed py-10 text-center">No documents yet.</p>
      ) : (
        <div className="space-y-2">
          {rows.map((d) => (
            <Card key={d._id}>
              <CardContent className="py-3 flex items-center gap-3">
                <FileIcon className="w-5 h-5 text-muted-foreground shrink-0" />
                <div className="min-w-0 flex-1">
                  <a href={d.url} target="_blank" rel="noreferrer" className="font-medium hover:underline flex items-center gap-1">
                    {d.title} <ExternalLinkIcon className="w-3.5 h-3.5" />
                  </a>
                  <p className="text-xs text-muted-foreground capitalize">{d.kind} · {d.visibility}</p>
                </div>
                <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => del({ id: d._id })}>
                  <TrashIcon className="w-3.5 h-3.5" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New document</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Employee handbook" /></div>
            <div><Label>URL</Label><Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Kind</Label>
                <Input value={kind} onChange={(e) => setKind(e.target.value)} placeholder="handbook / policy / template" />
              </div>
              <div>
                <Label>Visible to</Label>
                <Select value={vis} onValueChange={(v) => setVis(v as never)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="employer">Employer only</SelectItem>
                    <SelectItem value="workers">Workers only</SelectItem>
                    <SelectItem value="both">Both</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={submit}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
