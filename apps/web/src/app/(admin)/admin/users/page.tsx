'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-store';
import { formatDate } from '@/lib/utils';
import { Pagination } from '@/components/pagination';

const PAGE_SIZE = 25;

export default function AdminUsersPage() {
  const { accessToken } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [page, setPage] = useState(1);

  const params = new URLSearchParams({ limit: String(PAGE_SIZE), page: String(page) });
  if (search) params.set('q', search);
  if (role) params.set('role', role);

  const { data } = useQuery({
    queryKey: ['admin-users', search, role, page],
    queryFn: () => api<{ items: any[]; total: number }>(`/users?${params}`, { token: accessToken }),
    enabled: !!accessToken,
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api(`/users/${id}/status`, { method: 'PATCH', body: { status }, token: accessToken }),
    onSuccess: () => {
      toast.success('Status updated');
      qc.invalidateQueries({ queryKey: ['admin-users'] });
    },
  });

  return (
    <div className="space-y-6">
      <header>
        <div className="text-xs uppercase tracking-[0.18em] text-slate-500 mb-2">Users</div>
        <h1 className="font-display text-4xl">User management.</h1>
      </header>

      <div className="flex gap-3">
        <input
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search by name or email"
          className="input flex-1"
        />
        <select value={role} onChange={(e) => { setRole(e.target.value); setPage(1); }} className="input w-48">
          <option value="">All roles</option>
          <option value="CANDIDATE">Candidate</option>
          <option value="EMPLOYER">Employer</option>
          <option value="HR_MANAGER">HR Manager</option>
          <option value="ADMIN">Admin</option>
        </select>
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Joined</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data?.items?.map((u: any) => (
              <tr key={u.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium">{u.firstName} {u.lastName}</td>
                <td className="px-4 py-3 text-slate-600">{u.email}</td>
                <td className="px-4 py-3"><span className="chip">{u.role}</span></td>
                <td className="px-4 py-3">
                  <span className={`chip capitalize ${
                    u.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-800' :
                    u.status === 'SUSPENDED' ? 'bg-red-50 text-red-700' :
                    'bg-slate-100 text-slate-600'
                  }`}>
                    {u.status.toLowerCase().replace('_', ' ')}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-slate-500">{formatDate(u.createdAt)}</td>
                <td className="px-4 py-3">
                  <select
                    value={u.status}
                    onChange={(e) => updateStatus.mutate({ id: u.id, status: e.target.value })}
                    className="input text-xs py-1"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="SUSPENDED">Suspended</option>
                    <option value="DEACTIVATED">Deactivated</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="px-4 pb-4">
          <Pagination page={page} limit={PAGE_SIZE} total={data?.total ?? 0} onChange={setPage} />
        </div>
      </div>
    </div>
  );
}
