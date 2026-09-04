import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ClipboardCheckIcon, PlusIcon } from "lucide-react";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive"> = {
  draft: "secondary",
  published: "default",
  archived: "destructive",
};

export default function EmployerAssessments() {
  const rows = useQuery(api.assessments.listMyAssessments);
  const create = useMutation(api.assessments.createAssessment);
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [skill, setSkill] = useState("");
  const [description, setDescription] = useState("");
  const [passing, setPassing] = useState("70");
  const [timeLimit, setTimeLimit] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!title || !skill) {
      toast.error("Title and skill are required.");
      return;
    }
    const p = Number(passing);
    if (!Number.isFinite(p) || p < 0 || p > 100) {
      toast.error("Passing score must be 0-100.");
      return;
    }
    setBusy(true);
    try {
      const id = await create({
        title,
        skill,
        description: description || undefined,
        passingScore: p,
        timeLimitMinutes: timeLimit ? Number(timeLimit) : undefined,
      });
      toast.success("Assessment created as draft — add questions and publish.");
      setOpen(false);
      setTitle(""); setSkill(""); setDescription(""); setPassing("70"); setTimeLimit("");
      navigate(`/employer/assessments/${id}`);
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
          <h2 className="text-2xl font-bold">Skills Assessments</h2>
          <p className="text-muted-foreground mt-1">
            Author multiple-choice tests candidates can take. Passing candidates get a verified skill badge on their profile.
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <PlusIcon className="w-4 h-4 mr-2" /> New assessment
        </Button>
      </div>

      {rows === undefined ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20" />)}
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-dashed py-16 text-center text-muted-foreground">
          <ClipboardCheckIcon className="mx-auto mb-3 h-10 w-10 opacity-30" />
          <p className="font-medium">No assessments yet.</p>
          <p className="text-sm mt-1">Create one to start scoring candidates on real skills.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {rows.map((a) => (
            <Card
              key={a._id}
              className="cursor-pointer hover:border-primary/40"
              onClick={() => navigate(`/employer/assessments/${a._id}`)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-base">{a.title}</CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Skill: <span className="font-medium">{a.skill}</span> · Pass ≥ {a.passingScore}%
                      {a.timeLimitMinutes ? ` · ${a.timeLimitMinutes} min limit` : ""}
                    </p>
                  </div>
                  <Badge variant={STATUS_VARIANT[a.status] ?? "secondary"} className="capitalize">
                    {a.status}
                  </Badge>
                </div>
              </CardHeader>
              {a.description && (
                <CardContent className="text-sm text-muted-foreground">{a.description}</CardContent>
              )}
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New assessment</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="React Fundamentals" /></div>
            <div><Label>Skill tag</Label><Input value={skill} onChange={(e) => setSkill(e.target.value)} placeholder="react" /></div>
            <div><Label>Description (optional)</Label><Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Passing score (%)</Label><Input type="number" min={0} max={100} value={passing} onChange={(e) => setPassing(e.target.value)} /></div>
              <div><Label>Time limit (minutes, optional)</Label><Input type="number" min={1} value={timeLimit} onChange={(e) => setTimeLimit(e.target.value)} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button disabled={busy} onClick={submit}>{busy ? "Creating…" : "Create draft"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
