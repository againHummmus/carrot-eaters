import { redirect } from 'next/navigation';
import Link from 'next/link';
import { requireUser, fetchProfile } from '@/lib/auth';
import { zonedPeriodRangeUtc, zonedDateKey, macroTargets } from '@kbju/shared';

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
  const { from, to } = params.from && params.to ? { from: params.from, to: params.to } : presetRange(params.preset ?? 'week');

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

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 px-4 pb-24 pt-6">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">История</h1>
        <Link href="/dashboard" className="text-sm text-slate-500 underline">
          Сегодня
        </Link>
      </header>

      <nav className="flex flex-wrap items-center gap-3 text-sm">
        <Link href="/history?preset=week" className="rounded-full border border-slate-300 px-3 py-1">
          Неделя
        </Link>
        <Link href="/history?preset=month" className="rounded-full border border-slate-300 px-3 py-1">
          Месяц
        </Link>
        <form action="/history" className="flex items-center gap-2">
          <input type="date" name="from" defaultValue={from} className="rounded border border-slate-300 px-2 py-1" />
          <span>—</span>
          <input type="date" name="to" defaultValue={to} className="rounded border border-slate-300 px-2 py-1" />
          <button type="submit" className="rounded-full bg-slate-900 px-3 py-1 text-white">
            Показать
          </button>
        </form>
      </nav>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <p className="text-sm text-slate-500">
          {from} — {to} · {rows.length} приёмов пищи
        </p>
        <p className="mt-2 font-medium">
          Итого: {Math.round(total.kcal)} ккал · Б{Math.round(total.protein)}/Ж{Math.round(total.fat)}/У{Math.round(total.carbs)}
        </p>
        <p className="mt-1 text-sm text-slate-500">
          В среднем в день: {Math.round(total.kcal / dayCount)} ккал (цель {profile.kcal_target}) · Б
          {Math.round(total.protein / dayCount)} (цель {targets.protein}) · Ж{Math.round(total.fat / dayCount)} (цель {targets.fat}) · У
          {Math.round(total.carbs / dayCount)} (цель {targets.carbs})
        </p>
      </section>

      <section className="flex flex-col gap-2">
        {days.length === 0 && <p className="text-sm text-slate-400">Нет записей за этот период.</p>}
        {days.map(([day, sums]) => (
          <div key={day} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3">
            <span className="text-sm font-medium">{day}</span>
            <span className="text-sm text-slate-500">
              {Math.round(sums.kcal)} ккал · Б{Math.round(sums.protein)}/Ж{Math.round(sums.fat)}/У{Math.round(sums.carbs)}
            </span>
          </div>
        ))}
      </section>
    </main>
  );
}
