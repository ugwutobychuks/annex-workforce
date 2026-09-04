import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { FileSignatureIcon } from "lucide-react";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive"> = {
  draft: "secondary",
  sent: "secondary",
  signed: "default",
  declined: "destructive",
};

export default function SignaturesInbox() {
  const rows = useQuery(api.signatures.listMine);
  const currentUser = useQuery(api.users.getCurrentUser);
  const navigate = useNavigate();
  const isCandidate = currentUser?.role === "candidate";
  const base = isCandidate ? "/candidate/signatures" : "/employer/signatures";

  if (rows === undefined) return <div className="space-y-2 max-w-3xl">{Array.from({length:3}).map((_,i)=><Skeleton key={i} className="h-20"/>)}</div>;

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Signatures</h2>
        <p className="text-muted-foreground mt-1">
          Offer letters and EOR contracts. Every signed document carries a
          tamper-evidence hash you can re-verify from the detail page.
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed py-16 text-center text-muted-foreground">
          <FileSignatureIcon className="mx-auto mb-3 h-10 w-10 opacity-30" />
          <p className="font-medium">Nothing to sign yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map((d) => (
            <Card key={d._id} className="cursor-pointer hover:border-primary/40" onClick={() => navigate(`${base}/${d._id}`)}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <CardTitle className="text-base truncate">{d.title}</CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5 capitalize">
                      {d.kind.replace("_", " ")} · with {d.other?.name ?? "Unknown"}
                    </p>
                  </div>
                  <Badge variant={STATUS_VARIANT[d.status] ?? "secondary"} className="capitalize">
                    {d.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">
                {d.signedAt ? `Signed ${new Date(d.signedAt).toLocaleString()}`
                  : d.sentAt ? `Sent ${new Date(d.sentAt).toLocaleString()}`
                  : `Draft ${new Date(d._creationTime).toLocaleString()}`}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
