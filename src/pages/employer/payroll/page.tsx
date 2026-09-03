import { useQuery, useMutation, usePaginatedQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Switch } from "@/components/ui/switch.tsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu.tsx";
import { PlusIcon, PlayIcon, MoreHorizontalIcon, UserIcon, CalendarIcon, TrashIcon, CheckCircleIcon, XCircleIcon } from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { formatNgn } from "@/lib/format.ts";

type Contract = {
  _id: Id<"eorContracts">;
  jobTitle: string;
  grossMonthlyNGN: number;
  startDate: string;
  endDate?: string;
  pensionRatePct: number;
  employerPensionRatePct: number;
  nhfEligible: boolean;
  status: "draft" | "active" | "terminated";
  candidate: { _id: Id<"users">; name?: string; email?: string } | null;
};

type Run = {
  _id: Id<"payrollRuns">;
  period: string;
  runAt: number;
  status: "draft" | "finalized";
  totalGross: number;
  totalNet: number;
  totalPaye: number;
  totalPension: number;
  totalNhf: number;
  totalEmployerPension: number;
  payslipCount: number;
};

function CreateContractDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const talent = usePaginatedQuery(api.employer.searchTalentPool, { search: undefined }, { initialNumItems: 200 });
  const createContract = useMutation(api.payroll.createContract);
  const [candidateId, setCandidateId] = useState<string>("");
  const [jobTitle, setJobTitle] = useState("");
  const [gross, setGross] = useState("");
  const [startDate, setStartDate] = useState("");
  const [nhf, setNhf] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const g = Number(gross);
    if (!candidateId || !jobTitle || !g || g <= 0 || !startDate) {
      toast.error("Please fill candidate, job title, gross salary, and start date.");
      return;
    }
    setBusy(true);
    try {
      await createContract({
        candidateId: candidateId as Id<"users">,
        jobTitle,
        grossMonthlyNGN: g,
        startDate,
        nhfEligible: nhf,
      });
      toast.success("Contract created as draft. Activate it to include in payroll runs.");
      onClose();
      setCandidateId(""); setJobTitle(""); setGross(""); setStartDate(""); setNhf(false);
    } catch (err: unknown) {
      toast.error((err as { data?: { message?: string } }).data?.message ?? "Failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>New EOR Contract</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Candidate</Label>
            <Select value={candidateId} onValueChange={setCandidateId}>
              <SelectTrigger><SelectValue placeholder="Select a candidate…" /></SelectTrigger>
              <SelectContent>
                {talent.results.map((r) => (
                  <SelectItem key={r.user._id} value={r.user._id}>
                    {r.user.name ?? r.user.email ?? "Unnamed"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Job title</Label>
            <Input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="Backend Engineer" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Gross monthly (₦)</Label>
              <Input type="number" min="0" value={gross} onChange={(e) => setGross(e.target.value)} placeholder="850000" />
            </div>
            <div>
              <Label>Start date</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium">NHF eligible</p>
              <p className="text-xs text-muted-foreground">Deduct 2.5% for the National Housing Fund.</p>
            </div>
            <Switch checked={nhf} onCheckedChange={setNhf} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button disabled={busy} onClick={submit}>{busy ? "Saving…" : "Create Contract"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RunPayrollDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const runPayroll = useMutation(api.payroll.runPayroll);
  const navigate = useNavigate();
  const now = new Date();
  const defaultPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const [period, setPeriod] = useState(defaultPeriod);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      const runId = await runPayroll({ period });
      toast.success(`Payroll run created for ${period}.`);
      onClose();
      navigate(`/employer/payroll/runs/${runId}`);
    } catch (err: unknown) {
      toast.error((err as { data?: { message?: string } }).data?.message ?? "Failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent>
        <DialogHeader><DialogTitle>Run Payroll</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Creates a draft run with payslips for every active EOR contract. You can review,
            then finalize.
          </p>
          <div>
            <Label>Period</Label>
            <Input type="month" value={period} onChange={(e) => setPeriod(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button disabled={busy} onClick={submit}>
            <PlayIcon className="w-4 h-4 mr-2" /> {busy ? "Running…" : "Run Payroll"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function PayrollPage() {
  const contracts = useQuery(api.payroll.listMyContracts);
  const { results: runs, status: runsStatus, loadMore } =
    usePaginatedQuery(api.payroll.listMyRuns, {}, { initialNumItems: 10 });
  const updateStatus = useMutation(api.payroll.updateContractStatus);
  const deleteContract = useMutation(api.payroll.deleteContract);
  const deleteRun = useMutation(api.payroll.deleteRun);
  const navigate = useNavigate();

  const [contractDialogOpen, setContractDialogOpen] = useState(false);
  const [runDialogOpen, setRunDialogOpen] = useState(false);

  const changeStatus = async (id: Id<"eorContracts">, s: "draft" | "active" | "terminated") => {
    try {
      await updateStatus({ id, status: s });
      toast.success(`Contract ${s}.`);
    } catch (err: unknown) {
      toast.error((err as { data?: { message?: string } }).data?.message ?? "Failed.");
    }
  };

  const removeContract = async (id: Id<"eorContracts">) => {
    try {
      await deleteContract({ id });
      toast.success("Contract deleted.");
    } catch (err: unknown) {
      toast.error((err as { data?: { message?: string } }).data?.message ?? "Failed.");
    }
  };

  const removeRun = async (id: Id<"payrollRuns">) => {
    try {
      await deleteRun({ runId: id });
      toast.success("Draft run deleted.");
    } catch (err: unknown) {
      toast.error((err as { data?: { message?: string } }).data?.message ?? "Failed.");
    }
  };

  const activeCount = (contracts ?? []).filter((c: Contract) => c.status === "active").length;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold">Payroll & Employer-of-Record</h2>
          <p className="text-muted-foreground mt-1">
            Manage EOR contracts and run monthly Nigerian payroll — PAYE, pension, and NHF handled for you.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setContractDialogOpen(true)}>
            <PlusIcon className="w-4 h-4 mr-2" /> New Contract
          </Button>
          <Button disabled={activeCount === 0} onClick={() => setRunDialogOpen(true)}>
            <PlayIcon className="w-4 h-4 mr-2" /> Run Payroll
          </Button>
        </div>
      </div>

      {/* Contracts */}
      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          EOR Contracts ({contracts?.length ?? 0}, {activeCount} active)
        </h3>
        {contracts === undefined ? (
          <div className="space-y-2">
            {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
          </div>
        ) : contracts.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground border rounded-xl border-dashed">
            <p className="font-medium">No EOR contracts yet.</p>
            <p className="text-sm mt-1">Create a contract to bring a candidate onto payroll.</p>
          </div>
        ) : (
          <div className="grid gap-2">
            {(contracts as Contract[]).map((c) => (
              <Card key={c._id}>
                <CardContent className="py-4 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <UserIcon className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">
                      {c.candidate?.name ?? "Unknown"} — {c.jobTitle}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {formatNgn(c.grossMonthlyNGN)} / month · from {c.startDate}
                      {c.nhfEligible ? " · NHF" : ""}
                    </p>
                  </div>
                  <Badge
                    variant={
                      c.status === "active" ? "default" :
                      c.status === "terminated" ? "destructive" : "secondary"
                    }
                    className="capitalize"
                  >
                    {c.status}
                  </Badge>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="icon" variant="ghost" className="h-8 w-8">
                        <MoreHorizontalIcon className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {c.status !== "active" && (
                        <DropdownMenuItem onClick={() => changeStatus(c._id, "active")}>
                          <CheckCircleIcon className="w-3.5 h-3.5 mr-2" /> Activate
                        </DropdownMenuItem>
                      )}
                      {c.status === "active" && (
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => changeStatus(c._id, "terminated")}
                        >
                          <XCircleIcon className="w-3.5 h-3.5 mr-2" /> Terminate
                        </DropdownMenuItem>
                      )}
                      {c.status !== "active" && (
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => removeContract(c._id)}
                        >
                          <TrashIcon className="w-3.5 h-3.5 mr-2" /> Delete
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Runs */}
      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Payroll Runs
        </h3>
        {runsStatus === "LoadingFirstPage" ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20" />)}
          </div>
        ) : runs.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground border rounded-xl border-dashed">
            <p>No payroll runs yet.</p>
          </div>
        ) : (
          <div className="grid gap-2">
            {(runs as Run[]).map((r) => (
              <Card
                key={r._id}
                className="hover:border-primary/40 cursor-pointer transition-colors"
                onClick={() => navigate(`/employer/payroll/runs/${r._id}`)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between gap-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <CalendarIcon className="w-4 h-4 text-primary" /> {r.period}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant={r.status === "finalized" ? "default" : "secondary"} className="capitalize">
                        {r.status}
                      </Badge>
                      {r.status === "draft" && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-destructive"
                          onClick={(e) => { e.stopPropagation(); removeRun(r._id); }}
                        >
                          <TrashIcon className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
                  <div><p className="text-xs text-muted-foreground">Payslips</p><p className="font-semibold">{r.payslipCount}</p></div>
                  <div><p className="text-xs text-muted-foreground">Gross</p><p className="font-semibold">{formatNgn(r.totalGross)}</p></div>
                  <div><p className="text-xs text-muted-foreground">PAYE</p><p className="font-semibold">{formatNgn(r.totalPaye)}</p></div>
                  <div><p className="text-xs text-muted-foreground">Net</p><p className="font-semibold">{formatNgn(r.totalNet)}</p></div>
                  <div><p className="text-xs text-muted-foreground">Employer cost</p><p className="font-semibold">{formatNgn(r.totalGross + r.totalEmployerPension)}</p></div>
                </CardContent>
              </Card>
            ))}
            {runsStatus === "CanLoadMore" && (
              <div className="text-center pt-2">
                <Button variant="secondary" onClick={() => loadMore(10)}>Load More</Button>
              </div>
            )}
          </div>
        )}
      </section>

      <CreateContractDialog open={contractDialogOpen} onClose={() => setContractDialogOpen(false)} />
      <RunPayrollDialog open={runDialogOpen} onClose={() => setRunDialogOpen(false)} />
    </div>
  );
}
