import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { CalendarIcon, MapPinIcon, VideoIcon, DownloadIcon, MoreHorizontalIcon, UserIcon, CheckIcon, XCircleIcon } from "lucide-react";
import { downloadIcs } from "@/lib/ics";
import type { Id } from "@/convex/_generated/dataModel";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive"> = {
  scheduled: "default",
  completed: "secondary",
  cancelled: "destructive",
  no_show: "destructive",
};

export default function InterviewsPage() {
  const interviews = useQuery(api.interviews.listMine);
  const setStatus = useMutation(api.interviews.setStatus);
  const currentUser = useQuery(api.users.getCurrentUser);
  const isEmployer = currentUser?.role === "employer";

  if (interviews === undefined) {
    return (
      <div className="max-w-4xl space-y-2">
        <Skeleton className="h-8 w-32" />
        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
      </div>
    );
  }

  const changeStatus = async (id: Id<"interviews">, status: "scheduled" | "completed" | "cancelled" | "no_show") => {
    try {
      await setStatus({ id, status });
      toast.success(`Marked ${status.replace("_", " ")}.`);
    } catch (err: unknown) {
      toast.error((err as { data?: { message?: string } }).data?.message ?? "Failed.");
    }
  };

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Interviews</h2>
        <p className="text-muted-foreground mt-1">
          Your scheduled interviews. Download the .ics to add any of them to Google Calendar, Outlook, or Apple Calendar.
        </p>
      </div>

      {interviews.length === 0 ? (
        <div className="rounded-xl border border-dashed py-16 text-center text-muted-foreground">
          <CalendarIcon className="mx-auto mb-3 h-10 w-10 opacity-30" />
          <p className="font-medium">No interviews scheduled.</p>
          <p className="text-sm mt-1">
            {isEmployer
              ? "Schedule one from an applicant's detail dialog."
              : "Your employer will add interviews here when they schedule one with you."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {interviews.map((iv) => (
            <Card key={iv._id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <CardTitle className="text-base">{iv.title}</CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                      <UserIcon className="w-3 h-3" /> {iv.other?.name ?? "Unknown"}
                      {iv.job?.title ? ` · ${iv.job.title}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={STATUS_VARIANT[iv.status] ?? "secondary"} className="capitalize">
                      {iv.status.replace("_", " ")}
                    </Badge>
                    {isEmployer && iv.status === "scheduled" && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="icon" variant="ghost" className="h-8 w-8">
                            <MoreHorizontalIcon className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => changeStatus(iv._id, "completed")}>
                            <CheckIcon className="w-3.5 h-3.5 mr-2" /> Mark completed
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => changeStatus(iv._id, "no_show")}>
                            No-show
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => changeStatus(iv._id, "cancelled")}
                          >
                            <XCircleIcon className="w-3.5 h-3.5 mr-2" /> Cancel
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <CalendarIcon className="w-3 h-3" />
                    {new Date(iv.scheduledAt).toLocaleString()} — {new Date(iv.endAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                  {iv.location && (
                    <span className="flex items-center gap-1"><MapPinIcon className="w-3 h-3" /> {iv.location}</span>
                  )}
                  {iv.meetingUrl && (
                    <a href={iv.meetingUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-primary hover:underline">
                      <VideoIcon className="w-3 h-3" /> Meeting link
                    </a>
                  )}
                </div>
                {iv.notes && (
                  <p className="text-sm bg-muted rounded-lg p-3">{iv.notes}</p>
                )}
                <div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() =>
                      downloadIcs(`interview-${iv._id}.ics`, {
                        uid: iv._id,
                        title: iv.title,
                        description: iv.notes ?? undefined,
                        location: iv.location ?? undefined,
                        startMs: iv.scheduledAt,
                        endMs: iv.endAt,
                        url: iv.meetingUrl ?? undefined,
                      })
                    }
                  >
                    <DownloadIcon className="w-3.5 h-3.5 mr-1" /> Add to calendar (.ics)
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
