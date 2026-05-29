'use client';
import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';

function VerifyEmailInner() {
  const params = useSearchParams();
  const token = params.get('token');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('No verification token provided');
      return;
    }
    api('/auth/verify-email', { method: 'POST', body: { token } })
      .then(() => setStatus('success'))
      .catch((e) => {
        setStatus('error');
        setMessage(e.message || 'Verification failed');
      });
  }, [token]);

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="card max-w-md w-full text-center">
        {status === 'loading' && (
          <>
            <Loader2 className="w-10 h-10 mx-auto mb-4 animate-spin text-brand-700" />
            <h1 className="font-display text-2xl mb-2">Verifying…</h1>
          </>
        )}
        {status === 'success' && (
          <>
            <CheckCircle2 className="w-12 h-12 mx-auto mb-4 text-emerald-600" />
            <h1 className="font-display text-2xl mb-2">Email verified</h1>
            <p className="text-slate-600 mb-6">Your account is now fully active.</p>
            <Link href="/login" className="btn-primary">Continue to sign in</Link>
          </>
        )}
        {status === 'error' && (
          <>
            <XCircle className="w-12 h-12 mx-auto mb-4 text-red-600" />
            <h1 className="font-display text-2xl mb-2">Verification failed</h1>
            <p className="text-slate-600 mb-6">{message}</p>
            <Link href="/login" className="btn-secondary">Back to sign in</Link>
          </>
        )}
      </div>
    </main>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div>Loading…</div>}>
      <VerifyEmailInner />
    </Suspense>
  );
}
