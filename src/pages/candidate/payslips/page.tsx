import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog.tsx";
import { ReceiptIcon, DownloadIcon } from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { formatNgn } from "@/lib/format.ts";

type Slip = {
  _id: Id<"payslips">;
  period: string;
  gross: number;
  paye: number;
  pension: number;
  nhf: number;
  net: number;
  employerPension: number;
  craMonthly: number;
  taxableMonthly: number;
  breakdown: string;
  contract: { jobTitle: string; employerId: Id<"users"> } | null;
  run: { status: "draft" | "finalized"; runAt: number } | null;
};

function downloadPayslip(s: Slip) {
  const rows = [
    ["Payslip period", s.period],
    ["Job title", s.contract?.jobTitle ?? ""],
    ["Gross monthly", s.gross],
    ["CRA (monthly)", s.craMonthly],
    ["Taxable (monthly)", s.taxableMonthly],
    ["PAYE", s.paye],
    ["Pension (employee)", s.pension],
    ["NHF", s.nhf],
    ["Net take-home", s.net],
    ["Employer pension", s.employerPension],
  ];
  const csv = rows.map((r) => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `payslip-${s.period}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function MyPayslips() {
  const slips = useQuery(api.payroll.getMyPayslips);
  const [selected, setSelected] = useState<Slip | null>(null);

  if (slips === undefined) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-64" />
        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-2xl font-bold">My Payslips</h2>
        <p className="text-muted-foreground mt-1">
          Monthly earnings from any active EOR contracts on Annex Workforce.
        </p>
      </div>

      {slips.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground border rounded-xl border-dashed">
          <ReceiptIcon className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No payslips yet</p>
          <p className="text-sm mt-1">Payslips appear here once your employer runs payroll.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {(slips as Slip[]).map((s) => (
            <Card
              key={s._id}
              className="hover:border-primary/40 cursor-pointer transition-colors"
              onClick={() => setSelected(s)}
            >
              <CardContent className="py-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <ReceiptIcon className="w-5 h-5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{s.period} · {s.contract?.jobTitle ?? "EOR"}</p>
                  <p className="text-xs text-muted-foreground">
                    Gross {formatNgn(s.gross)} · PAYE {formatNgn(s.paye)} · Pension {formatNgn(s.pension)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Net</p>
                  <p className="text-lg font-bold">{formatNgn(s.net)}</p>
                </div>
                {s.run?.status === "draft" && (
                  <Badge variant="secondary" className="ml-2">Draft</Badge>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!selected} onOpenChange={(o) => { if (!o) setSelected(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Payslip — {selected?.period}</DialogTitle></DialogHeader>
          {selected && (
            <div className="space-y-4 text-sm">
              <div className="rounded-lg border p-3 bg-muted/50">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Job title</span>
                  <span className="font-medium">{selected.contract?.jobTitle ?? "—"}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  ["Gross monthly", selected.gross],
                  ["Consolidated relief (CRA)", selected.craMonthly],
                  ["Taxable income", selected.taxableMonthly],
                  ["PAYE", selected.paye],
                  ["Pension (employee)", selected.pension],
                  ["NHF", selected.nhf],
                ].map(([k, v]) => (
                  <div key={String(k)} className="flex items-center justify-between rounded-lg border px-3 py-2">
                    <span className="text-muted-foreground">{k}</span>
                    <span>{formatNgn(v as number)}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between rounded-lg border border-primary/40 bg-primary/5 px-3 py-2 font-semibold">
                <span>Net take-home</span>
                <span className="text-primary">{formatNgn(selected.net)}</span>
              </div>
              <div className="text-xs text-muted-foreground">
                Employer pension contribution: {formatNgn(selected.employerPension)} (not deducted from your salary).
              </div>
              <Button variant="secondary" onClick={() => downloadPayslip(selected)}>
                <DownloadIcon className="w-4 h-4 mr-2" /> Download CSV
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
