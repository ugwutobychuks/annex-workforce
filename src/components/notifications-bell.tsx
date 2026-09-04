import { useQuery, useMutation, usePaginatedQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { BellIcon, CheckCheckIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Id } from "@/convex/_generated/dataModel";

/**
 * Topbar notification bell. Shows unread count badge + a dropdown with the
 * 10 most recent notifications; clicking one marks it read and follows its
 * link (if any).
 */
export default function NotificationsBell() {
  const count = useQuery(api.notifications.unreadCount);
  const { results } = usePaginatedQuery(
    api.notifications.listMine,
    {},
    { initialNumItems: 10 }
  );
  const markRead = useMutation(api.notifications.markRead);
  const markAllRead = useMutation(api.notifications.markAllRead);
  const navigate = useNavigate();

  const open = async (id: Id<"notifications">, link?: string) => {
    await markRead({ id });
    if (link) navigate(link);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <BellIcon className="w-4 h-4" />
          {count && count > 0 ? (
            <Badge className="absolute -top-1 -right-1 h-4 min-w-4 px-1 text-[10px] flex items-center justify-center">
              {count > 9 ? "9+" : count}
            </Badge>
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between px-2 py-1.5 text-xs text-muted-foreground">
          <span>Notifications</span>
          {count && count > 0 ? (
            <button
              type="button"
              className="text-primary hover:underline flex items-center gap-1"
              onClick={() => markAllRead()}
            >
              <CheckCheckIcon className="w-3 h-3" /> Mark all read
            </button>
          ) : null}
        </div>
        <DropdownMenuSeparator />
        {results.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-6">
            You're all caught up.
          </div>
        ) : (
          <div className="max-h-80 overflow-y-auto">
            {results.map((n) => (
              <DropdownMenuItem
                key={n._id}
                onClick={() => open(n._id, n.link ?? undefined)}
                className={cn("flex-col items-start gap-0.5", !n.readAt && "bg-primary/5")}
              >
                <div className="flex w-full items-center gap-2">
                  {!n.readAt && <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />}
                  <p className="text-sm font-medium truncate flex-1">{n.title}</p>
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    {new Date(n._creationTime).toLocaleDateString()}
                  </span>
                </div>
                {n.body && <p className="text-xs text-muted-foreground line-clamp-2 pl-3.5">{n.body}</p>}
              </DropdownMenuItem>
            ))}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
