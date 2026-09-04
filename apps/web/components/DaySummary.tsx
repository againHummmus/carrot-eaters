import { macroTargets, DAILY_NORMS, sumNutrients, type MealWithItems, type Profile } from '@carrot-eaters/shared';
import { ProgressBar } from '@/components/ProgressBar';
import { MealRow } from '@/components/MealRow';
import { getTranslations } from 'next-intl/server';

/** Full picture of one calendar day — shared by /dashboard (today) and /history/[date]. */
export async function DaySummary({ meals, profile, emptyText }: { meals: MealWithItems[]; profile: Profile; emptyText: string }) {
  const t = await getTranslations('day');
  const common = await getTranslations('common');
  const totals = sumNutrients(meals);
  const targets = macroTargets(profile.kcal_target);

  const extra = [
    { label: t('fiber'), value: totals.fiber ?? 0, target: DAILY_NORMS.fiber, unit: common('g') },
    { label: t('sugar'), value: totals.sugar ?? 0, target: DAILY_NORMS.sugar, unit: common('g') },
    { label: t('saturatedFat'), value: totals.saturated_fat ?? 0, target: DAILY_NORMS.saturated_fat, unit: common('g') },
    { label: t('cholesterol'), value: totals.cholesterol ?? 0, target: DAILY_NORMS.cholesterol, unit: common('mg') },
    { label: t('sodium'), value: totals.sodium ?? 0, target: DAILY_NORMS.sodium, unit: common('mg') },
  ];

  return (
    <>
      <section
        className="animate-fade-in-up flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/3"
        style={{ animationDelay: '40ms' }}
      >
        <ProgressBar label={t('calories')} value={totals.kcal} target={profile.kcal_target} unit={common('kcal')} />
        <ProgressBar label={t('protein')} value={totals.protein} target={targets.protein} unit={common('g')} />
        <ProgressBar label={t('fat')} value={totals.fat} target={targets.fat} unit={common('g')} />
        <ProgressBar label={t('carbs')} value={totals.carbs} target={targets.carbs} unit={common('g')} />
      </section>

      <section
        className="animate-fade-in-up flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/3"
        style={{ animationDelay: '90ms' }}
      >
        <h2 className="text-sm font-medium text-slate-500">{t('extraTitle')}</h2>
        {extra.map((nutrient) => (
          <ProgressBar
            key={nutrient.label}
            label={nutrient.label}
            value={nutrient.value}
            target={nutrient.target}
            unit={nutrient.unit}
            variant="average"
            note={t('averageNote')}
          />
        ))}
      </section>

      <section className="animate-fade-in-up flex flex-col gap-2" style={{ animationDelay: '140ms' }}>
        <h2 className="text-sm font-medium text-slate-500">{t('meals')}</h2>
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
