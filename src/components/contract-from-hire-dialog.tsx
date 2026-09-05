import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Id } from "@/convex/_generated/dataModel";

/**
 * One-click "hire → EOR contract" flow. Opens from the applicant detail
 * dialog for any application in status=hired that doesn't yet have a live
 * contract. Prefills candidate + job title so the employer only picks
 * gross, start date, country.
 */
export function ContractFromHireDialog({
  applicationId,
  candidateId,
  candidateName,
  jobTitle,
  open,
  onClose,
}: {
  applicationId: Id<"applications">;
  candidateId: Id<"users">;
  candidateName: string;
  jobTitle: string;
  open: boolean;
  onClose: () => void;
}) {
  // Guard: if a live contract already exists we surface a link instead of
  // letting the employer create a duplicate.
  const existing = useQuery(
    api.payroll.getContractForApplication,
    open ? { applicationId } : "skip",
  );
  const createContract = useMutation(api.payroll.createContract);
  const navigate = useNavigate();

  const [gross, setGross] = useState("");
  const [startDate, setStartDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [country, setCountry] = useState<"NG" | "KE" | "GH" | "ZA" | "EG">("NG");
  const [nhf, setNhf] = useState(false);
  const [busy, setBusy] = useState(false);

  const currencySymbol: Record<string, string> = {
    NG: "₦", KE: "KSh", GH: "GH₵", ZA: "R", EG: "E£",
  };

  const submit = async () => {
    const g = Number(gross);
    if (!g || g <= 0 || !startDate) {
      toast.error("Enter gross salary and start date.");
      return;
    }
    setBusy(true);
    try {
      const id = await createContract({
        candidateId,
        jobTitle,
        grossMonthlyNGN: g,
        startDate,
        nhfEligible: country === "NG" ? nhf : false,
        country,
        applicationId,
      });
      toast.success("Contract drafted — activate it from the payroll page to include in runs.");
      onClose();
      navigate(`/employer/payroll`);
      return id;
    } catch (err: unknown) {
      toast.error(
        (err as { data?: { message?: string } }).data?.message ?? "Failed.",
      );
    } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create EOR contract for {candidateName}</DialogTitle>
        </DialogHeader>
        {existing ? (
          <>
            <p className="text-sm text-muted-foreground">
              This hire already has a{" "}
              <span className="capitalize font-medium">{existing.status}</span> contract.
              You can manage it from the payroll page.
            </p>
            <DialogFooter>
              <Button variant="secondary" onClick={onClose}>Close</Button>
              <Button onClick={() => { onClose(); navigate("/employer/payroll"); }}>
                Go to payroll
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Role: <span className="font-medium">{jobTitle}</span>
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Country of employment</Label>
                  <Select value={country} onValueChange={(v) => setCountry(v as never)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NG">🇳🇬 Nigeria (NGN)</SelectItem>
                      <SelectItem value="KE">🇰🇪 Kenya (KES)</SelectItem>
                      <SelectItem value="GH">🇬🇭 Ghana (GHS)</SelectItem>
                      <SelectItem value="ZA">🇿🇦 South Africa (ZAR)</SelectItem>
                      <SelectItem value="EG">🇪🇬 Egypt (EGP)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Start date</Label>
                  <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                </div>
              </div>
              <div>
                <Label>Gross monthly ({currencySymbol[country]})</Label>
                <Input
                  type="number"
                  min="0"
                  value={gross}
                  onChange={(e) => setGross(e.target.value)}
                  placeholder="850000"
                />
              </div>
              {country === "NG" && (
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="text-sm font-medium">NHF eligible</p>
                    <p className="text-xs text-muted-foreground">2.5% National Housing Fund deduction.</p>
                  </div>
                  <Switch checked={nhf} onCheckedChange={setNhf} />
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="secondary" onClick={onClose}>Cancel</Button>
              <Button disabled={busy} onClick={submit}>{busy ? "Creating…" : "Create contract"}</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
