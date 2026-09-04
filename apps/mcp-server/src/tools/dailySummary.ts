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
    `Today: ${round(totals.kcal)} of ${profile.kcal_target} kcal · P${round(totals.protein)}/F${round(totals.fat)}/C${round(totals.carbs)}`,
  ];
  if (remainingKcal >= 0) {
    lines.push(`Remaining: ${remainingKcal} kcal${remainingProtein > 0 ? `, plus ~${remainingProtein} g of protein` : ''}`);
  } else {
    lines.push(`Over goal by ${-remainingKcal} kcal`);
  }
  return lines.join('\n');
}
