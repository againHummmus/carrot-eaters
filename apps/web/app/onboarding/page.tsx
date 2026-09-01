import { redirect } from 'next/navigation';
import { requireUser, fetchProfile } from '@/lib/auth';
import { createProfile } from './actions';

const TIMEZONES = ['Europe/Belgrade', 'Europe/Moscow', 'Europe/Berlin', 'Europe/London', 'UTC'];

export default async function OnboardingPage() {
  const { supabase, userId } = await requireUser();
  const profile = await fetchProfile(supabase, userId);
  if (profile) redirect('/dashboard');

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6 py-12">
      <div className="animate-fade-in-up flex flex-col gap-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-lg shadow-slate-900/5 sm:p-8">
        <div className="flex flex-col items-center gap-2 text-center">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 text-2xl shadow-sm shadow-emerald-500/30">
            🥕
          </span>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">Добро пожаловать</h1>
          <p className="text-sm text-slate-500">
            Всего один параметр — цель по калориям. Белки/жиры/углеводы посчитаются автоматически (30/30/40).
          </p>
        </div>

        <form action={createProfile} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-slate-700">Имя</span>
            <input
              name="name"
              required
              placeholder="Яна"
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 outline-none transition-colors focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-slate-700">Дневная цель по калориям</span>
            <input
              name="kcal_target"
              type="number"
              min={800}
              step={10}
              required
              placeholder="1900"
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 outline-none transition-colors focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-slate-700">Таймзона</span>
            <select
              name="timezone"
              defaultValue="Europe/Belgrade"
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 outline-none transition-colors focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
            >
              {TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            className="mt-2 rounded-lg bg-slate-900 px-3 py-2.5 font-medium text-white transition-all hover:bg-slate-800 active:scale-[0.98]"
          >
            Продолжить
          </button>
        </form>
      </div>
    </main>
  );
}
