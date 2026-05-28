'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { authApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-store';

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuth((s) => s.setAuth);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    try {
      const data = await authApi.login(
        String(fd.get('email')),
        String(fd.get('password')),
      );
      setAuth(data);
      toast.success(`Welcome back, ${data.user.firstName}`);
      const role = data.user.role;
      router.push(
        role === 'CANDIDATE' ? '/dashboard' :
        role === 'EMPLOYER' || role === 'HR_MANAGER' ? '/employer/dashboard' :
        '/admin',
      );
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <h1 className="font-display text-4xl mb-2">Welcome back.</h1>
      <p className="text-stone-600 mb-8">Sign in to continue your work.</p>

      <form onSubmit={onSubmit} className="space-y-5">
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input id="email" name="email" type="email" required autoComplete="email" className="input" placeholder="you@company.com" />
        </div>
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="label !mb-0" htmlFor="password">Password</label>
            <Link href="/forgot-password" className="text-xs text-forest-700 hover:underline">Forgot?</Link>
          </div>
          <input id="password" name="password" type="password" required autoComplete="current-password" className="input" placeholder="••••••••" />
        </div>

        {error && (
          <div className="text-sm text-red-700 bg-red-50 border border-red-200 px-3 py-2 rounded-md">{error}</div>
        )}

        <button type="submit" disabled={loading} className="btn-primary w-full disabled:opacity-60">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <p className="mt-8 text-sm text-stone-600">
        New to Annex? <Link href="/register" className="text-forest-700 font-medium hover:underline">Create an account</Link>
      </p>

      <div className="mt-10 pt-6 border-t border-stone-200 text-xs text-stone-500">
        <p className="mb-1">Try the demo:</p>
        <p className="font-mono">candidate@example.com · Pass@1234</p>
        <p className="font-mono">employer@techstartup.io · Pass@1234</p>
      </div>
    </>
  );
}
