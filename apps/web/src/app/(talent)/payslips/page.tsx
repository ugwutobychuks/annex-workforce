'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-store';
import { formatNaira, formatDate } from '@/lib/utils';
import { Receipt, Download, ChevronRight } from 'lucide-react';

export default function PayslipsPage() {
  const { accessToken } = useAuth();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: payslips, isLoading } = useQuery({
    queryKey: ['my-payslips'],
    queryFn: () => api<any[]>('/payroll/payslips/mine', { token: accessToken }),
    enabled: !!accessToken,
  });

  const selected = payslips?.find((p) => p.id === selectedId);

  return (
    <div className="space-y-6">
      <header>
        <div className="text-xs uppercase tracking-[0.18em] text-stone-500 mb-2">Payslips</div>
        <h1 className="font-display text-4xl">Your earnings.</h1>
        <p className="text-stone-600 mt-2">Monthly breakdown of gross, deductions, and net pay.</p>
      </header>

      {isLoading ? (
        <div className="text-stone-500">Loading…</div>
      ) : !payslips || payslips.length === 0 ? (
        <div className="card text-center py-16">
          <Receipt className="w-10 h-10 mx-auto mb-3 text-stone-300" />
          <p className="text-stone-500">No payslips yet.</p>
          <p className="text-xs text-stone-400 mt-2">
            Payslips appear here once you're employed through Annex EOR and your first payroll has run.
          </p>
        </div>
      ) : (
        <div className="grid lg:grid-cols-3 gap-6">
          {/* List */}
          <div className="lg:col-span-1 space-y-2">
            {payslips.map((p: any) => (
              <button
                key={p.id}
                onClick={() => setSelectedId(p.id)}
                className={`card w-full text-left transition-all ${
                  selectedId === p.id ? 'border-forest-700 ring-1 ring-forest-700' : 'hover:border-stone-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium font-mono">{p.payrollRun?.period}</div>
                    <div className="text-xs text-stone-500 mt-0.5">{p.contract?.jobTitle}</div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-stone-400" />
                </div>
                <div className="mt-2 font-mono text-sm text-forest-900">
                  {formatNaira(p.netSalary)}
                </div>
              </button>
            ))}
          </div>

          {/* Detail */}
          <div className="lg:col-span-2">
            {selected ? (
              <PayslipDetail payslip={selected} />
            ) : (
              <div className="card text-center py-16 text-stone-400">
                Select a payslip to view details
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function PayslipDetail({ payslip }: { payslip: any }) {
  return (
    <div className="card relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-forest-700 via-sand-400 to-ember-500" />

      <div className="flex items-baseline justify-between border-b border-stone-200 pb-4 mb-6">
        <div>
          <div className="text-xs uppercase tracking-wider text-stone-500">Payslip</div>
          <div className="font-display text-2xl">{payslip.payrollRun?.period}</div>
        </div>
        <div className="text-xs text-stone-500 font-mono">PSL-{payslip.id.slice(0, 8).toUpperCase()}</div>
      </div>

      <div className="space-y-1">
        <div className="text-xs uppercase tracking-wider text-stone-500 mb-2">Position</div>
        <div className="text-sm font-medium">{payslip.contract?.jobTitle}</div>
        <div className="text-xs text-stone-500">
          Run processed: {formatDate(payslip.payrollRun?.processedAt ?? payslip.payrollRun?.approvedAt ?? payslip.createdAt)}
        </div>
      </div>

      <table className="w-full mt-6 text-sm">
        <tbody>
          <tr>
            <td className="py-2.5 text-stone-700">Gross salary</td>
            <td className="text-right font-mono py-2.5">{formatNaira(payslip.grossSalary)}</td>
          </tr>
          <tr className="text-stone-500">
            <td className="py-1.5 text-xs pl-4">— PAYE tax</td>
            <td className="text-right text-xs font-mono py-1.5">−{formatNaira(payslip.payeTax)}</td>
          </tr>
          <tr className="text-stone-500">
            <td className="py-1.5 text-xs pl-4">— Pension contribution (8%)</td>
            <td className="text-right text-xs font-mono py-1.5">−{formatNaira(payslip.pension)}</td>
          </tr>
          <tr className="text-stone-500 border-b border-stone-200">
            <td className="py-1.5 text-xs pl-4 pb-3">— NHF (2.5%)</td>
            <td className="text-right text-xs font-mono py-1.5 pb-3">−{formatNaira(payslip.nhf)}</td>
          </tr>
          {Number(payslip.otherDeductions) > 0 && (
            <tr className="text-stone-500 border-b border-stone-200">
              <td className="py-1.5 text-xs pl-4 pb-3">— Other deductions</td>
              <td className="text-right text-xs font-mono py-1.5 pb-3">−{formatNaira(payslip.otherDeductions)}</td>
            </tr>
          )}
          <tr className="font-semibold">
            <td className="pt-4">Net pay</td>
            <td className="text-right pt-4 font-mono text-forest-900 text-lg">
              {formatNaira(payslip.netSalary)}
            </td>
          </tr>
        </tbody>
      </table>

      <div className="mt-6 pt-4 border-t border-stone-100 flex items-center justify-between">
        <div className="text-xs text-stone-500">
          Filed with FIRS · PenCom · Federal Mortgage Bank
        </div>
        {payslip.pdfUrl && (
          <a href={payslip.pdfUrl} target="_blank" rel="noopener" className="btn-secondary text-sm">
            <Download className="w-3.5 h-3.5" /> PDF
          </a>
        )}
      </div>
    </div>
  );
}
