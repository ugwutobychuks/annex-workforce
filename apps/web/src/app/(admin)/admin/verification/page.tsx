'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-store';
import { useLivePollInterval } from '@/lib/use-live-poll';
import { formatDate } from '@/lib/utils';
import { Check, X, ShieldCheck } from 'lucide-react';

export default function VerificationQueuePage() {
  const { accessToken } = useAuth();
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('PENDING');
  const refetchInterval = useLivePollInterval(20000);

  const { data } = useQuery({
    queryKey: ['verification-queue', statusFilter],
    queryFn: () =>
      api<{ items: any[]; total: number }>(
        `/verification/admin/queue?status=${statusFilter}&limit=50`,
        { token: accessToken },
      ),
    enabled: !!accessToken,
    refetchInterval,
  });

  const approve = useMutation({
    mutationFn: (id: string) => api(`/verification/admin/${id}/approve`, { method: 'POST', token: accessToken }),
    onSuccess: () => {
      toast.success('Approved');
      qc.invalidateQueries({ queryKey: ['verification-queue'] });
    },
  });

  const reject = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      api(`/verification/admin/${id}/reject`, { method: 'POST', body: { reason }, token: accessToken }),
    onSuccess: () => {
      toast.success('Rejected');
      qc.invalidateQueries({ queryKey: ['verification-queue'] });
    },
  });

  return (
    <div className="space-y-6">
      <header>
        <div className="text-xs uppercase tracking-[0.18em] text-slate-500 mb-2">Verification</div>
        <h1 className="font-display text-4xl">Review verification requests.</h1>
      </header>

      <div className="flex gap-2">
        {['PENDING', 'VERIFIED', 'FAILED'].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-md text-sm ${
              statusFilter === s ? 'bg-brand-900 text-white' : 'bg-white border border-slate-300 text-slate-700'
            }`}
          >
            {s.toLowerCase()}
          </button>
        ))}
      </div>

      <div className="grid gap-3">
        {data?.items?.length === 0 && (
          <div className="card text-center py-12 text-slate-500">
            <ShieldCheck className="w-10 h-10 mx-auto mb-3 text-slate-300" />
            No items match.
          </div>
        )}
        {data?.items?.map((v: any) => (
          <div key={v.id} className="card">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">
                    {v.candidate?.user?.firstName} {v.candidate?.user?.lastName}
                  </span>
                  <span className="text-xs text-slate-500">{v.candidate?.user?.email}</span>
                </div>
                <div className="text-sm text-slate-600 mt-1">
                  {v.type} · provider: {v.provider} · initiated {formatDate(v.initiatedAt)}
                </div>
                {v.result && Object.keys(v.result).length > 0 && (
                  <pre className="mt-3 bg-slate-50 rounded-md p-2 text-xs text-slate-700 overflow-x-auto">
                    {JSON.stringify(v.result, null, 2)}
                  </pre>
                )}
              </div>
              {v.status === 'PENDING' && (
                <div className="flex flex-col gap-2 shrink-0">
                  <button onClick={() => approve.mutate(v.id)} className="btn-primary text-xs py-1 px-2.5">
                    <Check className="w-3.5 h-3.5" /> Approve
                  </button>
                  <button
                    onClick={() => {
                      const reason = prompt('Rejection reason?');
                      if (reason) reject.mutate({ id: v.id, reason });
                    }}
                    className="btn-secondary text-xs py-1 px-2.5"
                  >
                    <X className="w-3.5 h-3.5" /> Reject
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
