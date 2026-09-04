import { macroTargets, DAILY_NORMS, sumNutrients, type MealWithItems, type Profile } from '@carrot-eaters/shared';
import { ProgressBar } from '@/components/ProgressBar';
import { MealRow } from '@/components/MealRow';

/** Full picture of one calendar day — shared by /dashboard (today) and /history/[date]. */
export function DaySummary({ meals, profile, emptyText }: { meals: MealWithItems[]; profile: Profile; emptyText: string }) {
  const totals = sumNutrients(meals);
  const targets = macroTargets(profile.kcal_target);

  return (
    <>
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
            {emptyText}
          </p>
        )}
        <div className="flex flex-col gap-2">
          {meals.map((meal, i) => (
            <MealRow key={meal.id} meal={meal} delay={i * 40} />
          ))}
        </div>
      </section>
    </>
  );
}
