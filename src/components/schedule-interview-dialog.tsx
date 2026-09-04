import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Id } from "@/convex/_generated/dataModel";

/**
 * Employer-side dialog: schedule an interview against an application.
 * Uses two datetime-local inputs; converted to ms on submit.
 */
export function ScheduleInterviewDialog({
  applicationId,
  open,
  onClose,
}: {
  applicationId: Id<"applications">;
  open: boolean;
  onClose: () => void;
}) {
  const schedule = useMutation(api.interviews.schedule);

  const [title, setTitle] = useState("Screening call");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [location, setLocation] = useState("");
  const [meetingUrl, setMeetingUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!title || !start || !end) {
      toast.error("Title, start, and end are required.");
      return;
    }
    const startMs = new Date(start).getTime();
    const endMs = new Date(end).getTime();
    if (Number.isNaN(startMs) || Number.isNaN(endMs) || endMs <= startMs) {
      toast.error("Please pick a valid start and end.");
      return;
    }
    setBusy(true);
    try {
      await schedule({
        applicationId,
        title,
        scheduledAt: startMs,
        endAt: endMs,
        location: location || undefined,
        meetingUrl: meetingUrl || undefined,
        notes: notes || undefined,
      });
      toast.success("Interview scheduled.");
      onClose();
      setTitle("Screening call"); setStart(""); setEnd("");
      setLocation(""); setMeetingUrl(""); setNotes("");
    } catch (err: unknown) {
      toast.error((err as { data?: { message?: string } }).data?.message ?? "Failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Schedule interview</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Start</Label>
              <Input type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} />
            </div>
            <div>
              <Label>End</Label>
              <Input type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Location (optional)</Label>
            <Input placeholder="Office address, or leave blank for remote" value={location} onChange={(e) => setLocation(e.target.value)} />
          </div>
          <div>
            <Label>Meeting URL (optional)</Label>
            <Input placeholder="https://meet.google.com/..." value={meetingUrl} onChange={(e) => setMeetingUrl(e.target.value)} />
          </div>
          <div>
            <Label>Notes (optional)</Label>
            <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button disabled={busy} onClick={submit}>{busy ? "Scheduling…" : "Schedule"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
