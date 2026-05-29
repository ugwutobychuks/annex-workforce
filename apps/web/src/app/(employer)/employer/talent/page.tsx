'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-store';
import { formatNaira } from '@/lib/utils';
import { Search, ShieldCheck, MapPin, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { Pagination } from '@/components/pagination';

const PAGE_SIZE = 20;

export default function TalentSearchPage() {
  const { accessToken } = useAuth();
  const [filters, setFilters] = useState({ q: '', country: '', minExperience: '', verifiedOnly: false });
  const [page, setPage] = useState(1);

  const params = new URLSearchParams();
  if (filters.q) params.set('q', filters.q);
  if (filters.country) params.set('country', filters.country);
  if (filters.minExperience) params.set('minExperience', filters.minExperience);
  if (filters.verifiedOnly) params.set('verifiedOnly', 'true');
  params.set('limit', String(PAGE_SIZE));
  params.set('page', String(page));

  const { data, isLoading } = useQuery({
    queryKey: ['talent-search', filters, page],
    queryFn: () => api<{ hits: any[]; total: number }>(`/candidates/search?${params}`, { token: accessToken }),
  });

  return (
    <div className="space-y-8">
      <header>
        <div className="text-xs uppercase tracking-[0.18em] text-slate-500 mb-2">Talent search</div>
        <h1 className="font-display text-4xl">Find the right person.</h1>
        <p className="text-slate-600 mt-2">Search verified candidates by skill, location, and availability.</p>
      </header>

      <div className="card grid md:grid-cols-4 gap-3">
        <div className="md:col-span-2 relative">
          <Search className="w-4 h-4 absolute left-3 top-3.5 text-slate-400" />
          <input
            value={filters.q}
            onChange={(e) => { setFilters({ ...filters, q: e.target.value }); setPage(1); }}
            placeholder="Skill, headline, or name"
            className="input pl-9"
          />
        </div>
        <select value={filters.country} onChange={(e) => { setFilters({ ...filters, country: e.target.value }); setPage(1); }} className="input">
          <option value="">All countries</option>
          <option value="NG">Nigeria</option>
          <option value="KE">Kenya</option>
          <option value="GH">Ghana</option>
          <option value="ZA">South Africa</option>
        </select>
        <input
          type="number"
          value={filters.minExperience}
          onChange={(e) => { setFilters({ ...filters, minExperience: e.target.value }); setPage(1); }}
          placeholder="Min years exp"
          className="input"
        />
        <label className="flex items-center gap-2 text-sm md:col-span-4">
          <input
            type="checkbox"
            checked={filters.verifiedOnly}
            onChange={(e) => { setFilters({ ...filters, verifiedOnly: e.target.checked }); setPage(1); }}
          />
          Only show verified candidates
        </label>
      </div>

      {isLoading ? (
        <div className="text-slate-500">Searching…</div>
      ) : data?.hits?.length === 0 ? (
        <div className="card text-center py-16 text-slate-500">No candidates match those filters.</div>
      ) : (
        <>
          <div className="text-sm text-slate-500">{data?.total} candidates</div>
          <div className="grid gap-3">
            {data?.hits?.map((c: any) => (
              <div key={c.id} className="card">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="w-12 h-12 rounded-full bg-brand-50 border border-brand-100 flex items-center justify-center font-display font-semibold text-brand-900 shrink-0">
                      {(c.firstName?.[0] ?? '') + (c.lastName?.[0] ?? '')}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{c.firstName} {c.lastName}</span>
                        {['IDENTITY_VERIFIED', 'CREDENTIALS_VERIFIED', 'FULLY_VERIFIED'].includes(c.verificationLevel) && (
                          <span className="verified-badge"><ShieldCheck className="w-3 h-3" /> Verified</span>
                        )}
                      </div>
                      <div className="text-sm text-slate-600">{c.headline ?? '—'}</div>
                      <div className="text-xs text-slate-500 mt-1 flex items-center gap-3 flex-wrap">
                        {c.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {c.location}</span>}
                        <span>{c.yearsOfExperience} yrs exp</span>
                        <span className="capitalize">{c.availability?.replace('_', ' ').toLowerCase()}</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {(c.skills ?? []).slice(0, 6).map((s: string) => (
                          <span key={s} className="chip">{s}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-mono text-sm">{formatNaira(c.expectedSalary)}/mo</div>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(c.userId ?? c.id);
                        toast.success('User ID copied');
                      }}
                      className="mt-2 inline-flex items-center gap-1 text-xs text-slate-500 hover:text-brand-700"
                      title="Copy user ID for EOR contract"
                    >
                      <Copy className="w-3 h-3" /> Copy user ID
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <Pagination page={page} limit={PAGE_SIZE} total={data?.total ?? 0} onChange={setPage} />
        </>
      )}
    </div>
  );
}
