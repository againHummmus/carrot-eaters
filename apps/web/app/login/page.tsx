'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirect') ?? '/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.push(redirectTo);
    router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6 py-12">
      <div className="animate-fade-in-up flex flex-col gap-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-lg shadow-slate-900/5 sm:p-8">
        <div className="flex flex-col items-center gap-2 text-center">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 text-2xl shadow-sm shadow-emerald-500/30">
            🥕
          </span>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">С возвращением</h1>
          <p className="text-sm text-slate-500">Войди, чтобы увидеть свой прогресс</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="email"
            required
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2.5 outline-none transition-colors focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
          />
          <input
            type="password"
            required
            placeholder="Пароль"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2.5 outline-none transition-colors focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
          />
          {error && <p className="animate-fade-in rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="mt-1 flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-3 py-2.5 font-medium text-white transition-all hover:bg-slate-800 active:scale-[0.98] disabled:opacity-60 disabled:active:scale-100"
          >
            {loading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />}
            {loading ? 'Входим…' : 'Войти'}
          </button>
        </form>
        <p className="text-center text-sm text-slate-500">
          Нет аккаунта?{' '}
          <Link href="/register" className="font-medium text-emerald-600 hover:text-emerald-700">
            Зарегистрироваться
          </Link>
        </p>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
