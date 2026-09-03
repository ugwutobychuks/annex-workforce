import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { useParams, useNavigate } from "react-router-dom";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog.tsx";
import { ArrowLeftIcon, MapPinIcon, DollarSignIcon, CheckCircleIcon } from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { ConvexError } from "convex/values";

const JOB_TYPE_COLORS = {
  "full-time": "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  "part-time": "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  "contract": "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  "internship": "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
} as const;

export default function JobDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const job = useQuery(api.jobs.getById, id ? { id: id as Id<"jobs"> } : "skip");
  const hasApplied = useQuery(api.applications.hasApplied, id ? { jobId: id as Id<"jobs"> } : "skip");
  const applyMutation = useMutation(api.applications.apply);
  const [coverLetter, setCoverLetter] = useState("");
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (job === undefined) {
    return (
      <div className="max-w-3xl space-y-4">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="max-w-3xl text-center py-16">
        <p className="text-muted-foreground">Job not found.</p>
        <Button variant="secondary" className="mt-4" onClick={() => navigate("/candidate/jobs")}>
          Back to Jobs
        </Button>
      </div>
    );
  }

  const handleApply = async () => {
    setSubmitting(true);
    try {
      await applyMutation({ jobId: job._id, coverLetter: coverLetter || undefined });
      toast.success("Application submitted!");
      setOpen(false);
    } catch (err) {
      if (err instanceof ConvexError) {
        toast.error((err.data as { message: string }).message);
      } else {
        toast.error("Failed to apply. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const typeColor = JOB_TYPE_COLORS[job.type as keyof typeof JOB_TYPE_COLORS] ?? "";

  return (
    <div className="max-w-3xl space-y-6">
      <Button variant="ghost" size="sm" className="gap-2" onClick={() => navigate("/candidate/jobs")}>
        <ArrowLeftIcon className="w-4 h-4" /> Back to Jobs
      </Button>

      <div className="space-y-2">
        <div className="flex items-start gap-3 flex-wrap">
          <h2 className="text-2xl font-bold flex-1">{job.title}</h2>
          <span className={`text-xs px-2.5 py-1.5 rounded-full font-medium ${typeColor}`}>{job.type}</span>
        </div>
        <p className="text-lg text-muted-foreground">{job.company}</p>
        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5"><MapPinIcon className="w-4 h-4" />{job.location}</span>
          {job.salary && <span className="flex items-center gap-1.5"><DollarSignIcon className="w-4 h-4" />{job.salary}</span>}
        </div>
      </div>

      {job.skills.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {job.skills.map((s: string) => <Badge key={s} variant="secondary">{s}</Badge>)}
        </div>
      )}

      <div>
        {hasApplied ? (
          <div className="flex items-center gap-2 text-green-600 font-medium">
            <CheckCircleIcon className="w-5 h-5" /> You've applied to this job
          </div>
        ) : (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="lg">Apply Now</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Apply to {job.title}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium block mb-2">Cover Letter (optional)</label>
                  <Textarea
                    rows={6}
                    placeholder="Tell the employer why you're a great fit..."
                    value={coverLetter}
                    onChange={(e) => setCoverLetter(e.target.value)}
                  />
                </div>
                <Button className="w-full" onClick={handleApply} disabled={submitting}>
                  {submitting ? "Submitting..." : "Submit Application"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="space-y-4">
        <div>
          <h3 className="font-semibold mb-2">Job Description</h3>
          <div className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{job.description}</div>
        </div>
        <div>
          <h3 className="font-semibold mb-2">Requirements</h3>
          <div className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{job.requirements}</div>
        </div>
      </div>
    </div>
  );
}
