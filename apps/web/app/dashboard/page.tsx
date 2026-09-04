import { redirect } from 'next/navigation';
import { requireUser, fetchProfile } from '@/lib/auth';
import { todayRangeUtc, type MealWithItems } from '@carrot-eaters/shared';
import { AppHeader } from '@/components/AppHeader';
import { DaySummary } from '@/components/DaySummary';
import { getTranslations } from 'next-intl/server';

export default async function DashboardPage() {
  const t = await getTranslations('dashboard');
  const { supabase, userId } = await requireUser();
  const profile = await fetchProfile(supabase, userId);
  if (!profile) redirect('/onboarding');

  const { start, end } = todayRangeUtc(profile.timezone);
  const { data, error } = await supabase
    .from('meals')
    .select('*, items:meal_items(*)')
    .eq('user_id', userId)
    .gte('eaten_at', start.toISOString())
    .lt('eaten_at', end.toISOString())
    .order('eaten_at', { ascending: false });
  if (error) throw new Error(error.message);

  const meals = (data ?? []) as MealWithItems[];

  return (
    <div className="min-h-screen">
      <AppHeader />

      <main className="mx-auto flex max-w-2xl flex-col gap-5 px-4 pb-24 pt-4">
        <div className="animate-fade-in-up">
          <p className="text-sm text-slate-500">{t('greeting', { name: profile.name })}</p>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{t('title')}</h1>
        </div>

        <DaySummary meals={meals} profile={profile} emptyText={t('empty')} />
      </main>
    </div>
  );
}
