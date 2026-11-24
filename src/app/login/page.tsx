'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

// Skip static prerendering — it would run createClient() at build time with no real
// Supabase env vars available yet (those only exist once deployed with real credentials).
export const dynamic = 'force-dynamic';

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push('/');
    router.refresh();
  }

  return (
    <div className="flex flex-1 items-center justify-center bg-page px-4">
      <form onSubmit={handleSubmit} className="card w-full max-w-sm p-8">
        <div className="mb-6 flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-[9px] bg-ink text-sm font-semibold text-white">
            V
          </span>
          <div className="leading-tight">
            <div className="text-sm font-semibold text-ink">Vocom CRM</div>
            <div className="text-xs text-ink-2">Sales workspace</div>
          </div>
        </div>
        <h1 className="mb-1 text-xl font-semibold tracking-[-0.01em] text-ink">Sign in</h1>
        <p className="mb-6 text-sm text-ink-2">Use the email and password your admin set up.</p>

        <label htmlFor="login-email" className="mb-1 block text-[13px] font-medium text-ink-3">
          Email
        </label>
        <input
          id="login-email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="field mb-4 w-full"
        />

        <label htmlFor="login-password" className="mb-1 block text-[13px] font-medium text-ink-3">
          Password
        </label>
        <input
          id="login-password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="field mb-4 w-full"
        />

        {error && (
          <p role="alert" className="mb-4 text-sm text-warn">
            {error}
          </p>
        )}

        <button type="submit" disabled={loading} className="btn btn-primary w-full justify-center disabled:opacity-50">
          {loading ? 'Signing in...' : 'Sign in'}
        </button>

        <p className="mt-4 text-xs text-ink-2">
          Accounts are created by an admin in Supabase — there&apos;s no self-signup.
        </p>
      </form>
    </div>
  );
}
