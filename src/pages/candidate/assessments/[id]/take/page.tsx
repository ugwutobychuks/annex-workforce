import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import type { Id } from "@/convex/_generated/dataModel";

export default function TakeAssessment() {
  const { id } = useParams<{ id: string }>();
  const [params] = useSearchParams();
  const attemptId = params.get("attempt") as Id<"assessmentAttempts"> | null;
  const assessmentId = id as Id<"assessments">;
  const data = useQuery(api.assessments.getAssessmentForTake, id ? { id: assessmentId } : "skip");
  const submit = useMutation(api.assessments.submitAttempt);
  const navigate = useNavigate();

  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ score: number; passed: boolean } | null>(null);

  if (data === undefined) return <Skeleton className="h-64" />;
  if (data === null) return <p className="text-muted-foreground">This assessment isn't available.</p>;
  if (!attemptId) return <p className="text-destructive">Missing attempt id — open from the assessments list.</p>;

  const { assessment, questions } = data;
  const done = Object.keys(answers).length === questions.length;

  const handleSubmit = async () => {
    if (!done) {
      toast.error("Answer every question first.");
      return;
    }
    setBusy(true);
    try {
      const r = await submit({
        attemptId,
        answers: Object.entries(answers).map(([qid, sel]) => ({
          questionId: qid as Id<"assessmentQuestions">,
          selectedIndex: sel,
        })),
      });
      setResult(r);
    } catch (err: unknown) {
      toast.error((err as { data?: { message?: string } }).data?.message ?? "Failed.");
    } finally {
      setBusy(false);
    }
  };

  if (result) {
    return (
      <div className="max-w-2xl space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>
              {result.passed ? "You passed!" : "Not this time"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Badge variant={result.passed ? "default" : "destructive"} className="text-lg px-4 py-1">
              {result.score}%
            </Badge>
            <p className="text-sm text-muted-foreground">
              {result.passed
                ? `A verified "${assessment.skill}" badge now shows on your profile.`
                : "You can retake later once the employer allows it."}
            </p>
            <Button onClick={() => navigate("/candidate/assessments")}>Back to assessments</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold">{assessment.title}</h2>
        <p className="text-muted-foreground mt-1">
          {questions.length} questions · pass ≥ {assessment.passingScore}%
          {assessment.timeLimitMinutes ? ` · ${assessment.timeLimitMinutes} min limit` : ""}
        </p>
      </div>

      <div className="space-y-4">
        {questions.map((q, i) => (
          <Card key={q._id}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{i + 1}. {q.prompt}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {q.options.map((o, oi) => (
                <label key={oi} className="flex items-start gap-2 cursor-pointer text-sm">
                  <input
                    type="radio"
                    name={q._id}
                    checked={answers[q._id] === oi}
                    onChange={() => setAnswers({ ...answers, [q._id]: oi })}
                  />
                  <span>{o}</span>
                </label>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <Button disabled={busy || !done} onClick={handleSubmit}>
          {busy ? "Submitting…" : `Submit (${Object.keys(answers).length}/${questions.length})`}
        </Button>
        <Button variant="ghost" onClick={() => navigate("/candidate/assessments")}>Cancel</Button>
      </div>
    </div>
  );
}
