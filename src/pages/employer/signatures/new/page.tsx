import { useQuery, useMutation, usePaginatedQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Id } from "@/convex/_generated/dataModel";

const TEMPLATES: Record<string, string> = {
  offer_letter: `[Company Name] is pleased to offer you the position of [Job Title].
Start date: [DATE]
Compensation: ₦[amount] per month.

By signing this offer letter, you accept the terms and conditions outlined above and confirm your intent to join our team.`,
  eor_contract: `This Employer-of-Record contract is between [Company Name] (the Employer)
and [Candidate Name] (the Employee), effective [DATE].

The Employee will render services as a [Role]. Compensation, benefits,
and statutory deductions (PAYE, pension, NHF) are administered per
Nigerian law and detailed in the appended schedule.

Termination requires 30 days' written notice.`,
  custom: "",
};

export default function NewSignatureDocument() {
  const talent = usePaginatedQuery(api.employer.searchTalentPool, { search: undefined }, { initialNumItems: 200 });
  const create = useMutation(api.signatures.createDocument);
  const navigate = useNavigate();
  const [target, setTarget] = useState("");
  const [kind, setKind] = useState<"offer_letter" | "eor_contract" | "custom">("offer_letter");
  const [title, setTitle] = useState("Offer letter");
  const [content, setContent] = useState(TEMPLATES.offer_letter);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!target || !title || content.trim().length < 20) {
      toast.error("Recipient, title, and a real body are required.");
      return;
    }
    setBusy(true);
    try {
      const id = await create({
        targetUserId: target as Id<"users">,
        title, kind, content,
      });
      toast.success("Draft created — send when ready.");
      navigate(`/employer/signatures/${id}`);
    } catch (err: unknown) {
      toast.error((err as {data?:{message?:string}}).data?.message ?? "Failed.");
    } finally { setBusy(false); }
  };

  const chooseKind = (v: string) => {
    const k = v as typeof kind;
    setKind(k);
    setContent(TEMPLATES[k] ?? "");
    setTitle(k === "offer_letter" ? "Offer letter" : k === "eor_contract" ? "EOR contract" : "Document");
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold">New signature document</h2>
        <p className="text-muted-foreground mt-1">Draft here, then send to the recipient. They sign in-app.</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Details</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>Recipient</Label>
            <Select value={target} onValueChange={setTarget}>
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
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Kind</Label>
              <Select value={kind} onValueChange={chooseKind}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="offer_letter">Offer letter</SelectItem>
                  <SelectItem value="eor_contract">EOR contract</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Body</Label>
            <Textarea rows={14} value={content} onChange={(e) => setContent(e.target.value)} />
          </div>
          <Button onClick={submit} disabled={busy}>{busy ? "Saving…" : "Create draft"}</Button>
        </CardContent>
      </Card>
    </div>
  );
}
