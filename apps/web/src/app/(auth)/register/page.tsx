'use client';
import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { authApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-store';

function RegisterForm() {
  const router = useRouter();
  const params = useSearchParams();
  const setAuth = useAuth((s) => s.setAuth);
  const [role, setRole] = useState<'CANDIDATE' | 'EMPLOYER'>(
    (params.get('role') as 'CANDIDATE' | 'EMPLOYER') || 'CANDIDATE',
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    try {
      const data = await authApi.register({
        email: String(fd.get('email')),
        password: String(fd.get('password')),
        firstName: String(fd.get('firstName')),
        lastName: String(fd.get('lastName')),
        phone: String(fd.get('phone') || '') || undefined,
        role,
      });
      setAuth(data);
      toast.success('Account created. Check your email to verify.');
      router.push(role === 'CANDIDATE' ? '/dashboard' : '/employer/dashboard');
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <h1 className="font-display text-4xl mb-2">Create your account.</h1>
      <p className="text-slate-600 mb-8">Choose your path to get started.</p>

      {/* Role toggle */}
      <div className="grid grid-cols-2 gap-2 mb-6 p-1 bg-slate-100 rounded-lg">
        {(['CANDIDATE', 'EMPLOYER'] as const).map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setRole(r)}
            className={
              role === r
                ? 'rounded-md py-2 px-3 text-sm font-medium bg-white text-brand-900 shadow-sm'
                : 'rounded-md py-2 px-3 text-sm font-medium text-slate-600 hover:text-brand-800'
            }
          >
            {r === 'CANDIDATE' ? "I'm looking for work" : 'I want to hire'}
          </button>
        ))}
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="firstName">First name</label>
            <input id="firstName" name="firstName" required className="input" />
          </div>
          <div>
            <label className="label" htmlFor="lastName">Last name</label>
            <input id="lastName" name="lastName" required className="input" />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input id="email" name="email" type="email" required className="input" />
        </div>
        <div>
          <label className="label" htmlFor="phone">Phone (optional)</label>
          <input id="phone" name="phone" type="tel" className="input" placeholder="+234 800 000 0000" />
        </div>
        <div>
          <label className="label" htmlFor="password">Password</label>
          <input id="password" name="password" type="password" required minLength={8} className="input" />
          <p className="text-xs text-slate-500 mt-1">8+ characters with upper, lower, and a digit.</p>
        </div>

        {error && (
          <div className="text-sm text-red-700 bg-red-50 border border-red-200 px-3 py-2 rounded-md">{error}</div>
        )}

        <button type="submit" disabled={loading} className="btn-primary w-full disabled:opacity-60">
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          {loading ? 'Creating account…' : 'Create account'}
        </button>
      </form>

      <p className="mt-8 text-sm text-slate-600">
        Already have an account? <Link href="/login" className="text-brand-700 font-medium hover:underline">Sign in</Link>
      </p>
    </>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div>Loading…</div>}>
      <RegisterForm />
    </Suspense>
  );
}
