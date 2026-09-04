import { usePaginatedQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRightIcon, MapPinIcon, DollarSignIcon, BriefcaseIcon } from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel";

const JOB_TYPE_COLORS: Record<string, string> = {
  "full-time": "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  "part-time": "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  "contract": "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  "internship": "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
};

type Job = {
  _id: Id<"jobs">;
  title: string;
  company: string;
  location: string;
  type: string;
  salary?: string;
  skills: string[];
};

export default function FeaturedJobs() {
  const navigate = useNavigate();
  const { results, status } = usePaginatedQuery(
    api.jobs.listPublished,
    {},
    { initialNumItems: 6 }
  );

  return (
    <section id="marketplace" className="mx-auto w-full max-w-6xl px-5 py-16">
      <div className="mb-8 flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            Talent Marketplace
          </p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            Live roles from verified employers
          </h2>
          <p className="mt-2 max-w-xl text-muted-foreground">
            Browse open positions across engineering, design, compliance, and more.
            Applications open to anyone — sign in only when you're ready to apply.
          </p>
        </div>
        <Button variant="secondary" asChild>
          <Link to="/jobs">
            See all jobs <ArrowRightIcon className="w-4 h-4 ml-2" />
          </Link>
        </Button>
      </div>

      {status === "LoadingFirstPage" ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-44" />)}
        </div>
      ) : results.length === 0 ? (
        <div className="rounded-xl border border-dashed py-16 text-center text-muted-foreground">
          <BriefcaseIcon className="mx-auto mb-3 h-10 w-10 opacity-30" />
          <p className="font-medium">No jobs published yet.</p>
          <p className="text-sm mt-1">
            Run <code className="rounded bg-muted px-1.5 py-0.5">npx convex run seed:demoJobs</code>{" "}
            to populate a demo marketplace.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((raw) => {
            const j = raw as Job;
            return (
              <Card
                key={j._id}
                className="cursor-pointer hover:border-primary/50 hover:shadow-sm transition-all"
                onClick={() => navigate(`/jobs/${j._id}`)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <CardTitle className="text-base truncate">{j.title}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-0.5 truncate">{j.company}</p>
                    </div>
                    <span
                      className={`text-xs px-2 py-1 rounded-full font-medium shrink-0 ${
                        JOB_TYPE_COLORS[j.type] ?? ""
                      }`}
                    >
                      {j.type}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <MapPinIcon className="w-3 h-3" /> {j.location}
                    </span>
                    {j.salary && (
                      <span className="flex items-center gap-1">
                        <DollarSignIcon className="w-3 h-3" /> {j.salary}
                      </span>
                    )}
                  </div>
                  {j.skills.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {j.skills.slice(0, 4).map((s: string) => (
                        <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
                      ))}
                      {j.skills.length > 4 && (
                        <Badge variant="secondary" className="text-xs">
                          +{j.skills.length - 4}
                        </Badge>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </section>
  );
}
