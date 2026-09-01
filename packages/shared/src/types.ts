export type Confidence = 'low' | 'medium' | 'high';

export interface Profile {
  user_id: string;
  name: string;
  timezone: string;
  kcal_target: number;
  created_at: string;
}

export interface NutrientAmounts {
  kcal: number;
  protein: number;
  fat: number;
  carbs: number;
  fiber: number | null;
  sugar: number | null;
  saturated_fat: number | null;
  cholesterol: number | null;
  sodium: number | null;
}

export interface MealItemInput {
  name: string;
  grams?: number | null;
  kcal: number;
  protein: number;
  fat: number;
  carbs: number;
  fiber?: number | null;
  sugar?: number | null;
  saturated_fat?: number | null;
  cholesterol?: number | null;
  sodium?: number | null;
}

export interface MealItemRow extends MealItemInput {
  id: string;
  meal_id: string;
}

export interface Meal extends NutrientAmounts {
  id: string;
  user_id: string;
  eaten_at: string;
  title: string;
  confidence: Confidence | null;
  notes: string | null;
  client_ref: string | null;
  created_at: string;
}

export interface MealWithItems extends Meal {
  items: MealItemRow[];
}

/** Structural shape accepted by sumNutrients — matches both MealItemInput and any NutrientAmounts row (e.g. a Meal). */
export interface NutrientInputLike {
  kcal: number;
  protein: number;
  fat: number;
  carbs: number;
  fiber?: number | null;
  sugar?: number | null;
  saturated_fat?: number | null;
  cholesterol?: number | null;
  sodium?: number | null;
}

/** Sums a list of items (or whole meals) into totals. Null extended nutrients are skipped, not treated as 0. */
export function sumNutrients(items: NutrientInputLike[]): NutrientAmounts {
  const totals: NutrientAmounts = {
    kcal: 0,
    protein: 0,
    fat: 0,
    carbs: 0,
    fiber: null,
    sugar: null,
    saturated_fat: null,
    cholesterol: null,
    sodium: null,
  };

  const extendedKeys = ['fiber', 'sugar', 'saturated_fat', 'cholesterol', 'sodium'] as const;

  for (const item of items) {
    totals.kcal += item.kcal;
    totals.protein += item.protein;
    totals.fat += item.fat;
    totals.carbs += item.carbs;

    for (const key of extendedKeys) {
      const value = item[key];
      if (value !== null && value !== undefined) {
        totals[key] = (totals[key] ?? 0) + value;
      }
    }
  }

  return totals;
}
