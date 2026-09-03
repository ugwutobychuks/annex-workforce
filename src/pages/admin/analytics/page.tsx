import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import {
  UsersIcon, BriefcaseIcon, ShieldCheckIcon, TrophyIcon,
  FileCheckIcon, HandshakeIcon, TrendingUpIcon,
} from "lucide-react";

function Metric({
  icon: Icon,
  label,
  value,
  hint,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: number | string | undefined;
  hint?: string;
  color: string;
}) {
  return (
    <Card>
      <CardContent className="pt-5 pb-5 flex items-center gap-4">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{label}</p>
          {value === undefined ? (
            <Skeleton className="h-7 w-16 mt-1" />
          ) : (
            <p className="text-2xl font-bold">{value}</p>
          )}
          {hint && <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminAnalytics() {
  const data = useQuery(api.admin.getPlatformAnalytics);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Platform Analytics</h2>
        <p className="text-muted-foreground mt-1">
          A live snapshot of platform activity across users, jobs, applications, and payroll.
        </p>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Users</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Metric icon={UsersIcon} label="Total Users" value={data?.users.total} color="bg-blue-500" />
          <Metric icon={UsersIcon} label="Candidates" value={data?.users.candidates} color="bg-green-500" />
          <Metric icon={BriefcaseIcon} label="Employers" value={data?.users.employers} color="bg-purple-500" />
          <Metric icon={TrendingUpIcon} label="New (30d)" value={data?.users.new30d} hint={`${data?.users.new7d ?? 0} in the last 7d`} color="bg-orange-500" />
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Jobs</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Metric icon={BriefcaseIcon} label="Total Jobs" value={data?.jobs.total} color="bg-blue-500" />
          <Metric icon={BriefcaseIcon} label="Published" value={data?.jobs.published} color="bg-green-500" />
          <Metric icon={BriefcaseIcon} label="Draft" value={data?.jobs.draft} color="bg-yellow-500" />
          <Metric icon={TrendingUpIcon} label="New (30d)" value={data?.jobs.new30d} color="bg-orange-500" />
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Applications</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Metric icon={FileCheckIcon} label="Total" value={data?.applications.total} color="bg-blue-500" />
          <Metric icon={TrophyIcon} label="Hired" value={data?.applications.hired} color="bg-green-500" />
          <Metric icon={FileCheckIcon} label="In Pipeline" value={data?.applications.inPipeline} color="bg-purple-500" />
          <Metric icon={TrendingUpIcon} label="New (30d)" value={data?.applications.new30d} color="bg-orange-500" />
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Verifications & EOR</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Metric icon={ShieldCheckIcon} label="Pending" value={data?.verifications.pending} color="bg-yellow-500" />
          <Metric icon={ShieldCheckIcon} label="Approved" value={data?.verifications.approved} color="bg-green-500" />
          <Metric icon={HandshakeIcon} label="EOR Contracts" value={data?.eor.contracts} color="bg-blue-500" />
          <Metric icon={HandshakeIcon} label="Active Contracts" value={data?.eor.active} color="bg-purple-500" />
        </div>
      </div>

      {data && data.users.banned > 0 && (
        <Card className="border-destructive/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Moderation</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">
              <span className="font-bold">{data.users.banned}</span>{" "}
              banned account{data.users.banned === 1 ? "" : "s"}.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
