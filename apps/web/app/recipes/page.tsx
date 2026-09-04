import { redirect } from 'next/navigation';
import { requireUser, fetchProfile } from '@/lib/auth';
import { AppHeader } from '@/components/AppHeader';
import { RecipeList, type RecipeListItem } from './RecipeList';

export default async function RecipesPage() {
  const { supabase, userId } = await requireUser();
  const profile = await fetchProfile(supabase, userId);
  if (!profile) redirect('/onboarding');

  const { data, error } = await supabase
    .from('recipes')
    .select('*, ingredients:recipe_ingredients(name)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);

  const recipes = (data ?? []).map((row) => ({ ...row, ingredients: row.ingredients ?? [] })) as RecipeListItem[];

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

        <RecipeList recipes={recipes} />
      </main>
    </div>
  );
}
