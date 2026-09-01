import { macroTargets, todayRangeUtc, type Profile } from '@carrot-eaters/shared';
import type { ToolContext } from './context.js';
import { round } from '../format.js';

export async function todaySummaryLine(ctx: ToolContext, profile: Profile): Promise<string> {
  const { start, end } = todayRangeUtc(profile.timezone);
  const { data, error } = await ctx.db
    .from('meals')
    .select('kcal, protein, fat, carbs')
    .eq('user_id', ctx.userId)
    .gte('eaten_at', start.toISOString())
    .lt('eaten_at', end.toISOString());
  if (error) throw new Error(error.message);

  const totals = (data ?? []).reduce(
    (acc, row) => ({
      kcal: acc.kcal + Number(row.kcal),
      protein: acc.protein + Number(row.protein),
      fat: acc.fat + Number(row.fat),
      carbs: acc.carbs + Number(row.carbs),
    }),
    { kcal: 0, protein: 0, fat: 0, carbs: 0 }
  );

  const targets = macroTargets(profile.kcal_target);
  const remainingKcal = round(profile.kcal_target - totals.kcal);
  const remainingProtein = round(targets.protein - totals.protein);

  const lines = [
    `Сегодня: ${round(totals.kcal)} из ${profile.kcal_target} ккал · Б${round(totals.protein)}/Ж${round(totals.fat)}/У${round(totals.carbs)}`,
  ];
  if (remainingKcal >= 0) {
    lines.push(`Осталось: ${remainingKcal} ккал${remainingProtein > 0 ? `, белка ещё ~${remainingProtein} г` : ''}`);
  } else {
    lines.push(`Превышение: ${-remainingKcal} ккал сверх цели`);
  }
  return lines.join('\n');
}
