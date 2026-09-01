import { redirect } from 'next/navigation';
import Link from 'next/link';
import { requireUser, fetchProfile } from '@/lib/auth';
import { macroTargets } from '@kbju/shared';
import { updateSettings, signOut } from './actions';

const TIMEZONES = ['Europe/Belgrade', 'Europe/Moscow', 'Europe/Berlin', 'Europe/London', 'UTC'];

export default async function SettingsPage() {
  const { supabase, userId } = await requireUser();
  const profile = await fetchProfile(supabase, userId);
  if (!profile) redirect('/onboarding');

  const targets = macroTargets(profile.kcal_target);

  return (
    <main className="mx-auto flex max-w-sm flex-col gap-6 px-4 pb-24 pt-6">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Настройки</h1>
        <Link href="/dashboard" className="text-sm text-slate-500 underline">
          Сегодня
        </Link>
      </header>

      <form action={updateSettings} className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <label className="flex flex-col gap-1 text-sm">
          Дневная цель по калориям
          <input
            name="kcal_target"
            type="number"
            min={800}
            step={10}
            required
            defaultValue={profile.kcal_target}
            className="rounded-lg border border-slate-300 px-3 py-2"
          />
        </label>
        <p className="text-xs text-slate-400">
          Б/Ж/У пересчитаются автоматически: Б{targets.protein}/Ж{targets.fat}/У{targets.carbs} г
        </p>
        <label className="flex flex-col gap-1 text-sm">
          Таймзона
          <select name="timezone" defaultValue={profile.timezone} className="rounded-lg border border-slate-300 px-3 py-2">
            {TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="mt-2 rounded-lg bg-slate-900 px-3 py-2 font-medium text-white">
          Сохранить
        </button>
      </form>

      <form action={signOut}>
        <button type="submit" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-600">
          Выйти
        </button>
      </form>
    </main>
  );
}
