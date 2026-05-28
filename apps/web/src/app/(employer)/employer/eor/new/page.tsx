'use client';
import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-store';
import { formatNaira } from '@/lib/utils';
import { ArrowLeft, Loader2, Calculator } from 'lucide-react';

export default function NewEorContractPage() {
  const router = useRouter();
  const { accessToken } = useAuth();

  const [candidateUserId, setCandidateUserId] = useState('');
  const [monthlySalary, setMonthlySalary] = useState('1000000');
  const [showEstimate, setShowEstimate] = useState(false);

  const { data: estimate } = useQuery({
    queryKey: ['eor-estimate', monthlySalary],
    queryFn: () => api<any>(`/payroll/estimate?gross=${monthlySalary}`, { token: accessToken }),
    enabled: showEstimate && Number(monthlySalary) > 0,
  });

  const create = useMutation({
    mutationFn: (data: any) => api('/eor/contracts', { method: 'POST', body: data, token: accessToken }),
    onSuccess: () => {
      toast.success('Contract created — pending activation');
      router.push('/employer/eor');
    },
    onError: (e: any) => toast.error(e.message),
  });

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    create.mutate({
      candidateUserId: fd.get('candidateUserId'),
      jobTitle: fd.get('jobTitle'),
      monthlySalary: Number(fd.get('monthlySalary')),
      currency: fd.get('currency') || 'NGN',
      startDate: fd.get('startDate'),
      endDate: fd.get('endDate') || undefined,
      probationMonths: Number(fd.get('probationMonths') || 3),
      managementFee: fd.get('managementFee') ? Number(fd.get('managementFee')) : undefined,
    });
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <Link href="/employer/eor" className="inline-flex items-center gap-1 text-sm text-stone-600 hover:text-forest-700">
        <ArrowLeft className="w-4 h-4" /> All contracts
      </Link>

      <header>
        <div className="text-xs uppercase tracking-[0.18em] text-stone-500 mb-2">New EOR contract</div>
        <h1 className="font-display text-4xl">Hire through Annex.</h1>
        <p className="text-stone-600 mt-2">
          Annex becomes the legal employer. We hold the contract, run payroll, and file taxes.
        </p>
      </header>

      <form onSubmit={onSubmit} className="card space-y-5">
        <div>
          <label className="label">Candidate user ID</label>
          <input
            name="candidateUserId"
            required
            value={candidateUserId}
            onChange={(e) => setCandidateUserId(e.target.value)}
            className="input font-mono text-sm"
            placeholder="e.g. b7e6e2c0-..."
          />
          <p className="text-xs text-stone-500 mt-1.5">
            Find this in <Link href="/employer/talent" className="text-forest-700 hover:underline">Talent search</Link> or
            from the application detail when moving someone to "Hired".
          </p>
        </div>

        <div>
          <label className="label">Job title</label>
          <input name="jobTitle" required className="input" placeholder="e.g. Senior Backend Engineer" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Monthly gross salary</label>
            <input
              name="monthlySalary"
              type="number"
              required
              min={0}
              value={monthlySalary}
              onChange={(e) => setMonthlySalary(e.target.value)}
              className="input"
            />
          </div>
          <div>
            <label className="label">Currency</label>
            <select name="currency" defaultValue="NGN" className="input">
              <option value="NGN">NGN</option>
              <option value="USD">USD</option>
              <option value="KES">KES</option>
              <option value="GHS">GHS</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Start date</label>
            <input name="startDate" type="date" required className="input" />
          </div>
          <div>
            <label className="label">End date (optional)</label>
            <input name="endDate" type="date" className="input" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Probation (months)</label>
            <input name="probationMonths" type="number" min={0} max={12} defaultValue={3} className="input" />
          </div>
          <div>
            <label className="label">Management fee (NGN, optional)</label>
            <input name="managementFee" type="number" min={0} className="input" placeholder="Default: 8% of salary, min ₦50k" />
          </div>
        </div>

        {/* Cost preview */}
        <div className="border-t border-stone-200 pt-5">
          <button
            type="button"
            onClick={() => setShowEstimate(!showEstimate)}
            className="flex items-center gap-2 text-sm text-forest-700 hover:underline"
          >
            <Calculator className="w-4 h-4" />
            {showEstimate ? 'Hide' : 'Preview'} cost breakdown
          </button>

          {showEstimate && estimate && (
            <div className="mt-4 bg-stone-50 rounded-md p-4 font-mono text-sm space-y-1.5">
              <Row label="Gross monthly" value={formatNaira(estimate.grossSalary)} />
              <Row label="− Employee PAYE" value={formatNaira(estimate.payeTax)} muted />
              <Row label="− Employee pension (8%)" value={formatNaira(estimate.pensionEmployee)} muted />
              <Row label="− Employee NHF (2.5%)" value={formatNaira(estimate.nhf)} muted />
              <hr className="my-2 border-stone-200" />
              <Row label="Net take-home" value={formatNaira(estimate.netSalary)} bold />
              <hr className="my-2 border-stone-200" />
              <Row label="Employer pension (10%)" value={formatNaira(estimate.pensionEmployer)} muted />
              <Row label="Total employer cost / mo" value={formatNaira(estimate.totalEmployerCost)} bold />
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 border-t border-stone-200 pt-5">
          <Link href="/employer/eor" className="btn-secondary">Cancel</Link>
          <button type="submit" disabled={create.isPending} className="btn-primary">
            {create.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            Create contract
          </button>
        </div>
      </form>
    </div>
  );
}

function Row({ label, value, muted, bold }: any) {
  return (
    <div className={`flex justify-between ${muted ? 'text-stone-500' : ''} ${bold ? 'font-semibold text-forest-900' : ''}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
