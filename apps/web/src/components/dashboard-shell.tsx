'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from '@/lib/auth-store';
import { authApi } from '@/lib/api';
import { LogOut, User2, Briefcase, Search, FileText, BarChart3, Users, ShieldCheck, Calendar, Building2, Receipt } from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV_BY_ROLE: Record<string, { href: string; label: string; icon: any }[]> = {
  CANDIDATE: [
    { href: '/dashboard', label: 'Overview', icon: BarChart3 },
    { href: '/profile', label: 'Profile', icon: User2 },
    { href: '/jobs', label: 'Find jobs', icon: Search },
    { href: '/applications', label: 'My applications', icon: FileText },
    { href: '/verification', label: 'Verification', icon: ShieldCheck },
    { href: '/payslips', label: 'Payslips', icon: Receipt },
    { href: '/leave', label: 'Time off', icon: Calendar },
  ],
  EMPLOYER: [
    { href: '/employer/dashboard', label: 'Overview', icon: BarChart3 },
    { href: '/employer/jobs', label: 'Jobs', icon: Briefcase },
    { href: '/employer/talent', label: 'Search talent', icon: Users },
    { href: '/employer/eor', label: 'EOR contracts', icon: Building2 },
    { href: '/employer/payroll', label: 'Payroll', icon: Calendar },
    { href: '/employer/leave', label: 'Time off', icon: Receipt },
  ],
  HR_MANAGER: [
    { href: '/employer/dashboard', label: 'Overview', icon: BarChart3 },
    { href: '/employer/jobs', label: 'Jobs', icon: Briefcase },
    { href: '/employer/talent', label: 'Search talent', icon: Users },
    { href: '/employer/leave', label: 'Time off', icon: Receipt },
  ],
  ADMIN: [
    { href: '/admin', label: 'Overview', icon: BarChart3 },
    { href: '/admin/verification', label: 'Verification queue', icon: ShieldCheck },
    { href: '/admin/users', label: 'Users', icon: Users },
  ],
  SUPER_ADMIN: [
    { href: '/admin', label: 'Overview', icon: BarChart3 },
    { href: '/admin/verification', label: 'Verification queue', icon: ShieldCheck },
    { href: '/admin/users', label: 'Users', icon: Users },
  ],
};

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, accessToken, clear } = useAuth();

  useEffect(() => {
    if (!accessToken || !user) router.replace('/login');
  }, [accessToken, user, router]);

  if (!user) return null;

  const nav = NAV_BY_ROLE[user.role] ?? [];

  async function handleLogout() {
    if (accessToken) {
      try { await authApi.logout(accessToken); } catch { /* ignore */ }
    }
    clear();
    router.push('/login');
  }

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Sidebar */}
      <aside className="w-64 border-r border-slate-200 bg-white flex flex-col">
        <div className="px-6 py-5 border-b border-slate-200">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center text-white font-display font-bold text-sm">A</div>
            <span className="font-display text-lg font-bold">Annex</span>
          </Link>
        </div>
        <nav className="flex-1 p-3 space-y-0.5">
          {nav.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors font-medium',
                  active
                    ? 'bg-brand-600 text-white shadow-soft'
                    : 'text-slate-700 hover:bg-slate-100',
                )}
              >
                <Icon className={cn('w-4 h-4', active ? 'text-brand-100' : 'text-slate-500')} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-slate-200">
          <div className="px-3 py-2 mb-2">
            <div className="text-sm font-medium truncate">{user.firstName} {user.lastName}</div>
            <div className="text-xs text-slate-500 truncate">{user.email}</div>
            <div className="mt-1.5">
              <span className="chip text-[10px]">{user.role.replace('_', ' ')}</span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-100"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">
        <div className="max-w-6xl mx-auto px-8 py-10">{children}</div>
      </main>
    </div>
  );
}
