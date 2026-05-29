'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-store';
import { formatDate } from '@/lib/utils';
import { ShieldCheck, ShieldAlert, ShieldQuestion, Loader2, CheckCircle2, Clock, XCircle } from 'lucide-react';

const TYPES = [
  { key: 'IDENTITY', label: 'Identity', desc: 'NIN / BVN / Government ID verification via Smile Identity', provider: 'smile_identity' },
  { key: 'EDUCATION', label: 'Education', desc: 'Verify your degrees and certifications', provider: 'manual' },
  { key: 'EMPLOYMENT', label: 'Employment history', desc: 'Confirm your past employment via Youverify', provider: 'youverify' },
  { key: 'BACKGROUND', label: 'Background check', desc: 'Criminal record and reference check', provider: 'youverify' },
];

const LEVEL_LABEL: Record<string, string> = {
  UNVERIFIED: 'Unverified',
  EMAIL_VERIFIED: 'Email verified',
  IDENTITY_VERIFIED: 'Identity verified',
  CREDENTIALS_VERIFIED: 'Credentials verified',
  FULLY_VERIFIED: 'Fully verified',
};

export default function VerificationPage() {
  const { accessToken } = useAuth();
  const qc = useQueryClient();
  const [initiatingType, setInitiatingType] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<Record<string, string>>({});

  const { data: profile } = useQuery({
    queryKey: ['my-profile'],
    queryFn: () => api<any>('/candidates/me', { token: accessToken }),
    enabled: !!accessToken,
  });

  const { data: records } = useQuery({
    queryKey: ['my-verifications'],
    queryFn: () => api<any[]>('/verification/mine', { token: accessToken }),
    enabled: !!accessToken,
  });

  const initiate = useMutation({
    mutationFn: ({ type, provider, meta }: { type: string; provider: string; meta: any }) =>
      api('/verification/initiate', {
        method: 'POST',
        body: { type, provider, metadata: meta },
        token: accessToken,
      }),
    onSuccess: () => {
      toast.success('Verification started');
      qc.invalidateQueries({ queryKey: ['my-verifications'] });
      qc.invalidateQueries({ queryKey: ['my-profile'] });
      setInitiatingType(null);
      setMetadata({});
    },
    onError: (e: any) => toast.error(e.message),
  });

  const level = profile?.verificationLevel ?? 'UNVERIFIED';
  const stepIndex = Math.max(0, Object.keys(LEVEL_LABEL).indexOf(level));

  return (
    <div className="space-y-8">
      <header>
        <div className="text-xs uppercase tracking-[0.18em] text-slate-500 mb-2">Verification</div>
        <h1 className="font-display text-4xl">Build trust with employers.</h1>
        <p className="text-slate-600 mt-2">
          Verified candidates appear in 4× more searches. Each step you complete raises your verification level.
        </p>
      </header>

      {/* Progress */}
      <div className="card">
        <div className="flex items-center gap-3 mb-4">
          {level === 'FULLY_VERIFIED' ? (
            <ShieldCheck className="w-6 h-6 text-emerald-600" />
          ) : level === 'UNVERIFIED' ? (
            <ShieldAlert className="w-6 h-6 text-accent-500" />
          ) : (
            <ShieldQuestion className="w-6 h-6 text-brand-700" />
          )}
          <div>
            <div className="text-xs uppercase tracking-wider text-slate-500">Current level</div>
            <div className="font-display text-xl">{LEVEL_LABEL[level]}</div>
          </div>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-1.5">
          {Object.keys(LEVEL_LABEL).map((key, i) => (
            <div
              key={key}
              className={`flex-1 h-1.5 rounded-full ${i <= stepIndex ? 'bg-brand-700' : 'bg-slate-200'}`}
              title={LEVEL_LABEL[key]}
            />
          ))}
        </div>
      </div>

      {/* Verification types */}
      <section>
        <h2 className="font-display text-2xl mb-4">Verification checks</h2>
        <div className="grid gap-3">
          {TYPES.map((t) => {
            const recordsOfType = records?.filter((r) => r.type === t.key) ?? [];
            const verified = recordsOfType.some((r) => r.status === 'VERIFIED');
            const pending = recordsOfType.some((r) => r.status === 'PENDING');
            const failed = recordsOfType.some((r) => r.status === 'FAILED');

            return (
              <div key={t.key} className="card">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{t.label}</h3>
                      {verified && (
                        <span className="verified-badge"><CheckCircle2 className="w-3 h-3" /> Verified</span>
                      )}
                      {pending && !verified && (
                        <span className="chip bg-amber-100 text-amber-700"><Clock className="w-3 h-3 inline mr-1" />In review</span>
                      )}
                      {failed && !verified && !pending && (
                        <span className="chip bg-red-50 text-red-700"><XCircle className="w-3 h-3 inline mr-1" />Failed</span>
                      )}
                    </div>
                    <p className="text-sm text-slate-600 mt-1">{t.desc}</p>
                  </div>
                  {!verified && !pending && (
                    <button
                      onClick={() => setInitiatingType(t.key)}
                      className="btn-primary text-sm shrink-0"
                    >
                      Start
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* History */}
      {records && records.length > 0 && (
        <section>
          <h2 className="font-display text-2xl mb-4">History</h2>
          <div className="grid gap-2">
            {records.map((r) => (
              <div key={r.id} className="card flex items-center justify-between text-sm">
                <div>
                  <div className="font-medium">{r.type}</div>
                  <div className="text-xs text-slate-500">via {r.provider} · {formatDate(r.initiatedAt)}</div>
                </div>
                <span className={`chip ${
                  r.status === 'VERIFIED' ? 'bg-emerald-50 text-emerald-800' :
                  r.status === 'PENDING' ? 'bg-amber-100 text-amber-700' :
                  'bg-red-50 text-red-700'
                }`}>
                  {r.status.toLowerCase()}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Initiation modal */}
      {initiatingType && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg w-full max-w-md p-6">
            <h2 className="font-display text-xl mb-1">
              Verify {TYPES.find((t) => t.key === initiatingType)?.label}
            </h2>
            <p className="text-sm text-slate-600 mb-5">
              {TYPES.find((t) => t.key === initiatingType)?.desc}
            </p>

            {initiatingType === 'IDENTITY' && (
              <div className="space-y-3 mb-5">
                <div>
                  <label className="label">NIN (National ID Number)</label>
                  <input
                    className="input"
                    placeholder="11 digits"
                    onChange={(e) => setMetadata({ ...metadata, nin: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">BVN (optional)</label>
                  <input
                    className="input"
                    placeholder="11 digits"
                    onChange={(e) => setMetadata({ ...metadata, bvn: e.target.value })}
                  />
                </div>
              </div>
            )}

            {initiatingType === 'EDUCATION' && (
              <div className="space-y-3 mb-5">
                <div>
                  <label className="label">Institution</label>
                  <input
                    className="input"
                    onChange={(e) => setMetadata({ ...metadata, institution: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">Certificate URL (e.g. from Google Drive)</label>
                  <input
                    className="input"
                    type="url"
                    onChange={(e) => setMetadata({ ...metadata, documentUrl: e.target.value })}
                  />
                </div>
              </div>
            )}

            {(initiatingType === 'EMPLOYMENT' || initiatingType === 'BACKGROUND') && (
              <p className="text-sm text-slate-600 mb-5 bg-slate-50 rounded-md p-3">
                We'll initiate the check using the contact details on your profile. This typically takes 3-5 business days.
              </p>
            )}

            <div className="flex justify-end gap-2">
              <button onClick={() => setInitiatingType(null)} className="btn-secondary">Cancel</button>
              <button
                onClick={() => {
                  const t = TYPES.find((x) => x.key === initiatingType)!;
                  initiate.mutate({ type: t.key, provider: t.provider, meta: metadata });
                }}
                disabled={initiate.isPending}
                className="btn-primary"
              >
                {initiate.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                Start verification
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
