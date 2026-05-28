'use client';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-store';
import { Users, ShieldCheck, ArrowRight } from 'lucide-react';

export default function AdminOverviewPage() {
  const { accessToken, user } = useAuth();

  const { data: queue } = useQuery({
    queryKey: ['verification-queue'],
    queryFn: () => api<{ items: any[]; total: number }>('/verification/admin/queue?status=PENDING&limit=5', { token: accessToken }),
    enabled: !!accessToken,
  });

  const { data: users } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => api<{ items: any[]; total: number }>('/users?limit=5', { token: accessToken }),
    enabled: !!accessToken,
  });

  return (
    <div className="space-y-10">
      <header>
        <div className="text-xs uppercase tracking-[0.18em] text-stone-500 mb-2">Admin</div>
        <h1 className="font-display text-4xl">Operations overview.</h1>
        <p className="text-stone-600 mt-2">Welcome back, {user?.firstName}.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/admin/verification" className="card hover:border-forest-300 transition-colors">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs uppercase tracking-wider text-stone-500">Verification queue</span>
            <ShieldCheck className="w-4 h-4 text-stone-400" />
          </div>
          <div className="font-display text-3xl">{queue?.total ?? 0}</div>
          <div className="text-xs text-stone-500 mt-1">pending review</div>
        </Link>
        <Link href="/admin/users" className="card hover:border-forest-300 transition-colors">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs uppercase tracking-wider text-stone-500">Total users</span>
            <Users className="w-4 h-4 text-stone-400" />
          </div>
          <div className="font-display text-3xl">{users?.total ?? 0}</div>
          <div className="text-xs text-stone-500 mt-1">active accounts</div>
        </Link>
        <div className="card">
          <div className="text-xs uppercase tracking-wider text-stone-500 mb-3">Platform health</div>
          <div className="font-display text-3xl text-emerald-700">●</div>
          <div className="text-xs text-stone-500 mt-1">All systems operational</div>
        </div>
      </div>

      {queue?.items?.length ? (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-2xl">Pending verifications</h2>
            <Link href="/admin/verification" className="text-sm text-forest-700 hover:underline flex items-center gap-1">
              All <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="grid gap-3">
            {queue.items.map((v: any) => (
              <div key={v.id} className="card flex items-center justify-between">
                <div>
                  <div className="font-medium">
                    {v.candidate?.user?.firstName} {v.candidate?.user?.lastName}
                  </div>
                  <div className="text-sm text-stone-600">
                    {v.type} verification · provider: {v.provider}
                  </div>
                </div>
                <span className="chip">{v.status}</span>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
