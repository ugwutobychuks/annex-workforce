'use client';
import { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { api } from '@/lib/api';

function ResetPasswordInner() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get('token');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!token) return setError('Missing reset token');
    const fd = new FormData(e.currentTarget);
    if (fd.get('newPassword') !== fd.get('confirm')) {
      return setError('Passwords do not match');
    }
    setLoading(true);
    setError(null);
    try {
      await api('/auth/reset-password', {
        method: 'POST',
        body: { token, newPassword: String(fd.get('newPassword')) },
      });
      setDone(true);
      setTimeout(() => router.push('/login'), 2000);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-12">
      <div className="card max-w-md w-full">
        {done ? (
          <>
            <h1 className="font-display text-2xl mb-2">Password updated</h1>
            <p className="text-stone-600">Redirecting to sign in…</p>
          </>
        ) : (
          <>
            <h1 className="font-display text-2xl mb-2">Set a new password</h1>
            <p className="text-stone-600 mb-6">Pick a strong one this time.</p>
            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <label className="label">New password</label>
                <input name="newPassword" type="password" required minLength={8} className="input" />
              </div>
              <div>
                <label className="label">Confirm password</label>
                <input name="confirm" type="password" required minLength={8} className="input" />
              </div>
              {error && (
                <div className="text-sm text-red-700 bg-red-50 border border-red-200 px-3 py-2 rounded-md">{error}</div>
              )}
              <button disabled={loading} className="btn-primary w-full">
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                Update password
              </button>
            </form>
            <Link href="/login" className="mt-6 inline-block text-sm text-forest-700 hover:underline">
              ← Back to sign in
            </Link>
          </>
        )}
      </div>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div>Loading…</div>}>
      <ResetPasswordInner />
    </Suspense>
  );
}
