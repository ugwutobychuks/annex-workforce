import { usePaginatedQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";
import { SearchIcon, MapPinIcon, BriefcaseIcon, DollarSignIcon } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";
import type { Id } from "@/convex/_generated/dataModel";

const JOB_TYPE_COLORS = {
  "full-time": "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  "part-time": "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  "contract": "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  "internship": "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
} as const;

type JobType = "full-time" | "part-time" | "contract" | "internship";

type Job = {
  _id: Id<"jobs">;
  title: string;
  company: string;
  location: string;
  type: JobType;
  salary?: string;
  skills: string[];
  _creationTime: number;
};

function JobCard({ job }: { job: Job }) {
  const navigate = useNavigate();
  return (
    <Card
      className="cursor-pointer hover:border-primary/50 hover:shadow-sm transition-all"
      onClick={() => navigate(`/jobs/${job._id}`)}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base">{job.title}</CardTitle>
            <p className="text-sm text-muted-foreground mt-0.5">{job.company}</p>
          </div>
          <span className={`text-xs px-2 py-1 rounded-full font-medium shrink-0 ${JOB_TYPE_COLORS[job.type]}`}>
            {job.type}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><MapPinIcon className="w-3 h-3" />{job.location}</span>
          {job.salary && <span className="flex items-center gap-1"><DollarSignIcon className="w-3 h-3" />{job.salary}</span>}
        </div>
        {job.skills.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {job.skills.slice(0, 5).map((s: string) => (
              <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
            ))}
            {job.skills.length > 5 && (
              <Badge variant="secondary" className="text-xs">+{job.skills.length - 5}</Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function PublicJobs() {
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebounce(searchInput, 400);

  const { results, status, loadMore } = usePaginatedQuery(
    api.jobs.listPublished,
    { search: debouncedSearch || undefined },
    { initialNumItems: 12 }
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Talent Marketplace</h2>
        <p className="text-muted-foreground mt-1">
          Browse open roles from verified African employers. Sign in only when you're ready to apply.
        </p>
      </div>

      <div className="relative max-w-xl">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Search job titles…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
      </div>

      {status === "LoadingFirstPage" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-40" />)}
        </div>
      ) : results.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <BriefcaseIcon className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No jobs found</p>
          <p className="text-sm mt-1">Try a different search term.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {results.map((job) => <JobCard key={job._id} job={job as Job} />)}
          </div>
          {status === "CanLoadMore" && (
            <div className="text-center">
              <Button variant="secondary" onClick={() => loadMore(12)}>Load More Jobs</Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
