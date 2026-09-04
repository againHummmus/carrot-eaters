import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { requireUser, fetchProfile } from '@/lib/auth';
import type { RecipeWithIngredients } from '@carrot-eaters/shared';
import { AppHeader } from '@/components/AppHeader';
import { RecipeDetail } from './RecipeDetail';

export default async function RecipePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, userId } = await requireUser();
  const profile = await fetchProfile(supabase, userId);
  if (!profile) redirect('/onboarding');

  const { data, error } = await supabase
    .from('recipes')
    .select('*, ingredients:recipe_ingredients(*)')
    .eq('id', id)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) notFound();

  const recipe = data as RecipeWithIngredients;
  recipe.ingredients = [...(recipe.ingredients ?? [])].sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div className="min-h-screen">
      <AppHeader />

      <main className="mx-auto flex max-w-2xl flex-col gap-5 px-4 pb-24 pt-4">
        <Link href="/recipes" className="animate-fade-in-up flex items-center gap-1 text-sm text-slate-500 transition-colors hover:text-slate-800">
          <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
            <path d="M12.5 5L7.5 10L12.5 15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Все рецепты
        </Link>

        <RecipeDetail recipe={recipe} />
      </main>
    </div>
  );
}
