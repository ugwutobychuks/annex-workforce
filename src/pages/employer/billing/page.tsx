import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CreditCardIcon } from "lucide-react";
import { formatNgn } from "@/lib/format";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive"> = {
  pending: "secondary",
  succeeded: "default",
  failed: "destructive",
  refunded: "destructive",
};

export default function BillingPage() {
  const rows = useQuery(api.payments.listMine);
  if (rows === undefined) {
    return <div className="space-y-2 max-w-3xl">{Array.from({length:3}).map((_,i)=><Skeleton key={i} className="h-16"/>)}</div>;
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Billing</h2>
        <p className="text-muted-foreground mt-1">
          Payments made through Annex Workforce. Provider is set via the{" "}
          <code className="text-xs bg-muted px-1.5 py-0.5 rounded">PAYMENT_PROVIDER</code>{" "}
          Convex env var — the default is <code className="text-xs bg-muted px-1.5 py-0.5 rounded">stub</code>{" "}
          which succeeds instantly for local development.
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed py-16 text-center text-muted-foreground">
          <CreditCardIcon className="mx-auto mb-3 h-10 w-10 opacity-30" />
          <p className="font-medium">No payments yet.</p>
          <p className="text-sm mt-1">
            Featured job promotions and future paid features will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map((p) => (
            <Card key={p._id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-3">
                  <CardTitle className="text-base capitalize">{p.kind.replace(/_/g, " ")}</CardTitle>
                  <Badge variant={STATUS_VARIANT[p.status] ?? "secondary"} className="capitalize">{p.status}</Badge>
                </div>
              </CardHeader>
              <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                <div><p className="text-xs text-muted-foreground">Amount</p><p className="font-semibold">{formatNgn(p.amount / 100)}</p></div>
                <div><p className="text-xs text-muted-foreground">Provider</p><p className="capitalize">{p.provider}</p></div>
                <div><p className="text-xs text-muted-foreground">Reference</p><p className="truncate">{p.reference}</p></div>
                <div><p className="text-xs text-muted-foreground">Date</p><p>{new Date(p._creationTime).toLocaleDateString()}</p></div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
