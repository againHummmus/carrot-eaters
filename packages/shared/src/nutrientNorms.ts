/**
 * Averaged adult daily values (~2000 kcal diet, FDA/WHO ballpark) for nutrients
 * that are NOT personalized per user in the MVP. Never persisted to the DB —
 * kept here so server and client render the exact same "average norm" numbers.
 */
export const DAILY_NORMS = {
  fiber: 28, // g
  sugar: 50, // g, added sugar upper bound
  saturated_fat: 20, // g
  cholesterol: 300, // mg
  sodium: 2300, // mg
} as const;

export type ExtendedNutrientKey = keyof typeof DAILY_NORMS;
