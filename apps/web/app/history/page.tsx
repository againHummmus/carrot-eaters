import { redirect } from 'next/navigation';
import Link from 'next/link';
import { requireUser, fetchProfile } from '@/lib/auth';
import { zonedPeriodRangeUtc, zonedDateKey, macroTargets } from '@carrot-eaters/shared';
import { AppHeader } from '@/components/AppHeader';

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function presetRange(preset: string): { from: string; to: string } {
  const today = new Date();
  const to = isoDate(today);
  const days = preset === 'month' ? 30 : 7;
  const fromDate = new Date(today.getTime() - (days - 1) * 24 * 60 * 60 * 1000);
  return { from: isoDate(fromDate), to };
}

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; preset?: string }>;
}) {
  const { supabase, userId } = await requireUser();
  const profile = await fetchProfile(supabase, userId);
  if (!profile) redirect('/onboarding');

  const params = await searchParams;
  const activePreset = params.from && params.to ? null : (params.preset ?? 'week');
  const { from, to } = params.from && params.to ? { from: params.from, to: params.to } : presetRange(activePreset ?? 'week');

  const { start, end } = zonedPeriodRangeUtc(profile.timezone, from, to);
  const { data, error } = await supabase
    .from('meals')
    .select('eaten_at, kcal, protein, fat, carbs')
    .eq('user_id', userId)
    .gte('eaten_at', start.toISOString())
    .lt('eaten_at', end.toISOString())
    .order('eaten_at', { ascending: true });
  if (error) throw new Error(error.message);

  const rows = data ?? [];
  const byDay = new Map<string, { kcal: number; protein: number; fat: number; carbs: number }>();
  for (const row of rows) {
    const key = zonedDateKey(profile.timezone, new Date(row.eaten_at));
    const acc = byDay.get(key) ?? { kcal: 0, protein: 0, fat: 0, carbs: 0 };
    acc.kcal += Number(row.kcal);
    acc.protein += Number(row.protein);
    acc.fat += Number(row.fat);
    acc.carbs += Number(row.carbs);
    byDay.set(key, acc);
  }
  const days = [...byDay.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1));

  const total = rows.reduce(
    (acc, r) => ({
      kcal: acc.kcal + Number(r.kcal),
      protein: acc.protein + Number(r.protein),
      fat: acc.fat + Number(r.fat),
      carbs: acc.carbs + Number(r.carbs),
    }),
    { kcal: 0, protein: 0, fat: 0, carbs: 0 }
  );
  const dayCount = days.length || 1;
  const targets = macroTargets(profile.kcal_target);

  const chipClass = (active: boolean) =>
    `rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
      active
        ? 'border-emerald-600 bg-emerald-600 text-white'
        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
    }`;

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-5 px-4 pb-24">
      <AppHeader />

      <h1 className="animate-fade-in-up text-2xl font-semibold tracking-tight text-slate-900">История</h1>

      <nav className="animate-fade-in-up flex flex-col gap-3" style={{ animationDelay: '40ms' }}>
        <div className="flex flex-wrap gap-2">
          <Link href="/history?preset=week" className={chipClass(activePreset === 'week')}>
            Неделя
          </Link>
          <Link href="/history?preset=month" className={chipClass(activePreset === 'month')}>
            Месяц
          </Link>
        </div>
        <form action="/history" className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="flex flex-1 items-center gap-2">
            <input
              type="date"
              name="from"
              defaultValue={from}
              className="w-full min-w-0 rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
            <span className="shrink-0 text-slate-300">—</span>
            <input
              type="date"
              name="to"
              defaultValue={to}
              className="w-full min-w-0 rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
          <button
            type="submit"
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-slate-800 active:scale-95"
          >
            Показать
          </button>
        </form>
      </nav>

      <section
        className="animate-fade-in-up rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/3"
        style={{ animationDelay: '80ms' }}
      >
        <p className="text-sm text-slate-500">
          {from} — {to} · {rows.length} приёмов пищи
        </p>
        <p className="mt-2 text-lg font-semibold text-slate-900">
          {Math.round(total.kcal)} ккал <span className="text-sm font-normal text-slate-400">итого</span>
        </p>
        <p className="text-sm text-slate-500">
          Б{Math.round(total.protein)}/Ж{Math.round(total.fat)}/У{Math.round(total.carbs)}
        </p>
        <div className="my-3 h-px bg-slate-100" />
        <p className="text-sm text-slate-500">
          В среднем в день: <span className="font-medium text-slate-700">{Math.round(total.kcal / dayCount)} ккал</span> из{' '}
          {profile.kcal_target} · Б{Math.round(total.protein / dayCount)}/{targets.protein} · Ж{Math.round(total.fat / dayCount)}/
          {targets.fat} · У{Math.round(total.carbs / dayCount)}/{targets.carbs}
        </p>
      </section>

      <section className="animate-fade-in-up flex flex-col gap-2" style={{ animationDelay: '120ms' }}>
        {days.length === 0 && (
          <p className="rounded-2xl border border-dashed border-slate-200 bg-white/60 p-6 text-center text-sm text-slate-400">
            Нет записей за этот период.
          </p>
        )}
        {days.map(([day, sums], i) => {
          const pct = Math.min(100, Math.round((sums.kcal / profile.kcal_target) * 100));
          return (
            <div
              key={day}
              className="animate-fade-in-up rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm shadow-slate-900/3 transition-shadow hover:shadow-md"
              style={{ animationDelay: `${140 + i * 30}ms` }}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-slate-800">{day}</span>
                <span className="shrink-0 text-sm text-slate-500">
                  {Math.round(sums.kcal)} ккал · Б{Math.round(sums.protein)}/Ж{Math.round(sums.fat)}/У{Math.round(sums.carbs)}
                </span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-full rounded-full transition-[width] duration-500 ${pct >= 100 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </section>
    </main>
  );
}
