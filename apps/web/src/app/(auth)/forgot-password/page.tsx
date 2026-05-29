'use client';
import { useState } from 'react';
import Link from 'next/link';
import { authApi } from '@/lib/api';

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    try {
      await authApi.forgotPassword(String(fd.get('email')));
      setSent(true);
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <>
        <h1 className="font-display text-4xl mb-2">Check your inbox.</h1>
        <p className="text-slate-600">
          If an account exists for that email, we've sent a reset link. The link will
          expire in 1 hour.
        </p>
        <Link href="/login" className="btn-secondary mt-8 w-fit">Back to sign in</Link>
      </>
    );
  }

  return (
    <>
      <h1 className="font-display text-4xl mb-2">Reset your password.</h1>
      <p className="text-slate-600 mb-8">Enter your email and we'll send a reset link.</p>
      <form onSubmit={onSubmit} className="space-y-5">
        <div>
          <label className="label">Email</label>
          <input name="email" type="email" required className="input" />
        </div>
        <button disabled={loading} className="btn-primary w-full">
          {loading ? 'Sending…' : 'Send reset link'}
        </button>
      </form>
      <Link href="/login" className="mt-6 inline-block text-sm text-brand-700 hover:underline">
        ← Back to sign in
      </Link>
    </>
  );
}
