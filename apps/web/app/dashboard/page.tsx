import { redirect } from 'next/navigation';
import Link from 'next/link';
import { requireUser, fetchProfile } from '@/lib/auth';
import { macroTargets, DAILY_NORMS, todayRangeUtc, sumNutrients, type MealWithItems } from '@kbju/shared';
import { ProgressBar } from '@/components/ProgressBar';
import { MealRow } from './MealRow';

export default async function DashboardPage() {
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
  const totals = sumNutrients(meals);
  const targets = macroTargets(profile.kcal_target);

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 px-4 pb-24 pt-6">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">Привет, {profile.name}</p>
          <h1 className="text-xl font-semibold">Сегодня</h1>
        </div>
        <nav className="flex gap-3 text-sm">
          <Link href="/history" className="text-slate-500 underline">
            История
          </Link>
          <Link href="/settings" className="text-slate-500 underline">
            Настройки
          </Link>
        </nav>
      </header>

      <section className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <ProgressBar label="Калории" value={totals.kcal} target={profile.kcal_target} unit="ккал" />
        <ProgressBar label="Белки" value={totals.protein} target={targets.protein} unit="г" />
        <ProgressBar label="Жиры" value={totals.fat} target={targets.fat} unit="г" />
        <ProgressBar label="Углеводы" value={totals.carbs} target={targets.carbs} unit="г" />
      </section>

      <section className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-medium text-slate-600">Дополнительно (средняя норма)</h2>
        <ProgressBar label="Клетчатка" value={totals.fiber ?? 0} target={DAILY_NORMS.fiber} unit="г" variant="average" />
        <ProgressBar label="Сахар" value={totals.sugar ?? 0} target={DAILY_NORMS.sugar} unit="г" variant="average" />
        <ProgressBar
          label="Насыщенные жиры"
          value={totals.saturated_fat ?? 0}
          target={DAILY_NORMS.saturated_fat}
          unit="г"
          variant="average"
        />
        <ProgressBar label="Холестерин" value={totals.cholesterol ?? 0} target={DAILY_NORMS.cholesterol} unit="мг" variant="average" />
        <ProgressBar label="Натрий" value={totals.sodium ?? 0} target={DAILY_NORMS.sodium} unit="мг" variant="average" />
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium text-slate-600">Приёмы пищи</h2>
        {meals.length === 0 && <p className="text-sm text-slate-400">Пока ничего не записано сегодня.</p>}
        {meals.map((meal) => (
          <MealRow key={meal.id} meal={meal} />
        ))}
      </section>
    </main>
  );
}
