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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ChevronLeftIcon, PlusIcon, TrashIcon, CheckIcon, EyeIcon, ArchiveIcon } from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel";

export default function AssessmentDetail() {
  const params = useParams<{ id: string }>();
  const id = params.id as Id<"assessments">;
  const data = useQuery(api.assessments.getAssessmentDetail, id ? { id } : "skip");
  const addQuestion = useMutation(api.assessments.addQuestion);
  const removeQuestion = useMutation(api.assessments.removeQuestion);
  const setStatus = useMutation(api.assessments.setAssessmentStatus);
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [options, setOptions] = useState<string[]>(["", "", "", ""]);
  const [correct, setCorrect] = useState(0);
  const [busy, setBusy] = useState(false);

  if (data === undefined) return <Skeleton className="h-64 w-full" />;
  if (data === null) return <p className="text-muted-foreground">Not found.</p>;

  const { assessment, questions, attempts } = data;

  const submitQuestion = async () => {
    const cleaned = options.map((o) => o.trim()).filter(Boolean);
    if (!prompt || cleaned.length < 2 || correct < 0 || correct >= cleaned.length) {
      toast.error("Prompt + 2+ options + valid correct answer required.");
      return;
    }
    setBusy(true);
    try {
      await addQuestion({ assessmentId: id, prompt, options: cleaned, correctIndex: correct });
      setPrompt(""); setOptions(["", "", "", ""]); setCorrect(0);
      setOpen(false);
      toast.success("Question added.");
    } catch (err: unknown) {
      toast.error((err as { data?: { message?: string } }).data?.message ?? "Failed.");
    } finally {
      setBusy(false);
    }
  };

  const publish = async () => {
    try {
      await setStatus({ id, status: "published" });
      toast.success("Published.");
    } catch (err: unknown) {
      toast.error((err as { data?: { message?: string } }).data?.message ?? "Failed.");
    }
  };
  const archive = async () => {
    try { await setStatus({ id, status: "archived" }); toast.success("Archived."); } catch {}
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <Button variant="ghost" size="sm" onClick={() => navigate("/employer/assessments")}>
        <ChevronLeftIcon className="w-4 h-4 mr-1" /> Assessments
      </Button>

      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold">{assessment.title}</h2>
          <p className="text-muted-foreground mt-1">
            Skill: <span className="font-medium">{assessment.skill}</span> · Pass ≥ {assessment.passingScore}%
            {assessment.timeLimitMinutes ? ` · ${assessment.timeLimitMinutes} min` : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant={assessment.status === "published" ? "default" : "secondary"} className="capitalize">
            {assessment.status}
          </Badge>
          {assessment.status === "draft" && (
            <Button size="sm" onClick={publish}>
              <EyeIcon className="w-4 h-4 mr-1" /> Publish
            </Button>
          )}
          {assessment.status === "published" && (
            <Button size="sm" variant="secondary" onClick={archive}>
              <ArchiveIcon className="w-4 h-4 mr-1" /> Archive
            </Button>
          )}
        </div>
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Questions ({questions.length})
          </h3>
          <Button size="sm" onClick={() => setOpen(true)}>
            <PlusIcon className="w-4 h-4 mr-1" /> Add question
          </Button>
        </div>
        {questions.length === 0 ? (
          <p className="text-sm text-muted-foreground rounded-xl border border-dashed py-8 text-center">
            No questions yet. Add at least one before publishing.
          </p>
        ) : (
          <div className="space-y-3">
            {questions.map((q, i) => (
              <Card key={q._id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-3">
                    <CardTitle className="text-base">{i + 1}. {q.prompt}</CardTitle>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-destructive"
                      onClick={() => removeQuestion({ questionId: q._id })}
                    >
                      <TrashIcon className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-1">
                  {q.options.map((o, oi) => (
                    <div key={oi} className="text-sm flex items-center gap-2">
                      {oi === q.correctIndex ? (
                        <CheckIcon className="w-3.5 h-3.5 text-green-600" />
                      ) : (
                        <span className="w-3.5 h-3.5 inline-block" />
                      )}
                      <span className={oi === q.correctIndex ? "font-medium" : ""}>{o}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Attempts ({attempts.length})
        </h3>
        {attempts.length === 0 ? (
          <p className="text-sm text-muted-foreground">No candidates have taken this yet.</p>
        ) : (
          <div className="grid gap-2">
            {attempts.map((att) => (
              <Card key={att._id}>
                <CardContent className="py-3 flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{att.candidate?.name ?? "Unknown"}</p>
                    <p className="text-xs text-muted-foreground">
                      {att.submittedAt
                        ? `Submitted ${new Date(att.submittedAt).toLocaleString()}`
                        : `Started ${new Date(att.startedAt).toLocaleString()} — in progress`}
                    </p>
                  </div>
                  {att.submittedAt && (
                    <Badge variant={att.passed ? "default" : "destructive"}>
                      {att.score}% — {att.passed ? "Passed" : "Failed"}
                    </Badge>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>New question</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Prompt</Label>
              <Input value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="What does useEffect run?" />
            </div>
            {options.map((o, i) => (
              <div key={i}>
                <Label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="correct"
                    checked={correct === i}
                    onChange={() => setCorrect(i)}
                  />
                  Option {i + 1}
                </Label>
                <Input
                  value={o}
                  onChange={(e) => {
                    const next = [...options];
                    next[i] = e.target.value;
                    setOptions(next);
                  }}
                />
              </div>
            ))}
            <p className="text-xs text-muted-foreground">Radio button marks the correct answer.</p>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button disabled={busy} onClick={submitQuestion}>{busy ? "Adding…" : "Add question"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
