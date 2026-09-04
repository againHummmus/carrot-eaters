import { redirect } from 'next/navigation';
import { requireUser, fetchProfile } from '@/lib/auth';
import { macroTargets } from '@carrot-eaters/shared';
import { AppHeader } from '@/components/AppHeader';
import { LocaleSwitcher } from '@/components/LocaleSwitcher';
import { getTranslations } from 'next-intl/server';
import { updateSettings, signOut } from './actions';

const TIMEZONES = ['Europe/Belgrade', 'Europe/Moscow', 'Europe/Berlin', 'Europe/London', 'UTC'];

export default async function SettingsPage() {
  const t = await getTranslations('settings');
  const { supabase, userId } = await requireUser();
  const profile = await fetchProfile(supabase, userId);
  if (!profile) redirect('/onboarding');

  const targets = macroTargets(profile.kcal_target);

  return (
    <div className="min-h-screen">
      <AppHeader />

      <main className="mx-auto flex max-w-sm flex-col gap-5 px-4 pb-24 pt-4">
      <h1 className="animate-fade-in-up text-2xl font-semibold tracking-tight text-slate-900">{t('title')}</h1>

      <form
        action={updateSettings}
        className="animate-fade-in-up flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/3"
        style={{ animationDelay: '40ms' }}
      >
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-slate-700">{t('kcalTarget')}</span>
          <input
            name="kcal_target"
            type="number"
            min={800}
            step={10}
            required
            defaultValue={profile.kcal_target}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none transition-colors focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
          />
        </label>
        <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
          {t('macroNote', { protein: targets.protein, fat: targets.fat, carbs: targets.carbs })}
        </p>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-slate-700">{t('timezone')}</span>
          <select
            name="timezone"
            defaultValue={profile.timezone}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none transition-colors focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
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
          className="mt-1 rounded-lg bg-slate-900 px-3 py-2.5 font-medium text-white transition-all hover:bg-slate-800 active:scale-[0.98]"
        >
          {t('save')}
        </button>
      </form>

      <section
        className="animate-fade-in-up rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/3"
        style={{ animationDelay: '80ms' }}
      >
        <LocaleSwitcher />
      </section>

      <form action={signOut} className="animate-fade-in-up" style={{ animationDelay: '120ms' }}>
        <button
          type="submit"
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-600 transition-all hover:border-red-200 hover:bg-red-50 hover:text-red-600 active:scale-[0.98]"
        >
          {t('signOut')}
        </button>
      </form>
      </main>
    </div>
  );
}
