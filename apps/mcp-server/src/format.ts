export function round(n: number): number {
  return Math.round(n);
}

export function macroLine(kcal: number, protein: number, fat: number, carbs: number): string {
  return `${round(kcal)} ккал (Б${round(protein)}/Ж${round(fat)}/У${round(carbs)})`;
}
