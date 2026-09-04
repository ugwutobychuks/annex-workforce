import { usePaginatedQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog.tsx";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu.tsx";
import { PlusIcon, MoreHorizontalIcon, MapPinIcon, DollarSignIcon, EditIcon, TrashIcon, EyeIcon, EyeOffIcon, XCircleIcon, StarIcon, SparklesIcon } from "lucide-react";
import { AiMatchDialog } from "@/components/ai-match-dialog.tsx";
import { JobForm, type JobFormValues } from "./_components/job-form.tsx";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { ConvexError } from "convex/values";

type Job = {
  _id: Id<"jobs">;
  title: string;
  company: string;
  location: string;
  type: "full-time" | "part-time" | "contract" | "internship";
  salary?: string;
  skills: string[];
  status: "draft" | "published" | "closed";
  _creationTime: number;
};

const STATUS_STYLES = {
  draft:     "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
  published: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  closed:    "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
};

export default function JobPostings() {
  const { results, status, loadMore } = usePaginatedQuery(
    api.employer.listMyJobs,
    {},
    { initialNumItems: 20 }
  );

  const createJob = useMutation(api.jobs.createJob);
  const updateJob = useMutation(api.employer.updateJob);
  const updateStatus = useMutation(api.employer.updateJobStatus);
  const deleteJob = useMutation(api.employer.deleteJob);
  const featureCheckout = useAction(api.payments.featureJobCheckout);

  const [createOpen, setCreateOpen] = useState(false);
  const [editJob, setEditJob] = useState<Job | null>(null);
  const [matchJob, setMatchJob] = useState<Job | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleCreate = async (data: JobFormValues) => {
    setSubmitting(true);
    try {
      await createJob(data);
      toast.success(`Job ${data.status === "published" ? "published" : "saved as draft"}!`);
      setCreateOpen(false);
    } catch (err) {
      if (err instanceof ConvexError) toast.error((err.data as { message: string }).message);
      else toast.error("Failed to create job.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (data: JobFormValues) => {
    if (!editJob) return;
    setSubmitting(true);
    try {
      await updateJob({ id: editJob._id, ...data });
      toast.success("Job updated!");
      setEditJob(null);
    } catch {
      toast.error("Failed to update job.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (id: Id<"jobs">, newStatus: "draft" | "published" | "closed") => {
    try {
      await updateStatus({ id, status: newStatus });
      toast.success(`Job ${newStatus === "published" ? "published" : newStatus === "closed" ? "closed" : "moved to draft"}!`);
    } catch {
      toast.error("Failed to update status.");
    }
  };

  const handleFeature = async (id: Id<"jobs">) => {
    try {
      const res = await featureCheckout({
        jobId: id,
        callbackUrl: `${window.location.origin}/employer/billing`,
      });
      if (res.autoSucceeded) {
        toast.success("Featured! (stub payment) — appears at top of listings for 7 days.");
      } else {
        window.location.href = res.checkoutUrl;
      }
    } catch (err: unknown) {
      toast.error((err as { data?: { message?: string } }).data?.message ?? "Payment init failed.");
    }
  };

  const handleDelete = async (id: Id<"jobs">) => {
    try {
      await deleteJob({ id });
      toast.success("Job deleted.");
    } catch {
      toast.error("Failed to delete job.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Job Postings</h2>
          <p className="text-muted-foreground mt-1">Manage your open positions.</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <PlusIcon className="w-4 h-4 mr-2" /> Post a Job
        </Button>
      </div>

      {status === "LoadingFirstPage" ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
      ) : results.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground border rounded-xl border-dashed">
          <p className="font-medium">No job postings yet</p>
          <p className="text-sm mt-1">Post your first job to start receiving applications.</p>
          <Button variant="secondary" className="mt-4" onClick={() => setCreateOpen(true)}>
            <PlusIcon className="w-4 h-4 mr-2" /> Post a Job
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {results.map((job) => {
            const j = job as Job;
            return (
              <Card key={j._id} className="hover:border-primary/40 transition-colors">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <CardTitle className="text-base truncate">{j.title}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-0.5">{j.company}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ${STATUS_STYLES[j.status]}`}>
                        {j.status}
                      </span>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="icon" variant="ghost" className="h-8 w-8">
                            <MoreHorizontalIcon className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setEditJob(j)}>
                            <EditIcon className="w-3.5 h-3.5 mr-2" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleFeature(j._id)}>
                            <StarIcon className="w-3.5 h-3.5 mr-2" /> Feature (₦15,000 / 7 days)
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setMatchJob(j)}>
                            <SparklesIcon className="w-3.5 h-3.5 mr-2" /> AI match candidates
                          </DropdownMenuItem>
                          {j.status !== "published" && (
                            <DropdownMenuItem onClick={() => handleStatusChange(j._id, "published")}>
                              <EyeIcon className="w-3.5 h-3.5 mr-2" /> Publish
                            </DropdownMenuItem>
                          )}
                          {j.status === "published" && (
                            <DropdownMenuItem onClick={() => handleStatusChange(j._id, "draft")}>
                              <EyeOffIcon className="w-3.5 h-3.5 mr-2" /> Move to Draft
                            </DropdownMenuItem>
                          )}
                          {j.status !== "closed" && (
                            <DropdownMenuItem onClick={() => handleStatusChange(j._id, "closed")}>
                              <XCircleIcon className="w-3.5 h-3.5 mr-2" /> Close Job
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => handleDelete(j._id)}
                          >
                            <TrashIcon className="w-3.5 h-3.5 mr-2" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mb-2">
                    <span className="flex items-center gap-1"><MapPinIcon className="w-3 h-3" />{j.location}</span>
                    {j.salary && <span className="flex items-center gap-1"><DollarSignIcon className="w-3 h-3" />{j.salary}</span>}
                    <span className="capitalize">{j.type}</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {j.skills.slice(0, 5).map((s) => <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>)}
                    {j.skills.length > 5 && <Badge variant="secondary" className="text-xs">+{j.skills.length - 5}</Badge>}
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {status === "CanLoadMore" && (
            <div className="text-center pt-2">
              <Button variant="secondary" onClick={() => loadMore(20)}>Load More</Button>
            </div>
          )}
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Post a New Job</DialogTitle></DialogHeader>
          <JobForm onSubmit={handleCreate} submitting={submitting} />
        </DialogContent>
      </Dialog>

      {matchJob && (
        <AiMatchDialog
          jobId={matchJob._id}
          jobTitle={matchJob.title}
          open={!!matchJob}
          onClose={() => setMatchJob(null)}
        />
      )}

      {/* Edit dialog */}
      <Dialog open={!!editJob} onOpenChange={(o) => { if (!o) setEditJob(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit Job</DialogTitle></DialogHeader>
          {editJob && (
            <JobForm
              onSubmit={handleUpdate}
              submitting={submitting}
              defaultValues={{
                ...editJob,
                status: editJob.status === "closed" ? "draft" : editJob.status,
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
