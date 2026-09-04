import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { StarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Id } from "@/convex/_generated/dataModel";

/**
 * Star-picker dialog for post-hire reviews. Rendered from candidate
 * application cards and employer applicant detail dialogs — only when
 * the underlying application status is "hired" and the viewer hasn't
 * already left a review.
 */
export function RateHireDialog({
  applicationId,
  open,
  onClose,
}: {
  applicationId: Id<"applications">;
  open: boolean;
  onClose: () => void;
}) {
  const info = useQuery(api.reviews.canReview, applicationId && open ? { applicationId } : "skip");
  const submit = useMutation(api.reviews.submitReview);
  const [rating, setRating] = useState<number>(5);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);

  const doSubmit = async () => {
    setBusy(true);
    try {
      await submit({ applicationId, rating, comment: comment || undefined });
      toast.success("Thanks for the review.");
      onClose(); setRating(5); setComment("");
    } catch (err: unknown) {
      toast.error((err as {data?:{message?:string}}).data?.message ?? "Failed.");
    } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent>
        <DialogHeader><DialogTitle>Rate this hire</DialogTitle></DialogHeader>
        {info === undefined ? null : !info.allowed ? (
          <p className="text-sm text-muted-foreground">
            {info.alreadyDone
              ? "You already left a review for this hire."
              : "Reviews open once the application status is set to Hired."}
          </p>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRating(n)}
                  aria-label={`${n} stars`}
                >
                  <StarIcon
                    className={cn("w-8 h-8", n <= rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground")}
                  />
                </button>
              ))}
            </div>
            <Textarea
              rows={3}
              placeholder="What was it like working together? (optional)"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </div>
        )}
        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>Close</Button>
          {info?.allowed && (
            <Button disabled={busy} onClick={doSubmit}>{busy ? "Submitting…" : "Submit review"}</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Compact stars + total, for profile headers. */
export function ReviewsSummary({ userId }: { userId: Id<"users"> }) {
  const data = useQuery(api.reviews.listForUser, { userId });
  if (data === undefined) return null;
  if (data.total === 0) {
    return <span className="text-xs text-muted-foreground">No reviews yet</span>;
  }
  return (
    <div className="flex items-center gap-1 text-sm">
      {[1, 2, 3, 4, 5].map((n) => (
        <StarIcon
          key={n}
          className={cn("w-4 h-4", n <= Math.round(data.average) ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground")}
        />
      ))}
      <span className="text-xs text-muted-foreground ml-1">
        {data.average} ({data.total})
      </span>
    </div>
  );
}
