'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import type { Recipe } from '@carrot-eaters/shared';

/** A recipe row plus just enough of its ingredients to search through them. */
export type RecipeListItem = Recipe & { ingredients: { name: string }[] };

/** Lowercase + ё→е, so «гречка» matches «Гречка» and «мёд» matches «мед». */
function normalize(text: string): string {
  return text.toLowerCase().replace(/ё/g, 'е');
}

/** Everything a recipe can be found by: title, description, ingredient names. */
function haystack(recipe: RecipeListItem): string {
  return normalize([recipe.title, recipe.description ?? '', ...recipe.ingredients.map((i) => i.name)].join(' '));
}

export function RecipeList({ recipes }: { recipes: RecipeListItem[] }) {
  const [query, setQuery] = useState('');

  const indexed = useMemo(() => recipes.map((recipe) => ({ recipe, text: haystack(recipe) })), [recipes]);

  const visible = useMemo(() => {
    const words = normalize(query).split(/\s+/).filter(Boolean);
    if (words.length === 0) return recipes;
    return indexed.filter((entry) => words.every((word) => entry.text.includes(word))).map((entry) => entry.recipe);
  }, [indexed, query, recipes]);

  if (recipes.length === 0) {
    return (
      <p className="animate-fade-in-up rounded-2xl border border-dashed border-slate-200 bg-white/60 p-6 text-center text-sm text-slate-400">
        Пока ни одного рецепта. Попроси Клода «запиши рецепт» — он появится здесь.
      </p>
    );
  }

  return (
    <>
      <div className="animate-fade-in-up relative" style={{ animationDelay: '40ms' }}>
        <svg viewBox="0 0 20 20" fill="none" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400">
          <circle cx="9" cy="9" r="5.25" stroke="currentColor" strokeWidth="1.6" />
          <path d="M13 13L16.5 16.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Поиск по названию или ингредиенту"
          aria-label="Поиск по рецептам"
          className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-10 pr-10 text-sm text-slate-800 shadow-sm shadow-slate-900/3 outline-none transition-colors placeholder:text-slate-400 focus:border-emerald-300"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            aria-label="Очистить поиск"
            className="absolute right-2.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
          >
            <svg viewBox="0 0 20 20" fill="none" className="h-3.5 w-3.5">
              <path d="M5.5 5.5L14.5 14.5M14.5 5.5L5.5 14.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        )}
      </div>

      <section className="animate-fade-in-up flex flex-col gap-2" style={{ animationDelay: '80ms' }}>
        {visible.length === 0 && (
          <p className="rounded-2xl border border-dashed border-slate-200 bg-white/60 p-6 text-center text-sm text-slate-400">
            Ничего не нашлось по запросу «{query.trim()}».
          </p>
        )}

        {visible.map((recipe, i) => (
          <Link
            key={recipe.id}
            href={`/recipes/${recipe.id}`}
            className="animate-fade-in-up rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm shadow-slate-900/3 transition-shadow hover:shadow-md"
            style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-slate-800">{recipe.title}</p>
                {recipe.description && <p className="mt-0.5 line-clamp-2 text-xs text-slate-400">{recipe.description}</p>}
              </div>
              <div className="shrink-0 text-right">
                <p className="text-sm font-medium text-slate-800">{Math.round(recipe.kcal)} ккал</p>
                <p className="text-xs text-slate-400">
                  Б{Math.round(recipe.protein)}/Ж{Math.round(recipe.fat)}/У{Math.round(recipe.carbs)}
                </p>
                <p className="text-xs text-slate-300">на порцию</p>
              </div>
            </div>
          </Link>
        ))}
      </section>
    </>
  );
}
