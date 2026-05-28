'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-store';
import { formatDate } from '@/lib/utils';
import { Calendar, Plus, X, Loader2 } from 'lucide-react';

const LEAVE_TYPES = [
  { key: 'ANNUAL', label: 'Annual leave' },
  { key: 'SICK', label: 'Sick leave' },
  { key: 'MATERNITY', label: 'Maternity' },
  { key: 'PATERNITY', label: 'Paternity' },
  { key: 'COMPASSIONATE', label: 'Compassionate' },
  { key: 'STUDY', label: 'Study leave' },
  { key: 'UNPAID', label: 'Unpaid leave' },
];

const STATUS_STYLES: Record<string, string> = {
  PENDING: 'bg-sand-100 text-sand-700',
  APPROVED: 'bg-emerald-50 text-emerald-800',
  REJECTED: 'bg-red-50 text-red-700',
  CANCELLED: 'bg-stone-100 text-stone-500',
};

export default function LeavePage() {
  const { accessToken } = useAuth();
  const qc = useQueryClient();
  const [showRequest, setShowRequest] = useState(false);

  const { data: balances } = useQuery({
    queryKey: ['leave-balances'],
    queryFn: () => api<any[]>('/hrms/leave/balances', { token: accessToken }),
    enabled: !!accessToken,
  });

  const { data: requests } = useQuery({
    queryKey: ['my-leave'],
    queryFn: () => api<any[]>('/hrms/leave/mine', { token: accessToken }),
    enabled: !!accessToken,
  });

  const create = useMutation({
    mutationFn: (data: any) => api('/hrms/leave', { method: 'POST', body: data, token: accessToken }),
    onSuccess: () => {
      toast.success('Leave request submitted');
      qc.invalidateQueries({ queryKey: ['my-leave'] });
      setShowRequest(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const cancel = useMutation({
    mutationFn: (id: string) => api(`/hrms/leave/${id}/cancel`, { method: 'POST', token: accessToken }),
    onSuccess: () => {
      toast.success('Leave cancelled');
      qc.invalidateQueries({ queryKey: ['my-leave'] });
      qc.invalidateQueries({ queryKey: ['leave-balances'] });
    },
  });

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    create.mutate({
      type: fd.get('type'),
      startDate: fd.get('startDate'),
      endDate: fd.get('endDate'),
      reason: fd.get('reason') || undefined,
    });
  }

  return (
    <div className="space-y-8">
      <header className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-stone-500 mb-2">Time off</div>
          <h1 className="font-display text-4xl">Manage your leave.</h1>
        </div>
        <button onClick={() => setShowRequest(true)} className="btn-primary shrink-0">
          <Plus className="w-4 h-4" /> Request time off
        </button>
      </header>

      {/* Balances */}
      <section>
        <h2 className="font-display text-xl mb-3">Balances ({new Date().getFullYear()})</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {balances?.filter((b) => b.entitled > 0).map((b: any) => (
            <div key={b.type} className="card">
              <div className="text-xs uppercase tracking-wider text-stone-500">
                {LEAVE_TYPES.find((t) => t.key === b.type)?.label ?? b.type}
              </div>
              <div className="mt-2">
                <span className="font-display text-2xl">{b.remaining}</span>
                <span className="text-stone-400 text-sm">/{b.entitled} days</span>
              </div>
              <div className="mt-2 h-1 bg-stone-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-forest-700"
                  style={{ width: `${(b.used / Math.max(b.entitled, 1)) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Requests */}
      <section>
        <h2 className="font-display text-xl mb-3">My requests</h2>
        {!requests || requests.length === 0 ? (
          <div className="card text-center py-12">
            <Calendar className="w-10 h-10 mx-auto mb-3 text-stone-300" />
            <p className="text-stone-500 text-sm">No leave requests yet.</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {requests.map((r: any) => (
              <div key={r.id} className="card">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">
                        {LEAVE_TYPES.find((t) => t.key === r.type)?.label ?? r.type}
                      </span>
                      <span className="text-xs text-stone-500 font-mono">{r.daysRequested} days</span>
                    </div>
                    <div className="text-sm text-stone-600">
                      {formatDate(r.startDate)} → {formatDate(r.endDate)}
                    </div>
                    {r.reason && (
                      <p className="text-sm text-stone-500 mt-2 italic">"{r.reason}"</p>
                    )}
                    {r.approverNote && (
                      <p className="text-sm bg-stone-50 rounded-md p-2 mt-2">
                        <span className="text-xs text-stone-500">Manager note:</span> {r.approverNote}
                      </p>
                    )}
                  </div>
                  <div className="text-right shrink-0 space-y-2">
                    <span className={`chip capitalize ${STATUS_STYLES[r.status]}`}>
                      {r.status.toLowerCase()}
                    </span>
                    {(r.status === 'PENDING' || r.status === 'APPROVED') && (
                      <button
                        onClick={() => cancel.mutate(r.id)}
                        className="block ml-auto text-xs text-stone-500 hover:text-red-700"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Request modal */}
      {showRequest && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200">
              <h2 className="font-display text-2xl">Request time off</h2>
              <button onClick={() => setShowRequest(false)}><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={onSubmit} className="p-6 space-y-4">
              <div>
                <label className="label">Type</label>
                <select name="type" required defaultValue="ANNUAL" className="input">
                  {LEAVE_TYPES.map((t) => (
                    <option key={t.key} value={t.key}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">From</label>
                  <input name="startDate" type="date" required className="input" />
                </div>
                <div>
                  <label className="label">To</label>
                  <input name="endDate" type="date" required className="input" />
                </div>
              </div>
              <div>
                <label className="label">Reason (optional)</label>
                <textarea name="reason" rows={3} className="input" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowRequest(false)} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={create.isPending} className="btn-primary">
                  {create.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  Submit request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
