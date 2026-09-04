import type { NutrientAmounts } from './types.js';

/**
 * One ingredient line, always stored per ONE serving.
 * `amount === null` means an unmeasured ingredient ("соль по вкусу") — it is never scaled.
 */
export interface RecipeIngredient {
  id: string;
  recipe_id: string;
  sort_order: number;
  name: string;
  amount: number | null;
  unit: string | null;
}

export interface RecipeIngredientInput {
  name: string;
  amount?: number | null;
  unit?: string | null;
}

/** A saved recipe. Nutrients on the row are per ONE serving, same as its ingredients. */
export interface Recipe extends NutrientAmounts {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  steps: string[];
  created_at: string;
  updated_at: string;
}

export interface RecipeWithIngredients extends Recipe {
  ingredients: RecipeIngredient[];
}

/**
 * Rounds a scaled ingredient amount to something a human would actually write down:
 * grams/ml to whole units, small counts (eggs, spoons) to a half or a quarter.
 */
export function roundAmount(value: number): number {
  if (value >= 100) return Math.round(value);
  if (value >= 10) return Math.round(value * 2) / 2;
  return Math.round(value * 4) / 4;
}

/** Ingredient amount for `servings` servings. Null (unmeasured) stays null. */
export function scaleAmount(amount: number | null, servings: number): number | null {
  return amount === null ? null : roundAmount(amount * servings);
}

/** "150 г" / "1.5 шт" / "по вкусу" — the display form of a scaled ingredient. */
export function formatAmount(amount: number | null, unit: string | null): string {
  if (amount === null) return 'по вкусу';
  const number = Number.isInteger(amount) ? String(amount) : String(amount).replace('.', ',');
  return unit ? `${number} ${unit}` : number;
}

/** Every nutrient of the recipe scaled to `servings`. Null extended nutrients stay null. */
export function scaleNutrients(recipe: NutrientAmounts, servings: number): NutrientAmounts {
  const scale = (v: number | null) => (v === null ? null : v * servings);
  return {
    kcal: recipe.kcal * servings,
    protein: recipe.protein * servings,
    fat: recipe.fat * servings,
    carbs: recipe.carbs * servings,
    fiber: scale(recipe.fiber),
    sugar: scale(recipe.sugar),
    saturated_fat: scale(recipe.saturated_fat),
    cholesterol: scale(recipe.cholesterol),
    sodium: scale(recipe.sodium),
  };
}
