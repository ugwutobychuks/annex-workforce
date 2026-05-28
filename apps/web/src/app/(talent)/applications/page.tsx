'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-store';
import { useLivePollInterval } from '@/lib/use-live-poll';
import { formatDate, relativeTime } from '@/lib/utils';
import { FileText, ExternalLink } from 'lucide-react';

const STATUS_STYLES: Record<string, string> = {
  APPLIED: 'bg-stone-100 text-stone-700',
  SCREENING: 'bg-sand-100 text-sand-700',
  SHORTLISTED: 'bg-blue-50 text-blue-800',
  INTERVIEW: 'bg-amber-50 text-amber-800',
  OFFER: 'bg-emerald-50 text-emerald-800',
  HIRED: 'bg-emerald-100 text-emerald-900',
  REJECTED: 'bg-red-50 text-red-700',
  WITHDRAWN: 'bg-stone-100 text-stone-500',
};

export default function ApplicationsPage() {
  const { accessToken } = useAuth();
  const qc = useQueryClient();
  const refetchInterval = useLivePollInterval(20000);

  const { data: applications, isLoading } = useQuery({
    queryKey: ['my-applications'],
    queryFn: () => api<any[]>('/applications/mine', { token: accessToken }),
    enabled: !!accessToken,
    refetchInterval,
  });

  const withdraw = useMutation({
    mutationFn: (id: string) => api(`/applications/${id}/withdraw`, { method: 'POST', token: accessToken }),
    onSuccess: () => {
      toast.success('Application withdrawn');
      qc.invalidateQueries({ queryKey: ['my-applications'] });
    },
  });

  return (
    <div className="space-y-6">
      <header>
        <div className="text-xs uppercase tracking-[0.18em] text-stone-500 mb-2">Applications</div>
        <h1 className="font-display text-4xl">Track your progress.</h1>
      </header>

      {isLoading ? (
        <div className="text-stone-500">Loading…</div>
      ) : applications?.length === 0 ? (
        <div className="card text-center py-16">
          <FileText className="w-10 h-10 mx-auto mb-3 text-stone-300" />
          <p className="text-stone-500">You haven't applied to any jobs yet.</p>
          <Link href="/jobs" className="btn-primary mt-5">Browse jobs</Link>
        </div>
      ) : (
        <div className="grid gap-3">
          {applications?.map((a: any) => (
            <div key={a.id} className="card">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Link href={`/jobs/${a.job.id}`} className="font-medium hover:text-forest-700 truncate">
                      {a.job.title}
                    </Link>
                    <ExternalLink className="w-3.5 h-3.5 text-stone-400" />
                  </div>
                  <div className="text-sm text-stone-600">
                    {a.job.employer?.name} · {a.job.location ?? a.job.country}
                  </div>
                  <div className="text-xs text-stone-500 mt-1">
                    Applied {relativeTime(a.appliedAt)}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium capitalize ${STATUS_STYLES[a.status] ?? 'bg-stone-100'}`}>
                    {a.status.toLowerCase().replace('_', ' ')}
                  </span>
                  {!['WITHDRAWN', 'HIRED', 'REJECTED'].includes(a.status) && (
                    <button
                      onClick={() => withdraw.mutate(a.id)}
                      className="block ml-auto mt-2 text-xs text-stone-500 hover:text-red-700"
                    >
                      Withdraw
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
