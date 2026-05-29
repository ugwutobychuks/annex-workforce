'use client';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth-store';
import { api } from '@/lib/api';
import Link from 'next/link';
import { ShieldCheck, AlertCircle, ArrowRight, Briefcase, Sparkles } from 'lucide-react';
import { formatNaira } from '@/lib/utils';

export default function TalentDashboard() {
  const { accessToken, user } = useAuth();

  const { data: profile } = useQuery({
    queryKey: ['my-profile'],
    queryFn: () => api<any>('/candidates/me', { token: accessToken }),
    enabled: !!accessToken,
  });

  const { data: applications } = useQuery({
    queryKey: ['my-applications'],
    queryFn: () => api<any[]>('/applications/mine', { token: accessToken }),
    enabled: !!accessToken,
  });

  const { data: jobs } = useQuery({
    queryKey: ['recommended-jobs'],
    queryFn: () =>
      api<{ hits: any[] }>('/jobs/search?limit=5', { token: accessToken }),
  });

  const profileCompleteness = computeCompleteness(profile);

  return (
    <div className="space-y-10">
      <header>
        <div className="text-xs uppercase tracking-[0.18em] text-slate-500 mb-2">Your dashboard</div>
        <h1 className="font-display text-4xl">Hello, {user?.firstName}.</h1>
        <p className="text-slate-600 mt-2">Here's what's happening with your work search.</p>
      </header>

      {/* Profile completion + verification banner */}
      {(profileCompleteness < 80 || profile?.verificationLevel === 'UNVERIFIED' || profile?.verificationLevel === 'EMAIL_VERIFIED') && (
        <div className="card border-l-4 border-l-accent-500">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-accent-600 mt-0.5 shrink-0" />
            <div className="flex-1">
              <div className="font-medium">Increase your visibility to employers.</div>
              <p className="text-sm text-slate-600 mt-1">
                Profiles with verified identity and 80%+ completion appear in 4× more searches.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link href="/profile" className="btn-primary text-sm py-1.5 px-3">Complete profile</Link>
                <button className="btn-secondary text-sm py-1.5 px-3">Verify identity</button>
              </div>
            </div>
          </div>
          <div className="mt-4 h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-brand-700 transition-all duration-500"
              style={{ width: `${profileCompleteness}%` }}
            />
          </div>
          <div className="text-xs text-slate-500 mt-1.5">{profileCompleteness}% complete</div>
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Applications" value={String(applications?.length ?? 0)} />
        <StatCard
          label="In review"
          value={String(applications?.filter((a) => ['SCREENING', 'SHORTLISTED', 'INTERVIEW'].includes(a.status)).length ?? 0)}
        />
        <StatCard label="Profile views" value="—" hint="Coming soon" />
        <StatCard
          label="Verification"
          value={profile?.verificationLevel?.replace('_', ' ').toLowerCase() ?? 'unverified'}
          icon={profile?.verificationLevel?.includes('VERIFIED') ? ShieldCheck : undefined}
        />
      </div>

      {/* Recommended jobs */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-2xl flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-accent-500" />
            Jobs that match your profile
          </h2>
          <Link href="/jobs" className="text-sm text-brand-700 hover:underline flex items-center gap-1">
            All jobs <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        <div className="grid gap-3">
          {jobs?.hits?.length ? (
            jobs.hits.map((job: any) => (
              <Link
                key={job.id}
                href={`/jobs/${job.id}`}
                className="card hover:border-brand-300 transition-colors group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="font-medium group-hover:text-brand-700 transition-colors">{job.title}</div>
                    <div className="text-sm text-slate-600 mt-0.5">
                      {job.employer?.name ?? job.employerName} · {job.location ?? job.country} ·{' '}
                      <span className="capitalize">{(job.workArrangement ?? '').toLowerCase()}</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {(job.skills ?? []).slice(0, 4).map((s: any, i: number) => (
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
                    <div className="text-xs text-slate-500 mt-1 capitalize">
                      {(job.seniority ?? '').toLowerCase()}
                    </div>
                  </div>
                </div>
              </Link>
            ))
          ) : (
            <div className="card text-center text-slate-500 py-12">
              <Briefcase className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              No matching jobs yet.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function StatCard({ label, value, hint, icon: Icon }: any) {
  return (
    <div className="card">
      <div className="text-xs uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
        {Icon && <Icon className="w-3 h-3" />}
        {label}
      </div>
      <div className="font-display text-2xl capitalize">{value}</div>
      {hint && <div className="text-xs text-slate-400 mt-1">{hint}</div>}
    </div>
  );
}

function computeCompleteness(p: any): number {
  if (!p) return 0;
  const checks = [
    !!p.headline, !!p.summary, !!p.location, !!p.yearsOfExperience,
    !!p.expectedSalary, !!p.skills?.length, !!p.experiences?.length,
    !!p.educations?.length, !!p.resumeUrl, !!p.linkedinUrl,
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}
