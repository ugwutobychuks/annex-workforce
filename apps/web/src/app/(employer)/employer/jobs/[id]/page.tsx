'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-store';
import { useLivePollInterval } from '@/lib/use-live-poll';
import { LiveIndicator } from '@/components/live-indicator';
import { formatNaira, relativeTime } from '@/lib/utils';
import { ArrowLeft, Mail, MapPin, ShieldCheck, ChevronDown, Loader2 } from 'lucide-react';

const PIPELINE = [
  { key: 'APPLIED', label: 'New' },
  { key: 'SCREENING', label: 'Screening' },
  { key: 'SHORTLISTED', label: 'Shortlisted' },
  { key: 'INTERVIEW', label: 'Interview' },
  { key: 'OFFER', label: 'Offer' },
  { key: 'HIRED', label: 'Hired' },
  { key: 'REJECTED', label: 'Rejected' },
] as const;

export default function EmployerJobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { accessToken } = useAuth();
  const qc = useQueryClient();
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);

  const refetchInterval = useLivePollInterval(15000);

  const { data: job } = useQuery({
    queryKey: ['job', id],
    queryFn: () => api<any>(`/jobs/${id}`, { token: accessToken }),
    enabled: !!accessToken,
  });

  const { data: applications, dataUpdatedAt: appsUpdatedAt } = useQuery({
    queryKey: ['job-applications', id],
    queryFn: () => api<any[]>(`/applications/job/${id}`, { token: accessToken }),
    enabled: !!accessToken,
    refetchInterval,
  });

  const updateStatus = useMutation({
    mutationFn: ({ appId, status, note }: { appId: string; status: string; note?: string }) =>
      api(`/applications/${appId}/status`, {
        method: 'PATCH',
        body: { status, note },
        token: accessToken,
      }),
    onSuccess: () => {
      toast.success('Application updated');
      qc.invalidateQueries({ queryKey: ['job-applications', id] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Group applications by status for the kanban view
  const byStatus = PIPELINE.reduce<Record<string, any[]>>((acc, s) => {
    acc[s.key] = applications?.filter((a) => a.status === s.key) ?? [];
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <Link href="/employer/jobs" className="inline-flex items-center gap-1 text-sm text-stone-600 hover:text-forest-700">
        <ArrowLeft className="w-4 h-4" /> Back to jobs
      </Link>

      <header className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-stone-500 mb-2">Applicants</div>
          <h1 className="font-display text-4xl">{job?.title ?? 'Loading...'}</h1>
          <div className="text-sm text-stone-600 mt-2 flex items-center gap-3 flex-wrap">
            <span>{applications?.length ?? 0} applicants</span>
            <LiveIndicator updatedAt={appsUpdatedAt} />
            <span>·</span>
            <span className={`chip ${job?.status === 'PUBLISHED' ? 'bg-emerald-50 text-emerald-800' : 'bg-stone-100'}`}>
              {job?.status?.toLowerCase()}
            </span>
            {job?.salaryMin && job?.salaryMax && (
              <>
                <span>·</span>
                <span className="font-mono text-xs">
                  {formatNaira(job.salaryMin)} – {formatNaira(job.salaryMax)}
                </span>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Pipeline columns */}
      <div className="overflow-x-auto -mx-8 px-8">
        <div className="grid grid-flow-col auto-cols-[280px] gap-3 pb-4">
          {PIPELINE.map((stage) => (
            <div key={stage.key} className="bg-stone-100/70 rounded-lg p-3">
              <div className="flex items-center justify-between mb-3 px-1">
                <span className="text-xs font-medium uppercase tracking-wider text-stone-600">
                  {stage.label}
                </span>
                <span className="text-xs text-stone-500 font-mono">{byStatus[stage.key].length}</span>
              </div>
              <div className="space-y-2 min-h-[80px]">
                {byStatus[stage.key].map((app) => (
                  <ApplicantCard
                    key={app.id}
                    app={app}
                    onClick={() => setSelectedAppId(app.id)}
                    onMove={(newStatus) => updateStatus.mutate({ appId: app.id, status: newStatus })}
                  />
                ))}
                {byStatus[stage.key].length === 0 && (
                  <div className="text-xs text-stone-400 px-2 py-3 text-center">
                    None
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Detail drawer */}
      {selectedAppId && (
        <ApplicantDetail
          applicationId={selectedAppId}
          onClose={() => setSelectedAppId(null)}
          onStatusChange={(status, note) => {
            updateStatus.mutate({ appId: selectedAppId, status, note });
          }}
        />
      )}
    </div>
  );
}

function ApplicantCard({ app, onClick, onMove }: any) {
  const c = app.candidate;
  const u = c.user;
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div className="bg-white border border-stone-200 rounded-md p-3 hover:border-forest-300 transition-colors relative">
      <button onClick={onClick} className="block w-full text-left">
        <div className="flex items-start gap-2">
          <div className="w-8 h-8 rounded-full bg-forest-50 border border-forest-100 flex items-center justify-center font-display text-xs font-semibold text-forest-900 shrink-0">
            {u.firstName?.[0]}{u.lastName?.[0]}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium truncate">{u.firstName} {u.lastName}</div>
            <div className="text-xs text-stone-500 truncate">{c.headline ?? '—'}</div>
          </div>
        </div>
        <div className="flex flex-wrap gap-1 mt-2">
          {(c.skills ?? []).slice(0, 3).map((s: any) => (
            <span key={s.id} className="text-[10px] px-1.5 py-0.5 rounded bg-forest-50 text-forest-900">
              {s.skill.name}
            </span>
          ))}
        </div>
        <div className="text-[10px] text-stone-400 mt-2">Applied {relativeTime(app.appliedAt)}</div>
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
        className="absolute top-2 right-2 text-stone-400 hover:text-stone-700 p-1"
      >
        <ChevronDown className="w-3 h-3" />
      </button>
      {showMenu && (
        <div
          className="absolute top-8 right-2 bg-white border border-stone-200 rounded-md shadow-lg z-10 py-1 min-w-[140px]"
          onMouseLeave={() => setShowMenu(false)}
        >
          {PIPELINE.filter((s) => s.key !== app.status).map((s) => (
            <button
              key={s.key}
              onClick={() => { onMove(s.key); setShowMenu(false); }}
              className="block w-full text-left px-3 py-1.5 text-xs hover:bg-stone-50"
            >
              → {s.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ApplicantDetail({ applicationId, onClose, onStatusChange }: any) {
  const { accessToken } = useAuth();
  const [note, setNote] = useState('');
  const [nextStatus, setNextStatus] = useState('');

  const { data: app, isLoading } = useQuery({
    queryKey: ['application', applicationId],
    queryFn: () => api<any>(`/applications/${applicationId}`, { token: accessToken }),
    enabled: !!accessToken,
  });

  if (isLoading || !app) {
    return (
      <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-white" />
      </div>
    );
  }

  const c = app.candidate;
  const u = c.user;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex justify-end" onClick={onClose}>
      <div
        className="bg-white w-full max-w-2xl h-full overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white border-b border-stone-200 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="font-display text-2xl">{u.firstName} {u.lastName}</h2>
          <button onClick={onClose} className="text-stone-500 hover:text-stone-900">✕</button>
        </div>

        <div className="p-6 space-y-6">
          {/* Contact + meta */}
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-full bg-forest-50 border border-forest-100 flex items-center justify-center font-display text-xl font-semibold text-forest-900">
              {u.firstName?.[0]}{u.lastName?.[0]}
            </div>
            <div className="flex-1">
              <div className="text-lg font-medium">{c.headline ?? '—'}</div>
              <div className="text-sm text-stone-600 flex items-center gap-3 flex-wrap mt-1">
                <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" /> {u.email}</span>
                {c.location && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {c.location}</span>}
                <span>{c.yearsOfExperience} yrs exp.</span>
              </div>
              {['IDENTITY_VERIFIED', 'CREDENTIALS_VERIFIED', 'FULLY_VERIFIED'].includes(c.verificationLevel) && (
                <span className="verified-badge mt-2"><ShieldCheck className="w-3 h-3" /> Verified</span>
              )}
            </div>
          </div>

          {/* Cover letter */}
          {app.coverLetter && (
            <section>
              <h3 className="font-display text-lg mb-2">Cover letter</h3>
              <div className="text-sm text-stone-700 whitespace-pre-line leading-relaxed bg-stone-50 rounded-md p-4">
                {app.coverLetter}
              </div>
            </section>
          )}

          {/* Summary */}
          {c.summary && (
            <section>
              <h3 className="font-display text-lg mb-2">Summary</h3>
              <p className="text-sm text-stone-700 leading-relaxed">{c.summary}</p>
            </section>
          )}

          {/* Skills */}
          <section>
            <h3 className="font-display text-lg mb-2">Skills</h3>
            <div className="flex flex-wrap gap-1.5">
              {(c.skills ?? []).map((s: any) => (
                <span key={s.id} className="chip">{s.skill.name}</span>
              ))}
            </div>
          </section>

          {/* Experience */}
          {c.experiences?.length > 0 && (
            <section>
              <h3 className="font-display text-lg mb-2">Experience</h3>
              <div className="space-y-3">
                {c.experiences.map((e: any) => (
                  <div key={e.id} className="text-sm">
                    <div className="font-medium">{e.title} · {e.company}</div>
                    <div className="text-xs text-stone-500">
                      {new Date(e.startDate).getFullYear()} – {e.isCurrent ? 'Present' : (e.endDate ? new Date(e.endDate).getFullYear() : '—')}
                    </div>
                    {e.description && <p className="mt-1 text-stone-600">{e.description}</p>}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Resume */}
          {c.resumeUrl && (
            <section>
              <a href={c.resumeUrl} target="_blank" rel="noopener" className="btn-secondary text-sm">
                Download resume
              </a>
            </section>
          )}

          {/* Status change */}
          <section className="border-t border-stone-200 pt-6">
            <h3 className="font-display text-lg mb-3">Move to next stage</h3>
            <div className="space-y-3">
              <select
                value={nextStatus}
                onChange={(e) => setNextStatus(e.target.value)}
                className="input"
              >
                <option value="">Choose status...</option>
                {PIPELINE.filter((s) => s.key !== app.status).map((s) => (
                  <option key={s.key} value={s.key}>{s.label}</option>
                ))}
              </select>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Internal note (optional)"
                rows={2}
                className="input"
              />
              <button
                onClick={() => {
                  if (!nextStatus) return;
                  onStatusChange(nextStatus, note || undefined);
                  onClose();
                }}
                disabled={!nextStatus}
                className="btn-primary disabled:opacity-50"
              >
                Update status
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
