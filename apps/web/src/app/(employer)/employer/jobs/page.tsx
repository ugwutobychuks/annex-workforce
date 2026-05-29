'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-store';
import { formatNaira } from '@/lib/utils';
import Link from 'next/link';
import { Plus, Loader2, X, Users } from 'lucide-react';

export default function EmployerJobsPage() {
  const { accessToken } = useAuth();
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);

  const { data: jobs } = useQuery({
    queryKey: ['employer-jobs'],
    queryFn: () => api<any[]>('/jobs/mine', { token: accessToken }),
    enabled: !!accessToken,
  });

  const createJob = useMutation({
    mutationFn: (data: any) => api('/jobs', { method: 'POST', body: data, token: accessToken }),
    onSuccess: () => {
      toast.success('Job created (draft)');
      qc.invalidateQueries({ queryKey: ['employer-jobs'] });
      setShowCreate(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const publish = useMutation({
    mutationFn: (id: string) => api(`/jobs/${id}/publish`, { method: 'POST', token: accessToken }),
    onSuccess: () => {
      toast.success('Job published');
      qc.invalidateQueries({ queryKey: ['employer-jobs'] });
    },
  });

  const close = useMutation({
    mutationFn: (id: string) => api(`/jobs/${id}/close`, { method: 'POST', token: accessToken }),
    onSuccess: () => {
      toast.success('Job closed');
      qc.invalidateQueries({ queryKey: ['employer-jobs'] });
    },
  });

  function onCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    createJob.mutate({
      title: fd.get('title'),
      description: fd.get('description'),
      requirements: fd.get('requirements') || undefined,
      benefits: fd.get('benefits') || undefined,
      location: fd.get('location') || undefined,
      country: fd.get('country') || 'NG',
      workArrangement: fd.get('workArrangement'),
      employmentType: fd.get('employmentType'),
      seniority: fd.get('seniority'),
      salaryMin: Number(fd.get('salaryMin') || 0) || undefined,
      salaryMax: Number(fd.get('salaryMax') || 0) || undefined,
      salaryCurrency: fd.get('salaryCurrency') || 'NGN',
      isEor: fd.get('isEor') === 'on',
      skillNames: String(fd.get('skillNames') || '').split(',').map((s) => s.trim()).filter(Boolean),
    });
  }

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-slate-500 mb-2">Jobs</div>
          <h1 className="font-display text-4xl">Manage your roles.</h1>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary">
          <Plus className="w-4 h-4" /> New job
        </button>
      </header>

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 overflow-auto">
          <div className="bg-white rounded-lg w-full max-w-2xl my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 sticky top-0 bg-white">
              <h2 className="font-display text-2xl">Create a job</h2>
              <button onClick={() => setShowCreate(false)}><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={onCreate} className="p-6 space-y-4">
              <div>
                <label className="label">Title</label>
                <input name="title" required className="input" placeholder="e.g. Senior Backend Engineer" />
              </div>
              <div>
                <label className="label">Description</label>
                <textarea name="description" required rows={4} className="input" />
              </div>
              <div>
                <label className="label">Requirements</label>
                <textarea name="requirements" rows={3} className="input" />
              </div>
              <div>
                <label className="label">Benefits</label>
                <textarea name="benefits" rows={2} className="input" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Location</label>
                  <input name="location" className="input" placeholder="Lagos" />
                </div>
                <div>
                  <label className="label">Country</label>
                  <select name="country" defaultValue="NG" className="input">
                    <option value="NG">Nigeria</option>
                    <option value="KE">Kenya</option>
                    <option value="GH">Ghana</option>
                    <option value="ZA">South Africa</option>
                  </select>
                </div>
                <div>
                  <label className="label">Work arrangement</label>
                  <select name="workArrangement" defaultValue="REMOTE" className="input">
                    <option value="REMOTE">Remote</option>
                    <option value="HYBRID">Hybrid</option>
                    <option value="ONSITE">On-site</option>
                  </select>
                </div>
                <div>
                  <label className="label">Employment type</label>
                  <select name="employmentType" defaultValue="FULL_TIME" className="input">
                    <option value="FULL_TIME">Full-time</option>
                    <option value="PART_TIME">Part-time</option>
                    <option value="CONTRACT">Contract</option>
                    <option value="INTERNSHIP">Internship</option>
                    <option value="FREELANCE">Freelance</option>
                  </select>
                </div>
                <div>
                  <label className="label">Seniority</label>
                  <select name="seniority" defaultValue="MID" className="input">
                    <option value="ENTRY">Entry</option>
                    <option value="JUNIOR">Junior</option>
                    <option value="MID">Mid</option>
                    <option value="SENIOR">Senior</option>
                    <option value="LEAD">Lead</option>
                    <option value="PRINCIPAL">Principal</option>
                  </select>
                </div>
                <div>
                  <label className="label">Currency</label>
                  <select name="salaryCurrency" defaultValue="NGN" className="input">
                    <option value="NGN">NGN</option>
                    <option value="USD">USD</option>
                  </select>
                </div>
                <div>
                  <label className="label">Salary min</label>
                  <input name="salaryMin" type="number" className="input" />
                </div>
                <div>
                  <label className="label">Salary max</label>
                  <input name="salaryMax" type="number" className="input" />
                </div>
              </div>
              <div>
                <label className="label">Skills (comma-separated)</label>
                <input name="skillNames" className="input" placeholder="TypeScript, NestJS, PostgreSQL" />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input name="isEor" type="checkbox" />
                Hire through Annex EOR (we handle local employment)
              </label>
              <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
                <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={createJob.isPending} className="btn-primary">
                  {createJob.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  Save as draft
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Jobs list */}
      <div className="grid gap-3">
        {jobs?.length === 0 && (
          <div className="card text-center py-16 text-slate-500">
            No jobs yet. Click "New job" to get started.
          </div>
        )}
        {jobs?.map((j) => (
          <div key={j.id} className="card">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-display text-xl">{j.title}</h3>
                <div className="text-sm text-slate-600 mt-1 capitalize">
                  {j.workArrangement?.toLowerCase()} · {j.employmentType?.replace('_', ' ').toLowerCase()} · {j.seniority?.toLowerCase()}
                </div>
                <div className="text-sm text-slate-500 mt-2">
                  {j._count?.applications ?? 0} applicants ·{' '}
                  {j.salaryMin && j.salaryMax ? `${formatNaira(j.salaryMin)} – ${formatNaira(j.salaryMax)}` : 'Salary not specified'}
                </div>
                <Link
                  href={`/employer/jobs/${j.id}`}
                  className="inline-flex items-center gap-1.5 mt-3 text-sm text-brand-700 hover:underline"
                >
                  <Users className="w-3.5 h-3.5" /> View applicants
                </Link>
              </div>
              <div className="text-right space-y-2">
                <span className={`chip ${j.status === 'PUBLISHED' ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>
                  {j.status.toLowerCase()}
                </span>
                <div className="flex gap-2 justify-end">
                  {j.status === 'DRAFT' && (
                    <button onClick={() => publish.mutate(j.id)} className="btn-primary text-xs py-1 px-2.5">
                      Publish
                    </button>
                  )}
                  {j.status === 'PUBLISHED' && (
                    <button onClick={() => close.mutate(j.id)} className="btn-secondary text-xs py-1 px-2.5">
                      Close
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
