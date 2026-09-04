'use client';

import { useState } from 'react';
import { formatAmount, scaleAmount, scaleNutrients, type RecipeWithIngredients } from '@carrot-eaters/shared';

const MIN_SERVINGS = 1;
const MAX_SERVINGS = 50;

function servingsLabel(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return 'порция';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'порции';
  return 'порций';
}

export function RecipeDetail({ recipe }: { recipe: RecipeWithIngredients }) {
  const [servings, setServings] = useState(1);
  const totals = scaleNutrients(recipe, servings);

  const step = (delta: number) =>
    setServings((current) => Math.min(MAX_SERVINGS, Math.max(MIN_SERVINGS, current + delta)));

  const stepButton = 'flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-lg text-slate-600 transition-all hover:border-slate-300 hover:bg-slate-50 active:scale-95 disabled:opacity-40 disabled:hover:bg-white';

  return (
    <>
      <div className="animate-fade-in-up">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{recipe.title}</h1>
        {recipe.description && <p className="mt-1 text-sm text-slate-500">{recipe.description}</p>}
      </div>

      <section
        className="animate-fade-in-up flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-900/3"
        style={{ animationDelay: '40ms' }}
      >
        <div>
          <p className="text-sm font-medium text-slate-700">Порций</p>
          <p className="text-xs text-slate-400">Количества пересчитываются автоматически</p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <button type="button" onClick={() => step(-1)} disabled={servings <= MIN_SERVINGS} aria-label="Меньше порций" className={stepButton}>
            −
          </button>
          <span className="w-8 text-center text-lg font-semibold tabular-nums text-slate-900">{servings}</span>
          <button type="button" onClick={() => step(1)} disabled={servings >= MAX_SERVINGS} aria-label="Больше порций" className={stepButton}>
            +
          </button>
        </div>
      </section>

      <section
        className="animate-fade-in-up flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/3"
        style={{ animationDelay: '80ms' }}
      >
        <h2 className="text-sm font-medium text-slate-500">
          Ингредиенты · {servings} {servingsLabel(servings)}
        </h2>
        <ul className="flex flex-col gap-2">
          {recipe.ingredients.map((ingredient) => (
            <li key={ingredient.id} className="flex justify-between gap-3 text-sm">
              <span className="text-slate-700">{ingredient.name}</span>
              <span className="shrink-0 tabular-nums text-slate-500">
                {formatAmount(scaleAmount(ingredient.amount, servings), ingredient.unit)}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section
        className="animate-fade-in-up flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/3"
        style={{ animationDelay: '120ms' }}
      >
        <h2 className="text-sm font-medium text-slate-500">
          КБЖУ · {servings} {servingsLabel(servings)}
        </h2>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-semibold tabular-nums text-slate-900">{Math.round(totals.kcal)}</span>
          <span className="text-sm text-slate-400">ккал</span>
        </div>
        <div className="grid grid-cols-3 gap-2 text-sm">
          {[
            { label: 'Белки', value: totals.protein },
            { label: 'Жиры', value: totals.fat },
            { label: 'Углеводы', value: totals.carbs },
          ].map((macro) => (
            <div key={macro.label} className="rounded-xl bg-slate-50 px-3 py-2">
              <p className="text-xs text-slate-400">{macro.label}</p>
              <p className="font-medium tabular-nums text-slate-800">{Math.round(macro.value)} г</p>
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-1 border-t border-slate-100 pt-3 text-sm">
          {[
            { label: 'Клетчатка', value: totals.fiber, unit: 'г' },
            { label: 'Сахар', value: totals.sugar, unit: 'г' },
            { label: 'Насыщенные жиры', value: totals.saturated_fat, unit: 'г' },
            { label: 'Холестерин', value: totals.cholesterol, unit: 'мг' },
            { label: 'Натрий', value: totals.sodium, unit: 'мг' },
          ].map((nutrient) => (
            <div key={nutrient.label} className="flex justify-between gap-3">
              <span className="text-slate-500">{nutrient.label}</span>
              <span className="shrink-0 tabular-nums text-slate-600">
                {nutrient.value === null ? '—' : `${Math.round(nutrient.value)} ${nutrient.unit}`}
              </span>
            </div>
          ))}
        </div>
      </section>

      {recipe.steps.length > 0 && (
        <section
          className="animate-fade-in-up flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/3"
          style={{ animationDelay: '160ms' }}
        >
          <h2 className="text-sm font-medium text-slate-500">Приготовление</h2>
          <ol className="flex flex-col gap-3">
            {recipe.steps.map((stepText, i) => (
              <li key={i} className="flex gap-3 text-sm text-slate-700">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-xs font-medium text-emerald-700">
                  {i + 1}
                </span>
                <span className="pt-0.5">{stepText}</span>
              </li>
            ))}
          </ol>
        </section>
      )}
    </>
  );
}
