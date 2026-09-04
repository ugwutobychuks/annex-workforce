import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import NotificationsBell from "@/components/notifications-bell.tsx";

type TopbarProps = {
  title: string;
  onMenuClick?: () => void;
};

export default function Topbar({ title, onMenuClick }: TopbarProps) {
  const user = useQuery(api.users.getCurrentUser);

  return (
    <header className="h-14 border-b border-border bg-card flex items-center justify-between px-4 shrink-0">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="md:hidden" onClick={onMenuClick}>
          <Menu className="w-5 h-5" />
        </Button>
        <h1 className="font-semibold text-base">{title}</h1>
      </div>
      <div className="flex items-center gap-2">
        <NotificationsBell />
        <div className="flex items-center gap-2">
          {user === undefined ? (
            <Skeleton className="h-7 w-7 rounded-full" />
          ) : (
            <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
              {user?.name?.[0]?.toUpperCase() ?? "U"}
            </div>
          )}
          {user === undefined ? (
            <Skeleton className="h-4 w-24 hidden sm:block" />
          ) : (
            <span className="text-sm font-medium hidden sm:block">{user?.name ?? user?.email}</span>
          )}
        </div>
      </div>
    </header>
  );
}
