import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { useParams, useNavigate } from "react-router-dom";
import { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ChevronLeftIcon, SendIcon, CheckCircleIcon, XCircleIcon, DownloadIcon, ShieldCheckIcon } from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel";
import { sha256Hex } from "@/lib/hash";

export default function SignatureDetail() {
  const { id } = useParams<{ id: string }>();
  const docId = id as Id<"signatureDocuments">;
  const data = useQuery(api.signatures.getDocument, id ? { id: docId } : "skip");
  const send = useMutation(api.signatures.sendDocument);
  const sign = useMutation(api.signatures.signDocument);
  const decline = useMutation(api.signatures.declineDocument);
  const navigate = useNavigate();

  const [signOpen, setSignOpen] = useState(false);
  const [signText, setSignText] = useState("");
  const [declineOpen, setDeclineOpen] = useState(false);
  const [declineReason, setDeclineReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [verifyResult, setVerifyResult] = useState<{
    contentOk: boolean;
    signatureOk: boolean;
    computedContentHash: string;
    computedSignatureHash: string;
  } | null>(null);
  const [verifying, setVerifying] = useState(false);

  if (data === undefined) return <Skeleton className="h-64" />;
  if (data === null) return <p className="text-muted-foreground">Not found.</p>;

  const isOwner = data.viewerId === data.ownerId;
  const isTarget = data.viewerId === data.targetUserId;

  const doSend = async () => { try { await send({ id: docId }); toast.success("Sent."); } catch (e:unknown) { toast.error((e as {data?:{message?:string}}).data?.message ?? "Failed."); } };
  const doSign = async () => {
    setBusy(true);
    try { await sign({ id: docId, signatureText: signText }); toast.success("Signed."); setSignOpen(false); }
    catch (e:unknown) { toast.error((e as {data?:{message?:string}}).data?.message ?? "Failed."); }
    finally { setBusy(false); }
  };
  const doDecline = async () => {
    setBusy(true);
    try { await decline({ id: docId, reason: declineReason || undefined }); toast.success("Declined."); setDeclineOpen(false); }
    catch (e:unknown) { toast.error((e as {data?:{message?:string}}).data?.message ?? "Failed."); }
    finally { setBusy(false); }
  };

  // Recompute both hashes in the browser and compare against what the
  // server stored at signing time. This is the "tamper-evidence" promise
  // made in the design doc — anyone can run it, no server call required.
  const verify = async () => {
    if (!data) return;
    setVerifying(true);
    try {
      const computedContentHash = await sha256Hex(data.content);
      let computedSignatureHash = "";
      if (data.status === "signed" && data.signedAt && data.signatureText) {
        computedSignatureHash = await sha256Hex(
          `${data.contentHash}|${data.signatureText}|${data.targetUserId}|${data.signedAt}`,
        );
      }
      setVerifyResult({
        contentOk: computedContentHash === data.contentHash,
        signatureOk:
          data.status === "signed" ? computedSignatureHash === data.signatureHash : true,
        computedContentHash,
        computedSignatureHash,
      });
    } finally {
      setVerifying(false);
    }
  };

  const downloadTxt = () => {
    const parts = [
      data.title,
      "─".repeat(40),
      data.content,
      "",
      "─".repeat(40),
    ];
    if (data.status === "signed") {
      parts.push(
        `Signed by: ${data.signatureText}`,
        `Recipient user id: ${data.targetUserId}`,
        `Signed at: ${new Date(data.signedAt!).toISOString()}`,
        `Content hash (SHA-256): ${data.contentHash}`,
        `Signature hash: ${data.signatureHash}`,
      );
    } else {
      parts.push(`Status: ${data.status}`);
    }
    const blob = new Blob([parts.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${data.title.replace(/[^a-z0-9-_]+/gi, "_")}.txt`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-3xl space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
        <ChevronLeftIcon className="w-4 h-4 mr-1" /> Back
      </Button>

      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold">{data.title}</h2>
          <p className="text-xs text-muted-foreground mt-0.5 capitalize">
            {data.kind.replace("_", " ")} · from {data.owner?.name ?? "?"} → {data.target?.name ?? "?"}
          </p>
        </div>
        <Badge variant={data.status === "signed" ? "default" : data.status === "declined" ? "destructive" : "secondary"} className="capitalize">
          {data.status}
        </Badge>
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Document</CardTitle></CardHeader>
        <CardContent>
          <pre className="whitespace-pre-wrap text-sm font-sans">{data.content}</pre>
        </CardContent>
      </Card>

      {data.status === "signed" && (
        <Card className="border-primary/40">
          <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2">
            <CheckCircleIcon className="w-4 h-4 text-primary" /> Signature
          </CardTitle></CardHeader>
          <CardContent className="text-sm space-y-1">
            <p><span className="text-muted-foreground">Signed by:</span> {data.signatureText}</p>
            <p><span className="text-muted-foreground">At:</span> {new Date(data.signedAt!).toLocaleString()}</p>
            <p className="text-xs text-muted-foreground break-all">
              <span className="text-muted-foreground">Content hash:</span> {data.contentHash}
            </p>
            <p className="text-xs text-muted-foreground break-all">
              <span className="text-muted-foreground">Signature hash:</span> {data.signatureHash}
            </p>
          </CardContent>
        </Card>
      )}

      {verifyResult && (
        <Card className={
          verifyResult.contentOk && verifyResult.signatureOk
            ? "border-primary/40"
            : "border-destructive/40 bg-destructive/5"
        }>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              {verifyResult.contentOk && verifyResult.signatureOk ? (
                <>
                  <ShieldCheckIcon className="w-4 h-4 text-primary" />
                  Integrity verified
                </>
              ) : (
                <>
                  <XCircleIcon className="w-4 h-4 text-destructive" />
                  Tampering detected
                </>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs space-y-1">
            <p>
              Content hash:{" "}
              {verifyResult.contentOk
                ? <span className="text-primary">matches</span>
                : <span className="text-destructive">changed since signing</span>}
            </p>
            {data.status === "signed" && (
              <p>
                Signature hash:{" "}
                {verifyResult.signatureOk
                  ? <span className="text-primary">matches</span>
                  : <span className="text-destructive">does not match</span>}
              </p>
            )}
            <p className="text-muted-foreground break-all">
              Recomputed content: {verifyResult.computedContentHash}
            </p>
            {data.status === "signed" && (
              <p className="text-muted-foreground break-all">
                Recomputed signature: {verifyResult.computedSignatureHash}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" onClick={verify} disabled={verifying}>
          <ShieldCheckIcon className="w-4 h-4 mr-2" />
          {verifying ? "Verifying…" : "Verify integrity"}
        </Button>
        <Button variant="secondary" onClick={downloadTxt}>
          <DownloadIcon className="w-4 h-4 mr-2" /> Download .txt
        </Button>
        {isOwner && data.status === "draft" && (
          <Button onClick={doSend}><SendIcon className="w-4 h-4 mr-2" /> Send to recipient</Button>
        )}
        {isTarget && data.status === "sent" && (
          <>
            <Button onClick={() => setSignOpen(true)}><CheckCircleIcon className="w-4 h-4 mr-2" /> Sign</Button>
            <Button variant="destructive" onClick={() => setDeclineOpen(true)}><XCircleIcon className="w-4 h-4 mr-2" /> Decline</Button>
          </>
        )}
      </div>

      <Dialog open={signOpen} onOpenChange={setSignOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Sign this document</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            Type your full legal name below. Submitting binds you to the terms above.
          </p>
          <Input value={signText} onChange={(e) => setSignText(e.target.value)} placeholder="Ada Lovelace" />
          <DialogFooter>
            <Button variant="secondary" onClick={() => setSignOpen(false)}>Cancel</Button>
            <Button disabled={busy || signText.trim().length < 3} onClick={doSign}>Sign document</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={declineOpen} onOpenChange={setDeclineOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Decline this document</DialogTitle></DialogHeader>
          <Textarea value={declineReason} onChange={(e) => setDeclineReason(e.target.value)} placeholder="Optional reason for the sender" />
          <DialogFooter>
            <Button variant="secondary" onClick={() => setDeclineOpen(false)}>Cancel</Button>
            <Button variant="destructive" disabled={busy} onClick={doDecline}>Decline</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
