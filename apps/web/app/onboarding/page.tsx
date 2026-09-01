import { redirect } from 'next/navigation';
import { requireUser, fetchProfile } from '@/lib/auth';
import { createProfile } from './actions';

const TIMEZONES = ['Europe/Belgrade', 'Europe/Moscow', 'Europe/Berlin', 'Europe/London', 'UTC'];

export default async function OnboardingPage() {
  const { supabase, userId } = await requireUser();
  const profile = await fetchProfile(supabase, userId);
  if (profile) redirect('/dashboard');

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-6">
      <div>
        <h1 className="text-2xl font-semibold">Добро пожаловать</h1>
        <p className="mt-1 text-sm text-slate-500">
          Всего один параметр — цель по калориям. Белки/жиры/углеводы посчитаются автоматически (30/30/40).
        </p>
      </div>
      <form action={createProfile} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm">
          Имя
          <input name="name" required placeholder="Яна" className="rounded-lg border border-slate-300 px-3 py-2" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Дневная цель по калориям
          <input
            name="kcal_target"
            type="number"
            min={800}
            step={10}
            required
            placeholder="1900"
            className="rounded-lg border border-slate-300 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Таймзона
          <select name="timezone" defaultValue="Europe/Belgrade" className="rounded-lg border border-slate-300 px-3 py-2">
            {TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="mt-2 rounded-lg bg-slate-900 px-3 py-2 font-medium text-white">
          Продолжить
        </button>
      </form>
    </main>
  );
}
