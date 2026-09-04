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
import { CalendarIcon, ClockIcon, PlusIcon, XCircleIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Tab = "leave" | "attendance";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive"> = {
  pending: "secondary",
  approved: "default",
  rejected: "destructive",
  cancelled: "destructive",
};

export default function CandidateHrms() {
  const [tab, setTab] = useState<Tab>("leave");
  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold">HR</h2>
        <p className="text-muted-foreground mt-1">Leave requests and attendance for your active EOR contract.</p>
      </div>
      <div className="inline-flex rounded-lg border p-1 bg-muted">
        {(["leave", "attendance"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "px-4 py-1.5 rounded-md text-sm font-medium capitalize",
              tab === t ? "bg-background shadow-sm" : "text-muted-foreground"
            )}
          >{t}</button>
        ))}
      </div>
      {tab === "leave" ? <LeaveTab /> : <AttendanceTab />}
    </div>
  );
}

function LeaveTab() {
  const rows = useQuery(api.hrms.listMyLeave);
  const request = useMutation(api.hrms.requestLeave);
  const cancel = useMutation(api.hrms.cancelLeave);

  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<"annual" | "sick" | "maternity" | "paternity" | "unpaid" | "other">("annual");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!start || !end) { toast.error("Start and end dates required."); return; }
    setBusy(true);
    try {
      await request({ kind, startDate: start, endDate: end, reason: reason || undefined });
      toast.success("Leave requested.");
      setOpen(false); setStart(""); setEnd(""); setReason(""); setKind("annual");
    } catch (err: unknown) {
      toast.error((err as {data?:{message?:string}}).data?.message ?? "Failed.");
    } finally { setBusy(false); }
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button onClick={() => setOpen(true)}><PlusIcon className="w-4 h-4 mr-2" /> Request leave</Button>
      </div>
      {rows === undefined ? (
        <Skeleton className="h-24" />
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground rounded-xl border border-dashed py-10 text-center">
          No leave requests yet.
        </p>
      ) : (
        rows.map((r) => (
          <Card key={r._id}>
            <CardContent className="py-3 flex items-center gap-3 flex-wrap">
              <div className="min-w-0 flex-1">
                <p className="font-medium capitalize">{r.kind} leave</p>
                <p className="text-xs text-muted-foreground">
                  {r.startDate} → {r.endDate} · {r.days} day{r.days === 1 ? "" : "s"}
                </p>
                {r.reviewerNote && <p className="text-xs text-muted-foreground mt-1">Reviewer: {r.reviewerNote}</p>}
              </div>
              <Badge variant={STATUS_VARIANT[r.status] ?? "secondary"} className="capitalize">{r.status}</Badge>
              {r.status === "pending" && (
                <Button size="sm" variant="ghost" onClick={() => cancel({ id: r._id })}>
                  <XCircleIcon className="w-4 h-4 mr-1" /> Cancel
                </Button>
              )}
            </CardContent>
          </Card>
        ))
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Request leave</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Kind</Label>
              <Select value={kind} onValueChange={(v) => setKind(v as never)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="annual">Annual</SelectItem>
                  <SelectItem value="sick">Sick</SelectItem>
                  <SelectItem value="maternity">Maternity</SelectItem>
                  <SelectItem value="paternity">Paternity</SelectItem>
                  <SelectItem value="unpaid">Unpaid</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Start date</Label><Input type="date" value={start} onChange={(e) => setStart(e.target.value)} /></div>
              <div><Label>End date</Label><Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} /></div>
            </div>
            <div><Label>Reason (optional)</Label><Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button disabled={busy} onClick={submit}>{busy ? "Requesting…" : "Request"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AttendanceTab() {
  const rows = useQuery(api.hrms.listMyAttendance);
  const checkIn = useMutation(api.hrms.checkIn);
  const checkOut = useMutation(api.hrms.checkOut);
  const [notes, setNotes] = useState("");

  const openSession = rows?.find((r) => !r.checkedOutAt);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Clock</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {openSession ? (
            <div className="space-y-2">
              <p className="text-sm">
                <ClockIcon className="w-4 h-4 inline mr-1" /> Checked in at{" "}
                <span className="font-medium">{new Date(openSession.checkedInAt).toLocaleTimeString()}</span>
              </p>
              <Button
                onClick={async () => { try { await checkOut({}); toast.success("Checked out."); } catch (e:unknown) { toast.error((e as {data?:{message?:string}}).data?.message ?? "Failed."); } }}
              >
                Check out
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <Input placeholder="Notes for this session (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
              <Button
                onClick={async () => { try { await checkIn({ notes: notes || undefined }); toast.success("Checked in."); setNotes(""); } catch (e:unknown) { toast.error((e as {data?:{message?:string}}).data?.message ?? "Failed."); } }}
              >
                Check in now
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Last 30</h3>
        {rows === undefined ? <Skeleton className="h-24" /> :
          rows.length === 0 ? <p className="text-sm text-muted-foreground">No entries yet.</p> :
          rows.map((r) => (
            <Card key={r._id}>
              <CardContent className="py-2 flex items-center gap-3 text-sm">
                <CalendarIcon className="w-4 h-4 text-muted-foreground" />
                <span className="flex-1">
                  {new Date(r.checkedInAt).toLocaleString()}
                  {r.checkedOutAt ? ` → ${new Date(r.checkedOutAt).toLocaleTimeString()}` : " (open)"}
                </span>
                {r.notes && <span className="text-xs text-muted-foreground">{r.notes}</span>}
              </CardContent>
            </Card>
          ))
        }
      </div>
    </div>
  );
}
