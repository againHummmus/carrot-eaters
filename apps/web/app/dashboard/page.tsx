import { redirect } from 'next/navigation';
import { requireUser, fetchProfile } from '@/lib/auth';
import { macroTargets, DAILY_NORMS, todayRangeUtc, sumNutrients, type MealWithItems } from '@carrot-eaters/shared';
import { ProgressBar } from '@/components/ProgressBar';
import { AppHeader } from '@/components/AppHeader';
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
    <div className="min-h-screen">
      <AppHeader />

      <main className="mx-auto flex max-w-2xl flex-col gap-5 px-4 pb-24 pt-4">
        <div className="animate-fade-in-up">
          <p className="text-sm text-slate-500">Привет, {profile.name}</p>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Сегодня</h1>
        </div>

        <section
          className="animate-fade-in-up flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/3"
          style={{ animationDelay: '40ms' }}
        >
          <ProgressBar label="Калории" value={totals.kcal} target={profile.kcal_target} unit="ккал" />
          <ProgressBar label="Белки" value={totals.protein} target={targets.protein} unit="г" />
          <ProgressBar label="Жиры" value={totals.fat} target={targets.fat} unit="г" />
          <ProgressBar label="Углеводы" value={totals.carbs} target={targets.carbs} unit="г" />
        </section>

        <section
          className="animate-fade-in-up flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/3"
          style={{ animationDelay: '90ms' }}
        >
          <h2 className="text-sm font-medium text-slate-500">Дополнительно · средняя норма</h2>
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

        <section className="animate-fade-in-up flex flex-col gap-2" style={{ animationDelay: '140ms' }}>
          <h2 className="text-sm font-medium text-slate-500">Приёмы пищи</h2>
          {meals.length === 0 && (
            <p className="rounded-2xl border border-dashed border-slate-200 bg-white/60 p-6 text-center text-sm text-slate-400">
              Пока ничего не записано сегодня.
            </p>
          )}
          <div className="flex flex-col gap-2">
            {meals.map((meal, i) => (
              <MealRow key={meal.id} meal={meal} delay={i * 40} />
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
