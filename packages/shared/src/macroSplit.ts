const KCAL_PER_G = { protein: 4, fat: 9, carbs: 4 } as const;
const SPLIT = { protein: 0.3, fat: 0.3, carbs: 0.4 } as const;

export interface MacroTargets {
  protein: number;
  fat: number;
  carbs: number;
}

/**
 * Derives target grams of protein/fat/carbs from a single daily kcal target.
 * This is the ONLY place the 30/30/40 split is defined — server and client both import it
 * so the ratio never has to be kept in sync by hand.
 */
export function macroTargets(kcalTarget: number): MacroTargets {
  return {
    protein: Math.round((kcalTarget * SPLIT.protein) / KCAL_PER_G.protein),
    fat: Math.round((kcalTarget * SPLIT.fat) / KCAL_PER_G.fat),
    carbs: Math.round((kcalTarget * SPLIT.carbs) / KCAL_PER_G.carbs),
  };
}
