import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronLeftIcon, SendIcon, UserIcon } from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";

export default function ThreadView() {
  const params = useParams<{ id: string }>();
  const threadId = params.id as Id<"messageThreads">;
  const data = useQuery(api.messages.getThread, threadId ? { threadId } : "skip");
  const send = useMutation(api.messages.sendMessage);
  const markRead = useMutation(api.messages.markRead);
  const navigate = useNavigate();

  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollerRef = useRef<HTMLDivElement>(null);

  // Mark thread read whenever we open it or new messages arrive.
  useEffect(() => {
    if (!threadId) return;
    markRead({ threadId }).catch(() => {});
  }, [threadId, data?.messages.length, markRead]);

  useEffect(() => {
    scrollerRef.current?.scrollTo({ top: scrollerRef.current.scrollHeight });
  }, [data?.messages.length]);

  if (data === undefined) {
    return (
      <div className="max-w-3xl space-y-2">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  if (data === null) {
    return <p className="text-muted-foreground">Thread not found.</p>;
  }

  const submit = async () => {
    const text = body.trim();
    if (!text) return;
    setBusy(true);
    try {
      await send({ threadId, body: text });
      setBody("");
    } catch (err: unknown) {
      toast.error((err as { data?: { message?: string } }).data?.message ?? "Failed to send.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-3xl h-[calc(100vh-8rem)] flex flex-col">
      <div className="flex items-center gap-3 pb-3 border-b">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ChevronLeftIcon className="w-4 h-4 mr-1" /> Back
        </Button>
        <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center shrink-0">
          <UserIcon className="w-4 h-4 text-muted-foreground" />
        </div>
        <div className="min-w-0">
          <p className="font-semibold truncate">{data.other?.name ?? "Unknown"}</p>
          <p className="text-xs text-muted-foreground truncate">
            {data.job?.title ?? ""} · {data.job?.company ?? ""}
          </p>
        </div>
      </div>

      <div ref={scrollerRef} className="flex-1 overflow-y-auto py-4 space-y-2">
        {data.messages.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No messages yet. Say hi.
          </p>
        ) : (
          data.messages.map((m) => {
            const isMine = m.senderId === data.viewerId;
            return (
              <div
                key={m._id}
                className={cn("flex", isMine ? "justify-end" : "justify-start")}
              >
                <Card
                  className={cn(
                    "max-w-[80%]",
                    isMine ? "bg-primary text-primary-foreground border-primary" : ""
                  )}
                >
                  <CardContent className="py-2 px-3">
                    <p className="text-sm whitespace-pre-wrap">{m.body}</p>
                    <p className={cn(
                      "text-[10px] mt-1",
                      isMine ? "text-primary-foreground/70" : "text-muted-foreground"
                    )}>
                      {new Date(m._creationTime).toLocaleString()}
                    </p>
                  </CardContent>
                </Card>
              </div>
            );
          })
        )}
      </div>

      <div className="border-t pt-3 flex gap-2">
        <Textarea
          rows={2}
          placeholder="Write a message…"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              submit();
            }
          }}
        />
        <Button onClick={submit} disabled={busy || body.trim().length === 0}>
          <SendIcon className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
