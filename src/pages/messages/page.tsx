import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageSquareIcon, UserIcon } from "lucide-react";

/**
 * Shared inbox page — same content for candidate and employer, mounted under
 * each layout so the sidebar chrome differs but the list is the same.
 */
export default function MessagesInbox() {
  const threads = useQuery(api.messages.listMyThreads);
  const navigate = useNavigate();

  if (threads === undefined) {
    return (
      <div className="max-w-3xl space-y-2">
        <Skeleton className="h-8 w-32" />
        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16" />)}
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Messages</h2>
        <p className="text-muted-foreground mt-1">
          Conversations with employers and candidates you're working with.
        </p>
      </div>

      {threads.length === 0 ? (
        <div className="rounded-xl border border-dashed py-16 text-center text-muted-foreground">
          <MessageSquareIcon className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No conversations yet.</p>
          <p className="text-sm mt-1">
            Message threads open when a candidate applies to a job or an employer
            reaches out from the pipeline.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {threads.map((t) => (
            <Card
              key={t._id}
              className="cursor-pointer hover:border-primary/40 transition-colors"
              onClick={() => navigate(`./${t._id}`)}
            >
              <CardContent className="flex items-center gap-3 py-3">
                <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center shrink-0">
                  <UserIcon className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium truncate">{t.other?.name ?? "Unknown"}</p>
                    {t.unread > 0 && (
                      <Badge variant="default" className="text-xs">{t.unread}</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {t.job?.title ?? "Application"} · {t.lastMessagePreview ?? "No messages yet"}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground shrink-0">
                  {new Date(t.lastMessageAt).toLocaleDateString()}
                </span>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
