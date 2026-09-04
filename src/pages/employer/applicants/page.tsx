import { useQuery, useMutation, usePaginatedQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog.tsx";
import { UserIcon, BriefcaseIcon, MessageSquareIcon, CalendarIcon } from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { cn } from "@/lib/utils.ts";
import { useNavigate } from "react-router-dom";
import { ScheduleInterviewDialog } from "@/components/schedule-interview-dialog.tsx";

const PIPELINE_STAGES = [
  { key: "applied",     label: "Applied",     color: "bg-blue-500" },
  { key: "screening",   label: "Screening",   color: "bg-yellow-500" },
  { key: "shortlisted", label: "Shortlisted", color: "bg-purple-500" },
  { key: "interview",   label: "Interview",   color: "bg-indigo-500" },
  { key: "offer",       label: "Offer",       color: "bg-orange-500" },
  { key: "hired",       label: "Hired",       color: "bg-green-500" },
  { key: "rejected",    label: "Rejected",    color: "bg-red-500" },
] as const;

type Stage = typeof PIPELINE_STAGES[number]["key"];

type Applicant = {
  _id: Id<"applications">;
  status: Stage;
  coverLetter?: string;
  _creationTime: number;
  candidate: { _id: Id<"users">; name?: string; email?: string } | null;
  profile: { headline?: string; skills: string[]; isVerified?: boolean } | null;
};

function ApplicantCard({
  app,
  onStatusChange,
  onClick,
}: {
  app: Applicant;
  onStatusChange: (id: Id<"applications">, status: Stage) => void;
  onClick: () => void;
}) {
  return (
    <div
      className="bg-card border rounded-lg p-3 cursor-pointer hover:border-primary/40 transition-colors space-y-2"
      onClick={onClick}
    >
      <div className="flex items-start gap-2">
        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
          <UserIcon className="w-4 h-4 text-muted-foreground" />
        </div>
        <div className="min-w-0">
          <p className="font-medium text-sm truncate">{app.candidate?.name ?? "Unknown"}</p>
          <p className="text-xs text-muted-foreground truncate">{app.profile?.headline ?? app.candidate?.email ?? ""}</p>
        </div>
      </div>
      {app.profile?.skills && app.profile.skills.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {app.profile.skills.slice(0, 3).map((s) => (
            <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
          ))}
          {app.profile.skills.length > 3 && (
            <Badge variant="secondary" className="text-xs">+{app.profile.skills.length - 3}</Badge>
          )}
        </div>
      )}
      <div className="pt-1" onClick={(e) => e.stopPropagation()}>
        <Select value={app.status} onValueChange={(v) => onStatusChange(app._id, v as Stage)}>
          <SelectTrigger className="h-7 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PIPELINE_STAGES.map((s) => (
              <SelectItem key={s.key} value={s.key} className="text-xs">{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

function KanbanBoard({
  applicants,
  onStatusChange,
  onSelect,
}: {
  applicants: Applicant[];
  onStatusChange: (id: Id<"applications">, status: Stage) => void;
  onSelect: (app: Applicant) => void;
}) {
  return (
    <div className="flex gap-3 overflow-x-auto pb-4">
      {PIPELINE_STAGES.map((stage) => {
        const stageApps = applicants.filter((a) => a.status === stage.key);
        return (
          <div key={stage.key} className="shrink-0 w-56">
            <div className="flex items-center gap-2 mb-2">
              <div className={cn("w-2.5 h-2.5 rounded-full", stage.color)} />
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {stage.label}
              </span>
              <span className="ml-auto text-xs text-muted-foreground">
                {stageApps.length}
              </span>
            </div>
            <div className="space-y-2 min-h-[200px]">
              {stageApps.map((app) => (
                <ApplicantCard
                  key={app._id}
                  app={app}
                  onStatusChange={onStatusChange}
                  onClick={() => onSelect(app)}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function ApplicantsPage() {
  const { results: jobs, status: jobsStatus } = usePaginatedQuery(
    api.employer.listMyJobs,
    {},
    { initialNumItems: 50 }
  );

  const [selectedJobId, setSelectedJobId] = useState<Id<"jobs"> | null>(null);
  const [selectedApp, setSelectedApp] = useState<Applicant | null>(null);

  const applicants = useQuery(
    api.employer.getApplicantsByJob,
    selectedJobId ? { jobId: selectedJobId } : "skip"
  );

  const updateStatus = useMutation(api.employer.updateApplicationStatus);
  const openThread = useMutation(api.messages.getOrCreateThread);
  const navigate = useNavigate();

  const [scheduleForApp, setScheduleForApp] = useState<Id<"applications"> | null>(null);

  const messageCandidate = async (applicationId: Id<"applications">) => {
    try {
      const threadId = await openThread({ applicationId });
      navigate(`/employer/messages/${threadId}`);
    } catch {
      toast.error("Couldn't open the conversation.");
    }
  };

  const handleStatusChange = async (id: Id<"applications">, status: Stage) => {
    try {
      await updateStatus({ applicationId: id, status });
      toast.success("Status updated!");
    } catch {
      toast.error("Failed to update status.");
    }
  };

  const publishedJobs = jobs.filter((j) => j.status === "published" || j.status === "closed");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Applicant Pipeline</h2>
        <p className="text-muted-foreground mt-1">Manage candidates through your hiring pipeline.</p>
      </div>

      {jobsStatus === "LoadingFirstPage" ? (
        <Skeleton className="h-10 w-64" />
      ) : publishedJobs.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground border rounded-xl border-dashed">
          <BriefcaseIcon className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No published jobs yet</p>
          <p className="text-sm mt-1">Publish a job posting to start receiving applications.</p>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-3">
            <Select
              value={selectedJobId ?? "none"}
              onValueChange={(v) => setSelectedJobId(v === "none" ? null : v as Id<"jobs">)}
            >
              <SelectTrigger className="w-72">
                <SelectValue placeholder="Select a job to view applicants" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Select a job...</SelectItem>
                {publishedJobs.map((j) => (
                  <SelectItem key={j._id} value={j._id}>
                    {j.title} ({j.status})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {!selectedJobId ? (
            <div className="text-center py-16 text-muted-foreground border rounded-xl border-dashed">
              <p>Select a job above to view its applicant pipeline.</p>
            </div>
          ) : applicants === undefined ? (
            <div className="flex gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="shrink-0 w-56 space-y-2">
                  <Skeleton className="h-5 w-24" />
                  {Array.from({ length: 2 }).map((_, j) => <Skeleton key={j} className="h-24" />)}
                </div>
              ))}
            </div>
          ) : applicants.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground border rounded-xl border-dashed">
              <p className="font-medium">No applicants yet</p>
              <p className="text-sm mt-1">Applications will appear here when candidates apply.</p>
            </div>
          ) : (
            <KanbanBoard
              applicants={applicants as Applicant[]}
              onStatusChange={handleStatusChange}
              onSelect={setSelectedApp}
            />
          )}
        </>
      )}

      <Dialog open={!!selectedApp} onOpenChange={(o) => { if (!o) setSelectedApp(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Applicant Details</DialogTitle>
          </DialogHeader>
          {selectedApp && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                  <UserIcon className="w-6 h-6 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-semibold">{selectedApp.candidate?.name ?? "Unknown"}</p>
                  <p className="text-sm text-muted-foreground">{selectedApp.candidate?.email}</p>
                  {selectedApp.profile?.headline && (
                    <p className="text-sm text-muted-foreground">{selectedApp.profile.headline}</p>
                  )}
                </div>
              </div>

              {selectedApp.profile?.skills && selectedApp.profile.skills.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Skills</p>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedApp.profile.skills.map((s) => (
                      <Badge key={s} variant="secondary">{s}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {selectedApp.coverLetter && (
                <div>
                  <p className="text-sm font-medium mb-2">Cover Letter</p>
                  <div className="text-sm text-muted-foreground bg-muted rounded-lg p-3 whitespace-pre-wrap">
                    {selectedApp.coverLetter}
                  </div>
                </div>
              )}

              <div>
                <p className="text-sm font-medium mb-2">Update Status</p>
                <Select
                  value={selectedApp.status}
                  onValueChange={async (v) => {
                    await handleStatusChange(selectedApp._id, v as Stage);
                    setSelectedApp({ ...selectedApp, status: v as Stage });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PIPELINE_STAGES.map((s) => (
                      <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between gap-3 flex-wrap">
                <p className="text-xs text-muted-foreground">
                  Applied {new Date(selectedApp._creationTime).toLocaleDateString()}
                </p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setScheduleForApp(selectedApp._id)}
                  >
                    <CalendarIcon className="w-3.5 h-3.5 mr-1" /> Schedule interview
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => messageCandidate(selectedApp._id)}
                  >
                    <MessageSquareIcon className="w-3.5 h-3.5 mr-1" /> Message candidate
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {scheduleForApp && (
        <ScheduleInterviewDialog
          applicationId={scheduleForApp}
          open={!!scheduleForApp}
          onClose={() => setScheduleForApp(null)}
        />
      )}
    </div>
  );
}
