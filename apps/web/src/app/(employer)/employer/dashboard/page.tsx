'use client';
import Link from 'next/link';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth-store';
import { Briefcase, Users, FileText, Building2, ArrowRight, Plus, Loader2 } from 'lucide-react';

export default function EmployerDashboard() {
  const { accessToken, user } = useAuth();
  const router = useRouter();

  const { data: employer, isLoading: loadingEmployer } = useQuery({
    queryKey: ['my-employer'],
    queryFn: async () => {
      try {
        return await api<any>('/employers/me', { token: accessToken });
      } catch (e) {
        if (e instanceof ApiError && e.status === 404) return null;
        throw e;
      }
    },
    enabled: !!accessToken,
    retry: false,
  });

  useEffect(() => {
    if (!loadingEmployer && employer === null) {
      router.replace('/employer/setup');
    }
  }, [loadingEmployer, employer, router]);

  const { data: jobs } = useQuery({
    queryKey: ['employer-jobs'],
    queryFn: () => api<any[]>('/jobs/mine', { token: accessToken }),
    enabled: !!accessToken && !!employer,
  });

  const { data: contracts } = useQuery({
    queryKey: ['eor-contracts'],
    queryFn: () => api<any[]>('/eor/contracts', { token: accessToken }),
    enabled: !!accessToken && !!employer,
  });

  if (loadingEmployer || employer === null) {
    return (
      <div className="flex items-center gap-2 text-stone-500">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading…
      </div>
    );
  }

  const activeJobs = jobs?.filter((j) => j.status === 'PUBLISHED').length ?? 0;
  const totalApps = jobs?.reduce((sum, j) => sum + (j._count?.applications ?? 0), 0) ?? 0;
  const activeContracts = contracts?.filter((c) => c.status === 'ACTIVE').length ?? 0;

  return (
    <div className="space-y-10">
      <header className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-stone-500 mb-2">{employer.name}</div>
          <h1 className="font-display text-4xl">Hello, {user?.firstName}.</h1>
        </div>
        <Link href="/employer/jobs" className="btn-primary">
          <Plus className="w-4 h-4" /> Post a job
        </Link>
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Active jobs" value={String(activeJobs)} icon={Briefcase} />
        <Stat label="Total applicants" value={String(totalApps)} icon={Users} />
        <Stat label="Active contracts" value={String(activeContracts)} icon={Building2} />
        <Stat label="Draft jobs" value={String(jobs?.filter((j) => j.status === 'DRAFT').length ?? 0)} icon={FileText} />
      </div>

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-2xl">Recent jobs</h2>
          <Link href="/employer/jobs" className="text-sm text-forest-700 hover:underline flex items-center gap-1">
            All jobs <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        <div className="grid gap-3">
          {jobs?.length === 0 && (
            <div className="card text-center py-12 text-stone-500">
              <Briefcase className="w-10 h-10 mx-auto mb-3 text-stone-300" />
              No jobs posted yet.
            </div>
          )}
          {jobs?.slice(0, 5).map((j) => (
            <Link key={j.id} href={`/employer/jobs/${j.id}`} className="card hover:border-forest-300 transition-colors">
              <div className="flex justify-between gap-4">
                <div>
                  <div className="font-medium">{j.title}</div>
                  <div className="text-sm text-stone-600 mt-0.5 capitalize">
                    {j.workArrangement?.toLowerCase()} · {j.location ?? j.country}
                  </div>
                </div>
                <div className="text-right">
                  <span className={`chip ${j.status === 'PUBLISHED' ? 'bg-emerald-50 text-emerald-800' : 'bg-stone-100 text-stone-600'}`}>
                    {j.status.toLowerCase()}
                  </span>
                  <div className="text-xs text-stone-500 mt-2">{j._count?.applications ?? 0} applicants</div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value, icon: Icon }: any) {
  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wider text-stone-500">{label}</span>
        <Icon className="w-4 h-4 text-stone-400" />
      </div>
      <div className="font-display text-3xl mt-2">{value}</div>
    </div>
  );
}
