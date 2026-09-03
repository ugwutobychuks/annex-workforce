import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { ChevronLeftIcon, LockIcon, UserIcon } from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { formatNgn } from "@/lib/format.ts";

export default function PayrollRunDetail() {
  const params = useParams<{ id: string }>();
  const runId = params.id as Id<"payrollRuns">;
  const data = useQuery(api.payroll.getRun, runId ? { runId } : "skip");
  const finalize = useMutation(api.payroll.finalizeRun);
  const navigate = useNavigate();

  if (data === undefined) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  if (data === null) {
    return <p className="text-muted-foreground">Payroll run not found.</p>;
  }

  const { run, payslips } = data;

  const handleFinalize = async () => {
    try {
      await finalize({ runId: run._id });
      toast.success("Payroll finalized.");
    } catch (err: unknown) {
      toast.error((err as { data?: { message?: string } }).data?.message ?? "Failed.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate("/employer/payroll")}>
          <ChevronLeftIcon className="w-4 h-4 mr-1" /> Payroll
        </Button>
      </div>

      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold">Payroll · {run.period}</h2>
          <p className="text-muted-foreground mt-1">
            Ran {new Date(run.runAt).toLocaleString()} · {run.payslipCount} payslip{run.payslipCount === 1 ? "" : "s"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={run.status === "finalized" ? "default" : "secondary"} className="capitalize">
            {run.status}
          </Badge>
          {run.status === "draft" && (
            <Button onClick={handleFinalize}>
              <LockIcon className="w-4 h-4 mr-2" /> Finalize
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "Gross",            value: run.totalGross },
          { label: "PAYE",             value: run.totalPaye },
          { label: "Pension (employee)", value: run.totalPension },
          { label: "NHF",              value: run.totalNhf },
          { label: "Net take-home",    value: run.totalNet },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className="text-lg font-bold">{formatNgn(s.value)}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            Employer cost: {formatNgn(run.totalGross + run.totalEmployerPension)}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Includes total gross plus employer pension contribution ({formatNgn(run.totalEmployerPension)}).
          NHF is employee-only.
        </CardContent>
      </Card>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Payslips</h3>
        {payslips.length === 0 ? (
          <p className="text-muted-foreground text-sm">No payslips in this run.</p>
        ) : (
          <div className="grid gap-2">
            {payslips.map((p) => (
              <Card key={p._id}>
                <CardContent className="py-3 grid grid-cols-2 md:grid-cols-6 items-center gap-3 text-sm">
                  <div className="col-span-2 flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                      <UserIcon className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium truncate">
                        {p.candidate?.name ?? "Unknown"}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {p.candidate?.email ?? ""}
                      </p>
                    </div>
                  </div>
                  <div><p className="text-xs text-muted-foreground">Gross</p><p>{formatNgn(p.gross)}</p></div>
                  <div><p className="text-xs text-muted-foreground">PAYE</p><p>{formatNgn(p.paye)}</p></div>
                  <div><p className="text-xs text-muted-foreground">Deductions</p><p>{formatNgn(p.pension + p.nhf)}</p></div>
                  <div><p className="text-xs text-muted-foreground">Net</p><p className="font-semibold">{formatNgn(p.net)}</p></div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
