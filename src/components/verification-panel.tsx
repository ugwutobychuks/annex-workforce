import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { ShieldCheckIcon, ClockIcon, XCircleIcon } from "lucide-react";

/**
 * Shared verification panel used on candidate profile and employer company pages.
 * Shows current verified state and a request-verification form when eligible.
 */
export default function VerificationPanel() {
  const status = useQuery(api.verification.getMyVerificationStatus);
  const request = useMutation(api.verification.requestVerification);
  const [note, setNote] = useState("");
  const [documentUrl, setDocumentUrl] = useState("");
  const [busy, setBusy] = useState(false);

  if (status === undefined) return null;
  if (status === null) return null;

  const latest = status.requests[0];
  const pending = latest?.status === "pending";

  const submit = async () => {
    setBusy(true);
    try {
      await request({ note: note || undefined, documentUrl: documentUrl || undefined });
      toast.success("Verification request submitted.");
      setNote("");
      setDocumentUrl("");
    } catch (err: unknown) {
      toast.error((err as { data?: { message?: string } }).data?.message ?? "Failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <ShieldCheckIcon className="w-5 h-5 text-primary" />
          <CardTitle className="text-base">Verification</CardTitle>
          {status.isVerified && <Badge className="ml-auto">Verified</Badge>}
          {!status.isVerified && pending && <Badge variant="secondary" className="ml-auto">Pending review</Badge>}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {status.isVerified ? (
          <p className="text-sm text-muted-foreground">
            Your account is verified. A verified badge appears on your public profile.
          </p>
        ) : pending ? (
          <div className="flex items-start gap-2 text-sm">
            <ClockIcon className="w-4 h-4 mt-0.5 text-yellow-500 shrink-0" />
            <p className="text-muted-foreground">
              Your request is in the review queue. You'll be notified when a decision is made.
            </p>
          </div>
        ) : (
          <>
            {latest?.status === "rejected" && (
              <div className="flex items-start gap-2 text-sm bg-destructive/10 rounded-lg p-3">
                <XCircleIcon className="w-4 h-4 mt-0.5 text-destructive shrink-0" />
                <div>
                  <p className="font-medium">Previous request rejected.</p>
                  {latest.reviewerNote && (
                    <p className="text-muted-foreground mt-1">{latest.reviewerNote}</p>
                  )}
                </div>
              </div>
            )}
            <p className="text-sm text-muted-foreground">
              Submit a request for our team to review your account. Attach a link to any
              supporting document (LinkedIn, corporate registration, portfolio).
            </p>
            <Input
              placeholder="Supporting document URL (optional)"
              value={documentUrl}
              onChange={(e) => setDocumentUrl(e.target.value)}
            />
            <Textarea
              placeholder="Anything you'd like the reviewer to know (optional)…"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            <Button disabled={busy} onClick={submit}>
              {busy ? "Submitting…" : "Request Verification"}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
