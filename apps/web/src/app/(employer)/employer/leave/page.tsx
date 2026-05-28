'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-store';
import { useLivePollInterval } from '@/lib/use-live-poll';
import { formatDate } from '@/lib/utils';
import { Calendar, Check, X, Loader2 } from 'lucide-react';

const STATUS_STYLES: Record<string, string> = {
  PENDING: 'bg-sand-100 text-sand-700',
  APPROVED: 'bg-emerald-50 text-emerald-800',
  REJECTED: 'bg-red-50 text-red-700',
  CANCELLED: 'bg-stone-100 text-stone-500',
};

export default function EmployerLeavePage() {
  const { accessToken } = useAuth();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<'pending' | 'all'>('pending');
  const refetchInterval = useLivePollInterval(20000);

  const { data: requests, isLoading } = useQuery({
    queryKey: ['employer-leave', filter],
    queryFn: () =>
      api<any[]>(filter === 'pending' ? '/hrms/leave/pending' : '/hrms/leave', {
        token: accessToken,
      }),
    enabled: !!accessToken,
    refetchInterval,
  });

  const decide = useMutation({
    mutationFn: ({ id, decision, note }: { id: string; decision: string; note?: string }) =>
      api(`/hrms/leave/${id}/decision`, {
        method: 'PATCH',
        body: { decision, note },
        token: accessToken,
      }),
    onSuccess: () => {
      toast.success('Decision recorded');
      qc.invalidateQueries({ queryKey: ['employer-leave'] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <header>
        <div className="text-xs uppercase tracking-[0.18em] text-stone-500 mb-2">Time off</div>
        <h1 className="font-display text-4xl">Approve team leave.</h1>
        <p className="text-stone-600 mt-2">Review and decide on pending leave requests.</p>
      </header>

      <div className="flex gap-2">
        <button
          onClick={() => setFilter('pending')}
          className={`px-3 py-1.5 rounded-md text-sm ${
            filter === 'pending' ? 'bg-forest-900 text-white' : 'bg-white border border-stone-300 text-stone-700'
          }`}
        >
          Pending
        </button>
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1.5 rounded-md text-sm ${
            filter === 'all' ? 'bg-forest-900 text-white' : 'bg-white border border-stone-300 text-stone-700'
          }`}
        >
          All requests
        </button>
      </div>

      {isLoading ? (
        <div className="text-stone-500">Loading…</div>
      ) : !requests || requests.length === 0 ? (
        <div className="card text-center py-16">
          <Calendar className="w-10 h-10 mx-auto mb-3 text-stone-300" />
          <p className="text-stone-500">
            {filter === 'pending' ? 'No pending requests.' : 'No leave requests yet.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {requests.map((r: any) => (
            <LeaveCard
              key={r.id}
              request={r}
              onApprove={(note) => decide.mutate({ id: r.id, decision: 'APPROVED', note })}
              onReject={(note) => decide.mutate({ id: r.id, decision: 'REJECTED', note })}
              isPending={decide.isPending}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function LeaveCard({ request, onApprove, onReject, isPending }: any) {
  const [showNote, setShowNote] = useState(false);
  const [note, setNote] = useState('');

  return (
    <div className="card">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium font-mono text-sm">Employee {request.employeeId.slice(0, 8)}</span>
            <span className="chip">{request.type}</span>
          </div>
          <div className="text-sm text-stone-600">
            {formatDate(request.startDate)} → {formatDate(request.endDate)} ({request.daysRequested} working days)
          </div>
          {request.reason && (
            <p className="text-sm text-stone-700 mt-2 italic">"{request.reason}"</p>
          )}
        </div>
        <div className="text-right shrink-0 space-y-2">
          <span className={`chip capitalize ${STATUS_STYLES[request.status]}`}>
            {request.status.toLowerCase()}
          </span>
          {request.status === 'PENDING' && !showNote && (
            <div className="flex gap-2">
              <button
                onClick={() => onApprove()}
                disabled={isPending}
                className="btn-primary text-xs py-1 px-2.5"
              >
                <Check className="w-3.5 h-3.5" /> Approve
              </button>
              <button
                onClick={() => setShowNote(true)}
                className="btn-secondary text-xs py-1 px-2.5"
              >
                <X className="w-3.5 h-3.5" /> Reject
              </button>
            </div>
          )}
        </div>
      </div>

      {showNote && request.status === 'PENDING' && (
        <div className="mt-4 pt-4 border-t border-stone-200 space-y-3">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Reason for rejection (optional)"
            rows={2}
            className="input"
          />
          <div className="flex justify-end gap-2">
            <button onClick={() => { setShowNote(false); setNote(''); }} className="btn-secondary text-sm">
              Cancel
            </button>
            <button
              onClick={() => {
                onReject(note || undefined);
                setShowNote(false);
                setNote('');
              }}
              disabled={isPending}
              className="btn-primary text-sm bg-red-700 hover:bg-red-800"
            >
              {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Confirm reject
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
