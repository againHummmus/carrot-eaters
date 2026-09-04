import { redirect } from 'next/navigation';
import Link from 'next/link';
import { requireUser, fetchProfile } from '@/lib/auth';
import type { Recipe } from '@carrot-eaters/shared';
import { AppHeader } from '@/components/AppHeader';

export default async function RecipesPage() {
  const { supabase, userId } = await requireUser();
  const profile = await fetchProfile(supabase, userId);
  if (!profile) redirect('/onboarding');

  const { data, error } = await supabase
    .from('recipes')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);

  const recipes = (data ?? []) as Recipe[];

  return (
    <div className="min-h-screen">
      <AppHeader />

      <main className="mx-auto flex max-w-2xl flex-col gap-5 px-4 pb-24 pt-4">
        <div className="animate-fade-in-up">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Рецепты</h1>
          <p className="mt-1 text-sm text-slate-500">
            Всё хранится в расчёте на одну порцию — внутри рецепта можно выставить нужное количество.
          </p>
        </div>

        <section className="animate-fade-in-up flex flex-col gap-2" style={{ animationDelay: '40ms' }}>
          {recipes.length === 0 && (
            <p className="rounded-2xl border border-dashed border-slate-200 bg-white/60 p-6 text-center text-sm text-slate-400">
              Пока ни одного рецепта. Попроси Клода «запиши рецепт» — он появится здесь.
            </p>
          )}

          {recipes.map((recipe, i) => (
            <Link
              key={recipe.id}
              href={`/recipes/${recipe.id}`}
              className="animate-fade-in-up rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm shadow-slate-900/3 transition-shadow hover:shadow-md"
              style={{ animationDelay: `${80 + i * 40}ms` }}
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
      </main>
    </div>
  );
}
