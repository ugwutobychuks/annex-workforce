'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-store';
import { formatNaira, relativeTime } from '@/lib/utils';
import { Search, MapPin, Briefcase } from 'lucide-react';
import { Pagination } from '@/components/pagination';

const PAGE_SIZE = 20;

export default function JobsPage() {
  const { accessToken } = useAuth();
  const [filters, setFilters] = useState({ q: '', country: '', workArrangement: '', employmentType: '' });
  const [page, setPage] = useState(1);

  const params = new URLSearchParams(
    Object.entries(filters).filter(([, v]) => v) as [string, string][],
  );
  params.set('limit', String(PAGE_SIZE));
  params.set('page', String(page));

  const { data, isLoading } = useQuery({
    queryKey: ['jobs-search', filters, page],
    queryFn: () => api<{ hits: any[]; total: number }>(`/jobs/search?${params}`, { token: accessToken }),
  });

  return (
    <div className="space-y-8">
      <header>
        <div className="text-xs uppercase tracking-[0.18em] text-stone-500 mb-2">Jobs</div>
        <h1 className="font-display text-4xl">Find your next role.</h1>
        <p className="text-stone-600 mt-2">Search verified opportunities across Africa and remote.</p>
      </header>

      {/* Filters */}
      <div className="card grid md:grid-cols-4 gap-3">
        <div className="md:col-span-2 relative">
          <Search className="w-4 h-4 absolute left-3 top-3.5 text-stone-400" />
          <input
            value={filters.q}
            onChange={(e) => { setFilters({ ...filters, q: e.target.value }); setPage(1); }}
            placeholder="Job title, skill, company"
            className="input pl-9"
          />
        </div>
        <select
          value={filters.country}
          onChange={(e) => { setFilters({ ...filters, country: e.target.value }); setPage(1); }}
          className="input"
        >
          <option value="">All countries</option>
          <option value="NG">Nigeria</option>
          <option value="KE">Kenya</option>
          <option value="GH">Ghana</option>
          <option value="ZA">South Africa</option>
        </select>
        <select
          value={filters.workArrangement}
          onChange={(e) => { setFilters({ ...filters, workArrangement: e.target.value }); setPage(1); }}
          className="input"
        >
          <option value="">Any arrangement</option>
          <option value="REMOTE">Remote</option>
          <option value="HYBRID">Hybrid</option>
          <option value="ONSITE">On-site</option>
        </select>
      </div>

      {/* Results */}
      {isLoading ? (
        <div className="text-stone-500">Searching…</div>
      ) : data?.hits?.length === 0 ? (
        <div className="card text-center py-16 text-stone-500">
          <Briefcase className="w-10 h-10 mx-auto mb-3 text-stone-300" />
          No jobs match those filters.
        </div>
      ) : (
        <>
          <div className="text-sm text-stone-500">{data?.total} jobs</div>
          <div className="grid gap-3">
            {data?.hits?.map((job: any) => (
              <Link
                key={job.id}
                href={`/jobs/${job.id}`}
                className="card hover:border-forest-300 transition-colors group block"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-display text-xl group-hover:text-forest-700 transition-colors">{job.title}</h3>
                    <div className="text-sm text-stone-600 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span>{job.employer?.name ?? job.employerName}</span>
                      <span>·</span>
                      <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {job.location ?? job.country}</span>
                      <span>·</span>
                      <span className="capitalize">{(job.workArrangement ?? '').toLowerCase()}</span>
                      <span>·</span>
                      <span className="capitalize">{(job.employmentType ?? '').replace('_', ' ').toLowerCase()}</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {(job.skills ?? []).slice(0, 5).map((s: any, i: number) => (
                        <span key={i} className="chip">{typeof s === 'string' ? s : s.skill?.name}</span>
                      ))}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-mono text-sm">
                      {job.salaryMin && job.salaryMax
                        ? `${formatNaira(job.salaryMin)} – ${formatNaira(job.salaryMax)}`
                        : '—'}
                    </div>
                    {job.publishedAt && (
                      <div className="text-xs text-stone-500 mt-1">{relativeTime(job.publishedAt)}</div>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
          <Pagination page={page} limit={PAGE_SIZE} total={data?.total ?? 0} onChange={setPage} />
        </>
      )}
    </div>
  );
}
