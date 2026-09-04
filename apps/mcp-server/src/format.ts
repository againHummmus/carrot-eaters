export function round(n: number): number {
  return Math.round(n);
}

export function macroLine(kcal: number, protein: number, fat: number, carbs: number): string {
  return `${round(kcal)} kcal (P${round(protein)}/F${round(fat)}/C${round(carbs)})`;
}
