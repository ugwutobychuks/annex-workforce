'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-store';
import { formatNaira } from '@/lib/utils';
import { Calculator, Plus, Loader2 } from 'lucide-react';

export default function PayrollPage() {
  const { accessToken } = useAuth();
  const qc = useQueryClient();
  const [period, setPeriod] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [estimateGross, setEstimateGross] = useState('1000000');

  const { data: runs } = useQuery({
    queryKey: ['payroll-runs'],
    queryFn: () => api<any[]>('/payroll/runs', { token: accessToken }),
    enabled: !!accessToken,
  });

  const { data: estimate } = useQuery({
    queryKey: ['payroll-estimate', estimateGross],
    queryFn: () => api<any>(`/payroll/estimate?gross=${estimateGross}`, { token: accessToken }),
    enabled: !!estimateGross && Number(estimateGross) > 0,
  });

  const createRun = useMutation({
    mutationFn: () => api('/payroll/runs', { method: 'POST', body: { period }, token: accessToken }),
    onSuccess: () => {
      toast.success('Payroll run created (draft)');
      qc.invalidateQueries({ queryKey: ['payroll-runs'] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const approve = useMutation({
    mutationFn: (id: string) => api(`/payroll/runs/${id}/approve`, { method: 'POST', token: accessToken }),
    onSuccess: () => {
      toast.success('Run approved');
      qc.invalidateQueries({ queryKey: ['payroll-runs'] });
    },
  });

  const process = useMutation({
    mutationFn: (id: string) => api(`/payroll/runs/${id}/process`, { method: 'POST', token: accessToken }),
    onSuccess: () => {
      toast.success('Payments dispatched');
      qc.invalidateQueries({ queryKey: ['payroll-runs'] });
    },
  });

  return (
    <div className="space-y-8">
      <header>
        <div className="text-xs uppercase tracking-[0.18em] text-slate-500 mb-2">Payroll</div>
        <h1 className="font-display text-4xl">Pay your team.</h1>
        <p className="text-slate-600 mt-2">PAYE, Pension, and NHF computed automatically per Nigerian tax law.</p>
      </header>

      {/* Estimator */}
      <div className="card">
        <h2 className="font-display text-xl mb-4 flex items-center gap-2">
          <Calculator className="w-5 h-5" /> Salary calculator
        </h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label className="label">Gross monthly salary (NGN)</label>
            <input
              type="number"
              value={estimateGross}
              onChange={(e) => setEstimateGross(e.target.value)}
              className="input"
            />
            <p className="text-xs text-slate-500 mt-2">
              Calculations follow Finance Act 2020 PAYE bands and Pension Reform Act rates.
            </p>
          </div>
          {estimate && (
            <div className="bg-slate-50 rounded-md p-4 font-mono text-sm space-y-1.5">
              <Row label="Gross" value={formatNaira(estimate.grossSalary)} />
              <Row label="Basic (50%)" value={formatNaira(estimate.basicSalary)} muted />
              <hr className="my-2 border-slate-200" />
              <Row label="− PAYE" value={formatNaira(estimate.payeTax)} muted />
              <Row label="− Pension (8%)" value={formatNaira(estimate.pensionEmployee)} muted />
              <Row label="− NHF (2.5%)" value={formatNaira(estimate.nhf)} muted />
              <hr className="my-2 border-slate-200" />
              <Row label="Net pay" value={formatNaira(estimate.netSalary)} bold />
              <hr className="my-2 border-slate-200" />
              <Row label="Employer pension" value={formatNaira(estimate.pensionEmployer)} muted />
              <Row label="Total employer cost" value={formatNaira(estimate.totalEmployerCost)} bold />
            </div>
          )}
        </div>
      </div>

      {/* New run */}
      <div className="card flex items-end gap-3">
        <div className="flex-1">
          <label className="label">New payroll run</label>
          <input type="month" value={period} onChange={(e) => setPeriod(e.target.value)} className="input" />
        </div>
        <button onClick={() => createRun.mutate()} disabled={createRun.isPending} className="btn-primary">
          {createRun.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
          <Plus className="w-4 h-4" /> Generate
        </button>
      </div>

      {/* Runs */}
      <div>
        <h2 className="font-display text-xl mb-4">Recent runs</h2>
        <div className="grid gap-3">
          {runs?.length === 0 && (
            <div className="card text-center py-12 text-slate-500">No payroll runs yet.</div>
          )}
          {runs?.map((r) => (
            <div key={r.id} className="card">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="font-medium font-mono">{r.period}</div>
                  <div className="text-sm text-slate-500 mt-1">{r._count?.payslips ?? 0} payslips</div>
                  <div className="grid grid-cols-3 gap-4 mt-3 text-sm font-mono">
                    <div>
                      <div className="text-xs text-slate-500">Gross</div>
                      <div>{formatNaira(r.totalGross)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500">Tax</div>
                      <div>{formatNaira(r.totalTax)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500">Net</div>
                      <div className="text-brand-900">{formatNaira(r.totalNet)}</div>
                    </div>
                  </div>
                </div>
                <div className="text-right space-y-2 shrink-0">
                  <span className={`chip capitalize ${
                    r.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-800'
                    : r.status === 'APPROVED' ? 'bg-blue-50 text-blue-800'
                    : 'bg-slate-100 text-slate-600'
                  }`}>
                    {r.status.toLowerCase()}
                  </span>
                  <div className="flex flex-col gap-2">
                    {r.status === 'DRAFT' && (
                      <button onClick={() => approve.mutate(r.id)} className="btn-primary text-xs py-1 px-2.5">Approve</button>
                    )}
                    {r.status === 'APPROVED' && (
                      <button onClick={() => process.mutate(r.id)} className="btn-primary text-xs py-1 px-2.5">Disburse</button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, muted, bold }: any) {
  return (
    <div className={`flex justify-between ${muted ? 'text-slate-500' : ''} ${bold ? 'font-semibold text-brand-900' : ''}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
