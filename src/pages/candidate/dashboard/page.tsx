import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { BriefcaseIcon, CheckCircleIcon, ClockIcon, DollarSignIcon } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { useNavigate } from "react-router-dom";

export default function CandidateDashboard() {
  const user = useQuery(api.users.getCurrentUser);
  const navigate = useNavigate();

  if (user === undefined) {
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
    { label: "Applications", value: "0", icon: BriefcaseIcon, color: "text-blue-500" },
    { label: "Interviews", value: "0", icon: ClockIcon, color: "text-yellow-500" },
    { label: "Offers", value: "0", icon: CheckCircleIcon, color: "text-green-500" },
    { label: "Payslips", value: "0", icon: DollarSignIcon, color: "text-purple-500" },
  ];

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h2 className="text-2xl font-bold">Welcome back, {user?.name?.split(" ")[0] ?? "there"} 👋</h2>
        <p className="text-muted-foreground mt-1">Here's what's happening with your career.</p>
      </div>

      {!user?.onboardingComplete && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="flex items-center justify-between py-4">
            <div>
              <p className="font-semibold text-sm">Complete your profile</p>
              <p className="text-xs text-muted-foreground mt-0.5">Add your skills and experience to get discovered by employers.</p>
            </div>
            <Button size="sm" onClick={() => navigate("/candidate/profile")}>Complete Profile</Button>
          </CardContent>
        </Card>
      )}

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
          <Button variant="secondary" className="justify-start gap-2 h-12" onClick={() => navigate("/jobs")}>
            <BriefcaseIcon className="w-4 h-4" /> Browse Jobs
          </Button>
          <Button variant="secondary" className="justify-start gap-2 h-12" onClick={() => navigate("/candidate/profile")}>
            <CheckCircleIcon className="w-4 h-4" /> Update Profile
          </Button>
          <Button variant="secondary" className="justify-start gap-2 h-12" onClick={() => navigate("/candidate/verification")}>
            <CheckCircleIcon className="w-4 h-4" /> Get Verified
          </Button>
        </div>
      </div>
    </div>
  );
}
