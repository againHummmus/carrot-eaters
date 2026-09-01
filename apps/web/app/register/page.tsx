'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    if (data.session) {
      router.push('/onboarding');
      router.refresh();
      return;
    }

    setMessage('Проверьте почту и подтвердите email, затем войдите.');
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-6">
      <h1 className="text-2xl font-semibold">Регистрация</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input
          type="email"
          required
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-slate-500"
        />
        <input
          type="password"
          required
          minLength={6}
          placeholder="Пароль (минимум 6 символов)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-slate-500"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        {message && <p className="text-sm text-emerald-600">{message}</p>}
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-slate-900 px-3 py-2 font-medium text-white disabled:opacity-50"
        >
          {loading ? 'Создаём…' : 'Создать аккаунт'}
        </button>
      </form>
      <p className="text-sm text-slate-500">
        Уже есть аккаунт?{' '}
        <Link href="/login" className="underline">
          Войти
        </Link>
      </p>
    </main>
  );
}
