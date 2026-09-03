import { usePaginatedQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { CheckIcon, XIcon, ExternalLinkIcon, ShieldCheckIcon } from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel.d.ts";

type StatusFilter = "pending" | "approved" | "rejected" | "all";

type Request = {
  _id: Id<"verificationRequests">;
  _creationTime: number;
  subjectType: "candidate" | "employer";
  status: "pending" | "approved" | "rejected";
  note?: string;
  documentUrl?: string;
  reviewerNote?: string;
  subject: { _id: Id<"users">; name?: string; email?: string } | null;
  candidateProfile?: { headline?: string; skills: string[] } | null;
  companyProfile?: { name?: string; industry?: string; website?: string } | null;
};

export default function AdminVerification() {
  const [filter, setFilter] = useState<StatusFilter>("pending");
  const { results, status, loadMore } = usePaginatedQuery(
    api.admin.listVerifications,
    { status: filter === "all" ? undefined : filter },
    { initialNumItems: 20 }
  );

  const review = useMutation(api.admin.reviewVerification);
  const [reviewTarget, setReviewTarget] = useState<{ req: Request; decision: "approved" | "rejected" } | null>(null);
  const [reviewerNote, setReviewerNote] = useState("");
  const [busy, setBusy] = useState(false);

  const handleReview = async () => {
    if (!reviewTarget) return;
    setBusy(true);
    try {
      await review({
        requestId: reviewTarget.req._id,
        decision: reviewTarget.decision,
        reviewerNote: reviewerNote || undefined,
      });
      toast.success(`Request ${reviewTarget.decision}.`);
      setReviewTarget(null);
      setReviewerNote("");
    } catch (err: unknown) {
      toast.error((err as { data?: { message?: string } }).data?.message ?? "Failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold">Verification Queue</h2>
          <p className="text-muted-foreground mt-1">Review candidate and employer verification requests.</p>
        </div>
        <Select value={filter} onValueChange={(v) => setFilter(v as StatusFilter)}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="all">All</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {status === "LoadingFirstPage" ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32" />)}
        </div>
      ) : results.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground border rounded-xl border-dashed">
          <ShieldCheckIcon className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No {filter === "all" ? "" : filter} requests.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {(results as Request[]).map((r) => (
            <Card key={r._id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <CardTitle className="text-base">
                      {r.subjectType === "candidate"
                        ? r.subject?.name ?? "Unknown candidate"
                        : r.companyProfile?.name ?? r.subject?.name ?? "Unknown employer"}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {r.subject?.email ?? ""} · {r.subjectType} ·{" "}
                      {new Date(r._creationTime).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge
                    variant={
                      r.status === "pending" ? "secondary" :
                      r.status === "approved" ? "default" : "destructive"
                    }
                    className="capitalize"
                  >
                    {r.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {r.subjectType === "candidate" && r.candidateProfile?.headline && (
                  <p className="text-sm">{r.candidateProfile.headline}</p>
                )}
                {r.subjectType === "employer" && r.companyProfile?.industry && (
                  <p className="text-sm">{r.companyProfile.industry}</p>
                )}
                {r.note && (
                  <div className="text-sm bg-muted rounded-lg p-3">
                    <p className="font-medium text-xs text-muted-foreground mb-1">Applicant note</p>
                    {r.note}
                  </div>
                )}
                {r.documentUrl && (
                  <a
                    href={r.documentUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                  >
                    <ExternalLinkIcon className="w-3.5 h-3.5" /> Supporting document
                  </a>
                )}
                {r.reviewerNote && r.status !== "pending" && (
                  <div className="text-sm bg-muted rounded-lg p-3">
                    <p className="font-medium text-xs text-muted-foreground mb-1">Reviewer note</p>
                    {r.reviewerNote}
                  </div>
                )}
                {r.status === "pending" && (
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" onClick={() => setReviewTarget({ req: r, decision: "approved" })}>
                      <CheckIcon className="w-3.5 h-3.5 mr-1" /> Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => setReviewTarget({ req: r, decision: "rejected" })}
                    >
                      <XIcon className="w-3.5 h-3.5 mr-1" /> Reject
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
          {status === "CanLoadMore" && (
            <div className="text-center pt-2">
              <Button variant="secondary" onClick={() => loadMore(20)}>Load More</Button>
            </div>
          )}
        </div>
      )}

      <Dialog open={!!reviewTarget} onOpenChange={(o) => { if (!o) { setReviewTarget(null); setReviewerNote(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {reviewTarget?.decision === "approved" ? "Approve" : "Reject"} verification
            </DialogTitle>
          </DialogHeader>
          <Textarea
            placeholder="Note to the applicant (optional)…"
            value={reviewerNote}
            onChange={(e) => setReviewerNote(e.target.value)}
          />
          <DialogFooter>
            <Button variant="secondary" onClick={() => setReviewTarget(null)}>Cancel</Button>
            <Button
              variant={reviewTarget?.decision === "approved" ? "default" : "destructive"}
              disabled={busy}
              onClick={handleReview}
            >
              {busy ? "Saving…" : reviewTarget?.decision === "approved" ? "Approve" : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
