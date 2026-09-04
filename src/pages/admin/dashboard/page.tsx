import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { UsersIcon, ShieldCheckIcon, BriefcaseIcon, ActivityIcon } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { useNavigate } from "react-router-dom";

export default function AdminDashboard() {
  const analytics = useQuery(api.admin.getPlatformAnalytics);
  const navigate = useNavigate();

  if (analytics === undefined) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
      </div>
    );
  }

  const stats = [
    { label: "Total Users", value: String(analytics.users.total), icon: UsersIcon, color: "text-blue-500" },
    { label: "Candidates", value: String(analytics.users.candidates), icon: UsersIcon, color: "text-green-500" },
    { label: "Employers", value: String(analytics.users.employers), icon: BriefcaseIcon, color: "text-yellow-500" },
    { label: "Pending Verifications", value: String(analytics.verifications.pending), icon: ShieldCheckIcon, color: "text-red-500" },
  ];

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h2 className="text-2xl font-bold">Admin Dashboard</h2>
        <p className="text-muted-foreground mt-1">Platform overview and management.</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">{stat.label}</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center gap-2">
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
              <span className="text-2xl font-bold">{stat.value}</span>
            </CardContent>
          </Card>
        ))}
      </div>
      <div>
        <h3 className="font-semibold mb-3">Quick Actions</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Button variant="secondary" className="justify-start gap-2 h-12" onClick={() => navigate("/admin/users")}>
            <UsersIcon className="w-4 h-4" /> Manage Users
          </Button>
          <Button variant="secondary" className="justify-start gap-2 h-12" onClick={() => navigate("/admin/verification")}>
            <ShieldCheckIcon className="w-4 h-4" /> Review Verifications
          </Button>
          <Button variant="secondary" className="justify-start gap-2 h-12" onClick={() => navigate("/admin/analytics")}>
            <ActivityIcon className="w-4 h-4" /> View Analytics
          </Button>
        </div>
      </div>
    </div>
  );
}
