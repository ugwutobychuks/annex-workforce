import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ClipboardCheckIcon } from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel";

export default function CandidateAssessments() {
  const rows = useQuery(api.assessments.listPublishedAssessments);
  const start = useMutation(api.assessments.startAttempt);
  const navigate = useNavigate();

  const go = async (id: Id<"assessments">) => {
    try {
      const attemptId = await start({ assessmentId: id });
      navigate(`/candidate/assessments/${id}/take?attempt=${attemptId}`);
    } catch (err: unknown) {
      toast.error((err as { data?: { message?: string } }).data?.message ?? "Failed.");
    }
  };

  if (rows === undefined) {
    return <div className="space-y-2 max-w-3xl">{Array.from({length:3}).map((_,i)=><Skeleton key={i} className="h-24"/>)}</div>;
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-2xl font-bold">Skills Assessments</h2>
        <p className="text-muted-foreground mt-1">
          Prove your skills with quick multiple-choice tests. Passing scores appear as verified badges on your profile.
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed py-16 text-center text-muted-foreground">
          <ClipboardCheckIcon className="mx-auto mb-3 h-10 w-10 opacity-30" />
          <p className="font-medium">No assessments available yet.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {rows.map((a) => (
            <Card key={a._id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-base">{a.title}</CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Skill: <span className="font-medium">{a.skill}</span> · Pass ≥ {a.passingScore}%
                      {a.timeLimitMinutes ? ` · ${a.timeLimitMinutes} min` : ""}
                    </p>
                  </div>
                  {a.mine?.submittedAt ? (
                    <Badge variant={a.mine.passed ? "default" : "destructive"}>
                      {a.mine.score}% — {a.mine.passed ? "Passed" : "Failed"}
                    </Badge>
                  ) : a.mine ? (
                    <Badge variant="secondary">In progress</Badge>
                  ) : null}
                </div>
              </CardHeader>
              <CardContent className="flex items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">
                  {a.description ?? `Test by ${a.owner?.name ?? "employer"}`}
                </p>
                {!a.mine?.submittedAt && (
                  <Button size="sm" onClick={() => go(a._id)}>
                    {a.mine ? "Continue" : "Start"}
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
