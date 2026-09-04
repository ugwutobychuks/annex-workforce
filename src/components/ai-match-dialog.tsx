import { useEffect, useState } from "react";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { UserIcon } from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel";

export function AiMatchDialog({
  jobId,
  jobTitle,
  open,
  onClose,
}: {
  jobId: Id<"jobs">;
  jobTitle: string;
  open: boolean;
  onClose: () => void;
}) {
  const match = useAction(api.ai.matchCandidates);
  const [results, setResults] = useState<Array<{ candidateId: string; name?: string; headline?: string; score: number; skills: string[] }> | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) { setResults(null); return; }
    let cancelled = false;
    setBusy(true);
    match({ jobId, limit: 10 })
      .then((r) => { if (!cancelled) setResults(r); })
      .catch((err) => { toast.error((err as { data?: { message?: string } }).data?.message ?? "Match failed."); })
      .finally(() => { if (!cancelled) setBusy(false); });
    return () => { cancelled = true; };
  }, [open, jobId, match]);

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Top matches for {jobTitle}</DialogTitle></DialogHeader>
        {busy ? (
          <div className="space-y-2">{Array.from({length:5}).map((_,i)=><Skeleton key={i} className="h-14" />)}</div>
        ) : results === null || results.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            No candidates found. Encourage candidates to fill their skills or lower the bar.
          </p>
        ) : (
          <div className="space-y-2">
            {results.map((r) => (
              <Card key={r.candidateId}>
                <CardContent className="py-2 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <UserIcon className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{r.name ?? "Unknown"}</p>
                    <p className="text-xs text-muted-foreground truncate">{r.headline ?? "—"}</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {r.skills.slice(0, 4).map((s) => <Badge key={s} variant="secondary" className="text-[10px]">{s}</Badge>)}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-lg font-bold">{r.score}%</p>
                    <p className="text-[10px] text-muted-foreground">match</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
