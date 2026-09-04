'use client';

import { useEffect, useState } from 'react';
import { formatAmount, scaleAmount, scaleNutrients, type RecipeWithIngredients } from '@carrot-eaters/shared';
import { useTranslations } from 'next-intl';

const MIN_SERVINGS = 1;
const MAX_SERVINGS = 50;

/** Ticked-off ingredients live in the browser: they are a cooking aid, not part of the recipe. */
function checklistKey(recipeId: string): string {
  return `recipe-checklist:${recipeId}`;
}

function readChecklist(recipeId: string): string[] {
  try {
    const raw = localStorage.getItem(checklistKey(recipeId));
    const parsed = raw ? JSON.parse(raw) : null;
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

export function RecipeDetail({ recipe }: { recipe: RecipeWithIngredients }) {
  const t = useTranslations('recipe');
  const common = useTranslations('common');
  const nutrients = useTranslations('day');
  const amountFormat = { toTaste: t('toTaste'), decimal: common('decimal') };
  const [servings, setServings] = useState(1);
  const [checked, setChecked] = useState<string[]>([]);
  const totals = scaleNutrients(recipe, servings);
  const checkedCount = recipe.ingredients.filter((ingredient) => checked.includes(ingredient.id)).length;

  // Read after mount so the server and the client render the same first paint.
  useEffect(() => setChecked(readChecklist(recipe.id)), [recipe.id]);

  function toggleIngredient(id: string) {
    setChecked((current) => {
      const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
      try {
        localStorage.setItem(checklistKey(recipe.id), JSON.stringify(next));
      } catch {
        // storage disabled: the checklist just does not survive a reload
      }
      return next;
    });
  }

  function resetChecklist() {
    setChecked([]);
    try {
      localStorage.removeItem(checklistKey(recipe.id));
    } catch {
      // ignore
    }
  }

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
          <p className="text-sm font-medium text-slate-700">{t('servings')}</p>
          <p className="text-xs text-slate-400">{t('servingsHint')}</p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <button type="button" onClick={() => step(-1)} disabled={servings <= MIN_SERVINGS} aria-label={t('fewerServings')} className={stepButton}>
            −
          </button>
          <span className="w-8 text-center text-lg font-semibold tabular-nums text-slate-900">{servings}</span>
          <button type="button" onClick={() => step(1)} disabled={servings >= MAX_SERVINGS} aria-label={t('moreServings')} className={stepButton}>
            +
          </button>
        </div>
      </section>

      <section
        className="animate-fade-in-up flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/3"
        style={{ animationDelay: '80ms' }}
      >
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-medium text-slate-500">
            {t('ingredients')} · {t('servingsCount', { count: servings })}
          </h2>
          {checkedCount > 0 && (
            <div className="flex shrink-0 items-center gap-2">
              <span className="text-xs tabular-nums text-slate-400">
                {t('checkedOf', { checked: checkedCount, total: recipe.ingredients.length })}
              </span>
              <button
                type="button"
                onClick={resetChecklist}
                className="rounded-full px-2 py-0.5 text-xs text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-600"
              >
                {t('reset')}
              </button>
            </div>
          )}
        </div>
        <ul className="-my-1 flex flex-col">
          {recipe.ingredients.map((ingredient) => {
            const done = checked.includes(ingredient.id);
            return (
              <li key={ingredient.id}>
                <label className="-mx-2 flex cursor-pointer items-center gap-3 rounded-xl px-2 py-2 text-sm transition-colors hover:bg-slate-50">
                  <input type="checkbox" checked={done} onChange={() => toggleIngredient(ingredient.id)} className="peer sr-only" />
                  <span
                    aria-hidden
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-all peer-focus-visible:ring-2 peer-focus-visible:ring-emerald-300 ${
                      done ? 'border-emerald-500 bg-emerald-500' : 'border-slate-300 bg-white'
                    }`}
                  >
                    <svg viewBox="0 0 20 20" fill="none" className={`h-3.5 w-3.5 text-white transition-opacity ${done ? 'opacity-100' : 'opacity-0'}`}>
                      <path d="M5 10.5L8.5 14L15 6.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <span className={`flex-1 transition-colors ${done ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                    {ingredient.name}
                  </span>
                  <span className={`shrink-0 tabular-nums transition-colors ${done ? 'text-slate-300 line-through' : 'text-slate-500'}`}>
                    {formatAmount(scaleAmount(ingredient.amount, servings), ingredient.unit, amountFormat)}
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      </section>

      <section
        className="animate-fade-in-up flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/3"
        style={{ animationDelay: '120ms' }}
      >
        <h2 className="text-sm font-medium text-slate-500">
          {t('nutrition')} · {t('servingsCount', { count: servings })}
        </h2>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-semibold tabular-nums text-slate-900">{Math.round(totals.kcal)}</span>
          <span className="text-sm text-slate-400">{common('kcal')}</span>
        </div>
        <div className="grid grid-cols-3 gap-2 text-sm">
          {[
            { label: nutrients('protein'), value: totals.protein },
            { label: nutrients('fat'), value: totals.fat },
            { label: nutrients('carbs'), value: totals.carbs },
          ].map((macro) => (
            <div key={macro.label} className="rounded-xl bg-slate-50 px-3 py-2">
              <p className="text-xs text-slate-400">{macro.label}</p>
              <p className="font-medium tabular-nums text-slate-800">
                {Math.round(macro.value)} {common('g')}
              </p>
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-1 border-t border-slate-100 pt-3 text-sm">
          {[
            { label: nutrients('fiber'), value: totals.fiber, unit: common('g') },
            { label: nutrients('sugar'), value: totals.sugar, unit: common('g') },
            { label: nutrients('saturatedFat'), value: totals.saturated_fat, unit: common('g') },
            { label: nutrients('cholesterol'), value: totals.cholesterol, unit: common('mg') },
            { label: nutrients('sodium'), value: totals.sodium, unit: common('mg') },
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
          <h2 className="text-sm font-medium text-slate-500">{t('steps')}</h2>
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
