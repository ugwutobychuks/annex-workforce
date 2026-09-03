import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { BriefcaseIcon, UsersIcon, UserCheckIcon, TrophyIcon, PlusIcon, BuildingIcon } from "lucide-react";

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: number | undefined;
  color: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 pt-6">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          {value === undefined ? (
            <Skeleton className="h-7 w-12 mt-1" />
          ) : (
            <p className="text-2xl font-bold">{value}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function EmployerDashboard() {
  const stats = useQuery(api.employer.getDashboardStats);
  const profile = useQuery(api.employer.getCompanyProfile);
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Employer Dashboard</h2>
          <p className="text-muted-foreground mt-1">
            {profile?.name ? `Welcome back, ${profile.name}` : "Manage your hiring pipeline"}
          </p>
        </div>
        <Button onClick={() => navigate("/employer/jobs")}>
          <PlusIcon className="w-4 h-4 mr-2" /> Post a Job
        </Button>
      </div>

      {/* Company profile prompt */}
      {profile === null && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="flex items-center justify-between pt-5 pb-5">
            <div className="flex items-center gap-3">
              <BuildingIcon className="w-5 h-5 text-primary" />
              <div>
                <p className="font-medium text-sm">Complete your company profile</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Add your company details to attract top talent.
                </p>
              </div>
            </div>
            <Button size="sm" onClick={() => navigate("/employer/company")}>
              Set Up Profile
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={BriefcaseIcon} label="Total Jobs" value={stats?.totalJobs} color="bg-blue-500" />
        <StatCard icon={BriefcaseIcon} label="Active Jobs" value={stats?.publishedJobs} color="bg-green-500" />
        <StatCard icon={UsersIcon} label="Applications" value={stats?.totalApplications} color="bg-purple-500" />
        <StatCard icon={TrophyIcon} label="Hired" value={stats?.hired} color="bg-orange-500" />
      </div>

      {/* Quick actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Post a Job", icon: PlusIcon, href: "/employer/jobs" },
            { label: "View Applicants", icon: UsersIcon, href: "/employer/applicants" },
            { label: "Talent Pool", icon: UserCheckIcon, href: "/employer/talent" },
            { label: "Company Profile", icon: BuildingIcon, href: "/employer/company" },
          ].map(({ label, icon: Icon, href }) => (
            <button
              key={label}
              onClick={() => navigate(href)}
              className="flex flex-col items-center gap-2 p-4 rounded-xl border hover:bg-accent hover:border-primary/30 transition-all cursor-pointer text-center"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Icon className="w-5 h-5 text-primary" />
              </div>
              <span className="text-xs font-medium">{label}</span>
            </button>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
