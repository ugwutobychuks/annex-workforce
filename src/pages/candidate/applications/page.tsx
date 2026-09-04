import { usePaginatedQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { FileTextIcon, MapPinIcon, CalendarIcon, MessageSquareIcon } from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel.d.ts";

const STATUS_STYLES = {
  applied:     { label: "Applied",     cls: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" },
  screening:   { label: "Screening",   cls: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300" },
  shortlisted: { label: "Shortlisted", cls: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300" },
  interview:   { label: "Interview",   cls: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300" },
  offer:       { label: "Offer",       cls: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" },
  hired:       { label: "Hired",       cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" },
  rejected:    { label: "Rejected",    cls: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300" },
} as const;

type AppStatus = keyof typeof STATUS_STYLES;

export default function MyApplications() {
  const navigate = useNavigate();
  const openThread = useMutation(api.messages.getOrCreateThread);
  const { results, status, loadMore } = usePaginatedQuery(
    api.applications.getMyApplications,
    {},
    { initialNumItems: 20 }
  );

  const messageEmployer = async (applicationId: Id<"applications">) => {
    try {
      const threadId = await openThread({ applicationId });
      navigate(`/candidate/messages/${threadId}`);
    } catch {
      toast.error("Couldn't open the conversation.");
    }
  };

  if (status === "LoadingFirstPage") {
    return (
      <div className="space-y-4 max-w-3xl">
        <Skeleton className="h-8 w-48" />
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-2xl font-bold">My Applications</h2>
        <p className="text-muted-foreground mt-1">Track the status of all your job applications.</p>
      </div>

      {results.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <FileTextIcon className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No applications yet</p>
          <p className="text-sm mt-1">Browse jobs and apply to get started.</p>
          <Button variant="secondary" className="mt-4" onClick={() => navigate("/jobs")}>
            Browse Jobs
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {results.map((app) => {
            const style = STATUS_STYLES[app.status as AppStatus] ?? STATUS_STYLES.applied;
            return (
              <Card
                key={app._id}
                className="cursor-pointer hover:border-primary/40 transition-colors"
                onClick={() => app.job && navigate(`/jobs/${app.jobId as Id<"jobs">}`)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-base">{app.job?.title ?? "Unknown Job"}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-0.5">{app.job?.company}</p>
                    </div>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-semibold shrink-0 ${style.cls}`}>
                      {style.label}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                      {app.job?.location && (
                        <span className="flex items-center gap-1"><MapPinIcon className="w-3 h-3" />{app.job.location}</span>
                      )}
                      <span className="flex items-center gap-1">
                        <CalendarIcon className="w-3 h-3" />
                        Applied {new Date(app._creationTime).toLocaleDateString()}
                      </span>
                    </div>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={(e) => { e.stopPropagation(); messageEmployer(app._id); }}
                    >
                      <MessageSquareIcon className="w-3.5 h-3.5 mr-1" /> Message
                    </Button>
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
    </div>
  );
}
