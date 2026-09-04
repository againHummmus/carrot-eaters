import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { requireUser, fetchProfile } from '@/lib/auth';
import { zonedPeriodRangeUtc, zonedDateKey, type MealWithItems } from '@carrot-eaters/shared';
import { AppHeader } from '@/components/AppHeader';
import { DaySummary } from '@/components/DaySummary';
import { getLocale, getTranslations } from 'next-intl/server';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export default async function HistoryDayPage({ params }: { params: Promise<{ date: string }> }) {
  const { date } = await params;
  if (!DATE_RE.test(date)) notFound();

  const t = await getTranslations('history');
  const locale = await getLocale();
  const { supabase, userId } = await requireUser();
  const profile = await fetchProfile(supabase, userId);
  if (!profile) redirect('/onboarding');

  const { start, end } = zonedPeriodRangeUtc(profile.timezone, date, date);
  const { data, error } = await supabase
    .from('meals')
    .select('*, items:meal_items(*)')
    .eq('user_id', userId)
    .gte('eaten_at', start.toISOString())
    .lt('eaten_at', end.toISOString())
    .order('eaten_at', { ascending: false });
  if (error) throw new Error(error.message);

  const meals = (data ?? []) as MealWithItems[];

  // Noon UTC keeps the calendar date stable when re-rendered in the profile's timezone.
  const dayLabel = new Date(`${date}T12:00:00Z`).toLocaleDateString(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: profile.timezone,
  });
  const isToday = date === zonedDateKey(profile.timezone, new Date());

  return (
    <div className="min-h-screen">
      <AppHeader />

      <main className="mx-auto flex max-w-2xl flex-col gap-5 px-4 pb-24 pt-4">
        <div className="animate-fade-in-up">
          <Link href="/history" className="inline-flex items-center gap-1 text-sm text-slate-500 transition-colors hover:text-slate-800">
            <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
              <path d="M12.5 5L7.5 10L12.5 15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {t('title')}
          </Link>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 first-letter:uppercase">{dayLabel}</h1>
          {isToday && <p className="text-sm text-slate-500">{t('today')}</p>}
        </div>

        <DaySummary meals={meals} profile={profile} emptyText={t('dayEmpty')} />
      </main>
    </div>
  );
}
