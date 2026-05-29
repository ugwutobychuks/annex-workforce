'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-store';
import { formatNaira, formatDate } from '@/lib/utils';
import { Building2 } from 'lucide-react';
import Link from 'next/link';

const STATUS_STYLES: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-700',
  ACTIVE: 'bg-emerald-50 text-emerald-800',
  TERMINATED: 'bg-red-50 text-red-700',
  EXPIRED: 'bg-slate-100 text-slate-500',
};

export default function EorPage() {
  const { accessToken } = useAuth();
  const qc = useQueryClient();

  const { data: contracts } = useQuery({
    queryKey: ['eor-contracts'],
    queryFn: () => api<any[]>('/eor/contracts', { token: accessToken }),
    enabled: !!accessToken,
  });

  const activate = useMutation({
    mutationFn: (id: string) => api(`/eor/contracts/${id}/activate`, { method: 'POST', token: accessToken }),
    onSuccess: () => {
      toast.success('Contract activated');
      qc.invalidateQueries({ queryKey: ['eor-contracts'] });
    },
  });

  const terminate = useMutation({
    mutationFn: (id: string) => api(`/eor/contracts/${id}/terminate`, { method: 'POST', token: accessToken }),
    onSuccess: () => {
      toast.success('Contract terminated');
      qc.invalidateQueries({ queryKey: ['eor-contracts'] });
    },
  });

  return (
    <div className="space-y-8">
      <header className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-slate-500 mb-2">EOR contracts</div>
          <h1 className="font-display text-4xl">Your managed workforce.</h1>
          <p className="text-slate-600 mt-2">
            Annex acts as the legal employer. We handle contracts, payroll, and statutory compliance.
          </p>
        </div>
        <Link href="/employer/eor/new" className="btn-primary shrink-0">
          + New contract
        </Link>
      </header>

      {contracts?.length === 0 ? (
        <div className="card text-center py-16 text-slate-500">
          <Building2 className="w-10 h-10 mx-auto mb-3 text-slate-300" />
          No active contracts yet.
          <p className="text-xs mt-2">Contracts are created when you hire a candidate through Annex EOR.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {contracts?.map((c: any) => (
            <div key={c.id} className="card">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h3 className="font-medium">{c.jobTitle}</h3>
                  <div className="text-sm text-slate-600 mt-1">
                    Started {formatDate(c.startDate)} · {c.probationMonths} mo probation
                  </div>
                  <div className="grid grid-cols-3 gap-4 mt-4">
                    <div>
                      <div className="text-xs uppercase tracking-wider text-slate-500">Salary</div>
                      <div className="font-mono mt-1">{formatNaira(c.monthlySalary)} / mo</div>
                    </div>
                    <div>
                      <div className="text-xs uppercase tracking-wider text-slate-500">Mgmt fee</div>
                      <div className="font-mono mt-1">{formatNaira(c.managementFee)}</div>
                    </div>
                    <div>
                      <div className="text-xs uppercase tracking-wider text-slate-500">Currency</div>
                      <div className="font-mono mt-1">{c.currency}</div>
                    </div>
                  </div>
                </div>
                <div className="text-right space-y-2 shrink-0">
                  <span className={`chip capitalize ${STATUS_STYLES[c.status]}`}>{c.status.toLowerCase()}</span>
                  <div className="flex flex-col gap-2">
                    {c.status === 'PENDING' && (
                      <button onClick={() => activate.mutate(c.id)} className="btn-primary text-xs py-1 px-2.5">
                        Activate
                      </button>
                    )}
                    {c.status === 'ACTIVE' && (
                      <button onClick={() => terminate.mutate(c.id)} className="btn-secondary text-xs py-1 px-2.5">
                        Terminate
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
