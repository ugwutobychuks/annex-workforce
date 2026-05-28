'use client';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-store';
import { formatNaira, formatDate } from '@/lib/utils';
import { ArrowLeft, MapPin, Briefcase, Loader2, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { accessToken, user } = useAuth();
  const [coverLetter, setCoverLetter] = useState('');
  const [showApply, setShowApply] = useState(false);

  const { data: job, isLoading } = useQuery({
    queryKey: ['job', id],
    queryFn: () => api<any>(`/jobs/${id}`, { token: accessToken }),
  });

  const apply = useMutation({
    mutationFn: () =>
      api('/applications', {
        method: 'POST',
        body: { jobId: id, coverLetter },
        token: accessToken,
      }),
    onSuccess: () => {
      toast.success('Application submitted');
      router.push('/applications');
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (isLoading) return <div className="text-stone-500">Loading…</div>;
  if (!job) return <div>Job not found</div>;

  return (
    <div className="space-y-8">
      <Link href="/jobs" className="inline-flex items-center gap-1 text-sm text-stone-600 hover:text-forest-700">
        <ArrowLeft className="w-4 h-4" /> All jobs
      </Link>

      <header className="space-y-4">
        <div className="flex items-start justify-between gap-6">
          <div>
            <h1 className="font-display text-4xl">{job.title}</h1>
            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-stone-600">
              <span className="font-medium text-forest-900">{job.employer?.name}</span>
              <span>·</span>
              <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {job.location ?? job.country}</span>
              <span>·</span>
              <span className="capitalize">{(job.workArrangement ?? '').toLowerCase()}</span>
              <span>·</span>
              <span className="capitalize">{(job.employmentType ?? '').replace('_', ' ').toLowerCase()}</span>
              {job.isEor && (
                <span className="verified-badge ml-2"><ShieldCheck className="w-3 h-3" /> EOR-managed</span>
              )}
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="font-mono text-lg">
              {job.salaryMin && job.salaryMax
                ? `${formatNaira(job.salaryMin)} – ${formatNaira(job.salaryMax)}`
                : '—'}
            </div>
            <div className="text-xs text-stone-500 mt-1 capitalize">{(job.seniority ?? '').toLowerCase()}</div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {job.skills?.map((s: any) => (
            <span key={s.id} className="chip">{s.skill.name}</span>
          ))}
        </div>
      </header>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <Section title="About the role" content={job.description} />
          {job.responsibilities && <Section title="Responsibilities" content={job.responsibilities} />}
          {job.requirements && <Section title="Requirements" content={job.requirements} />}
          {job.benefits && <Section title="Benefits" content={job.benefits} />}
        </div>

        {/* Apply panel */}
        <aside className="lg:col-span-1">
          <div className="card sticky top-8">
            <h3 className="font-display text-xl mb-3">Apply for this role</h3>
            {!user ? (
              <>
                <p className="text-sm text-stone-600 mb-4">Sign in or create an account to apply.</p>
                <Link href={`/login?next=/jobs/${id}`} className="btn-primary w-full">Sign in to apply</Link>
              </>
            ) : user.role !== 'CANDIDATE' ? (
              <p className="text-sm text-stone-600">Only candidate accounts can apply.</p>
            ) : !showApply ? (
              <>
                <p className="text-sm text-stone-600 mb-4">
                  We'll send your profile and resume on file. Add a cover letter to stand out.
                </p>
                <button onClick={() => setShowApply(true)} className="btn-primary w-full">
                  Start application
                </button>
              </>
            ) : (
              <>
                <label className="label">Cover letter (optional)</label>
                <textarea
                  rows={6}
                  className="input"
                  value={coverLetter}
                  onChange={(e) => setCoverLetter(e.target.value)}
                  placeholder="Why are you a great fit?"
                />
                <button
                  onClick={() => apply.mutate()}
                  disabled={apply.isPending}
                  className="btn-primary w-full mt-3"
                >
                  {apply.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  Submit application
                </button>
              </>
            )}
            <div className="mt-5 pt-4 border-t border-stone-100 text-xs text-stone-500 space-y-1">
              <div>Posted {formatDate(job.publishedAt)}</div>
              <div>{job._count?.applications ?? 0} applicants</div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Section({ title, content }: { title: string; content: string }) {
  return (
    <section>
      <h2 className="font-display text-xl mb-3">{title}</h2>
      <div className="prose prose-stone max-w-none whitespace-pre-line text-stone-700 leading-relaxed">
        {content}
      </div>
    </section>
  );
}
