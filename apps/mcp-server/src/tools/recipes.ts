import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import {
  formatAmount,
  scaleAmount,
  scaleNutrients,
  type Recipe,
  type RecipeWithIngredients,
} from '@carrot-eaters/shared';
import type { ToolContext } from './context.js';
import { round, macroLine } from '../format.js';

const ingredientSchema = z.object({
  name: z.string().describe('Ingredient name, written in the language the user is speaking'),
  amount: z
    .number()
    .nullable()
    .optional()
    .describe('Amount PER SINGLE SERVING. null or omitted means "to taste" (salt, spices) and is never scaled'),
  unit: z
    .string()
    .nullable()
    .optional()
    .describe(
      'Unit, written the way the user would write it, in their own language (г, мл, шт, ст. л. / g, ml, pcs, tbsp). ' +
        'Stored verbatim and shown as-is in the web app, which never translates units — so keep it consistent with the rest of the recipe.'
    ),
});

const PER_SERVING = 'PER SINGLE SERVING';

/** Loads one recipe of the current user by id or by (case-insensitive, partial) title. */
export async function findRecipe(
  ctx: ToolContext,
  by: { recipe_id?: string; title?: string }
): Promise<RecipeWithIngredients | null> {
  let query = ctx.db
    .from('recipes')
    .select('*, ingredients:recipe_ingredients(*)')
    .eq('user_id', ctx.userId)
    .limit(1);
  query = by.recipe_id ? query.eq('id', by.recipe_id) : query.ilike('title', `%${by.title}%`);

  const { data, error } = await query.maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;

  const recipe = data as RecipeWithIngredients;
  recipe.ingredients = [...(recipe.ingredients ?? [])].sort((a, b) => a.sort_order - b.sort_order);
  return recipe;
}

function renderRecipe(recipe: RecipeWithIngredients, servings: number): string {
  const n = scaleNutrients(recipe, servings);

  const lines: string[] = [`"${recipe.title}" — for ${servings} ${servings === 1 ? 'serving' : 'servings'}`];
  if (recipe.description) lines.push(recipe.description);

  lines.push('', 'Ingredients:');
  for (const ingredient of recipe.ingredients) {
    lines.push(`— ${ingredient.name}: ${formatAmount(scaleAmount(ingredient.amount, servings), ingredient.unit)}`);
  }

  if (recipe.steps.length > 0) {
    lines.push('', 'Method:', ...recipe.steps.map((step, i) => `${i + 1}. ${step}`));
  }

  lines.push(
    '',
    `Nutrition: ${macroLine(n.kcal, n.protein, n.fat, n.carbs)}`,
    `Fiber ${round(n.fiber ?? 0)} g · sugar ${round(n.sugar ?? 0)} g · saturated fat ${round(n.saturated_fat ?? 0)} g · ` +
      `cholesterol ${round(n.cholesterol ?? 0)} mg · sodium ${round(n.sodium ?? 0)} mg`,
    `(id: ${recipe.id})`
  );

  return lines.join('\n');
}

export function registerRecipeTools(server: McpServer, ctx: ToolContext): void {
  server.registerTool(
    'save_recipe',
    {
      description:
        "Saves a recipe to the user's personal recipe book. Call this when the user asks to write down or save a recipe. " +
        `EVERYTHING — ingredient amounts and nutrients alike — must be given ${PER_SERVING}: in the web app the user picks ` +
        'the number of servings and the amounts are rescaled from there. fiber/sugar/saturated_fat/cholesterol/sodium are ' +
        'required — estimate them alongside the calories and macros, roughly if need be. Title, description, ingredients and ' +
        'steps are stored verbatim and shown in the web app, so write them in the language the user is speaking. ' +
        'An existing recipe with the same title is overwritten.',
      inputSchema: {
        title: z.string().min(1).describe("Recipe title, in the user's language"),
        description: z.string().optional().describe("Short description, 1–2 sentences, in the user's language"),
        ingredients: z.array(ingredientSchema).min(1).describe(`Ingredients, ${PER_SERVING}`),
        steps: z
          .array(z.string())
          .min(1)
          .describe("Method steps in order, in the user's language, without numbering inside the text itself"),
        kcal: z.number().describe(`Calories ${PER_SERVING}`),
        protein: z.number().describe(`Protein, g, ${PER_SERVING}`),
        fat: z.number().describe(`Fat, g, ${PER_SERVING}`),
        carbs: z.number().describe(`Carbs, g, ${PER_SERVING}`),
        fiber: z.number().describe(`Fiber, g, ${PER_SERVING} — required, estimate it even roughly`),
        sugar: z.number().describe(`Sugar, g, ${PER_SERVING} — required, estimate it even roughly`),
        saturated_fat: z.number().describe(`Saturated fat, g, ${PER_SERVING} — required`),
        cholesterol: z.number().describe(`Cholesterol, mg, ${PER_SERVING} — required`),
        sodium: z.number().describe(`Sodium, mg, ${PER_SERVING} — required`),
      },
    },
    async ({ title, description, ingredients, steps, ...nutrients }): Promise<CallToolResult> => {
      const existing = await findRecipe(ctx, { title });
      // findRecipe matches partially, so only an exact (case-insensitive) title is "the same recipe".
      const sameTitle = existing && existing.title.toLowerCase() === title.toLowerCase() ? existing : null;

      const row = { title, description: description ?? null, steps, ...nutrients };

      let recipeId: string;
      if (sameTitle) {
        const { error } = await ctx.db
          .from('recipes')
          .update({ ...row, updated_at: new Date().toISOString() })
          .eq('id', sameTitle.id);
        if (error) throw new Error(error.message);

        const { error: clearError } = await ctx.db.from('recipe_ingredients').delete().eq('recipe_id', sameTitle.id);
        if (clearError) throw new Error(clearError.message);
        recipeId = sameTitle.id;
      } else {
        const { data, error } = await ctx.db
          .from('recipes')
          .insert({ user_id: ctx.userId, ...row })
          .select('id')
          .single();
        if (error) throw new Error(error.message);
        recipeId = (data as { id: string }).id;
      }

      const { error: ingredientsError } = await ctx.db.from('recipe_ingredients').insert(
        ingredients.map((ingredient, index) => ({
          recipe_id: recipeId,
          sort_order: index,
          name: ingredient.name,
          amount: ingredient.amount ?? null,
          unit: ingredient.unit ?? null,
        }))
      );
      if (ingredientsError) throw new Error(ingredientsError.message);

      const verb = sameTitle ? 'Recipe updated' : 'Recipe saved';
      return {
        content: [
          {
            type: 'text',
            text:
              `${verb}: "${title}" — ${ingredients.length} ingredients, ${steps.length} steps, ` +
              `${macroLine(nutrients.kcal, nutrients.protein, nutrients.fat, nutrients.carbs)} per serving.\n` +
              `On the Recipes page in the web app the user can set the number of servings and rescale the ingredients. (id: ${recipeId})`,
          },
        ],
      };
    }
  );

  server.registerTool(
    'list_recipes',
    {
      description:
        'Lists the saved recipes (title, per-serving nutrients, id). ' +
        'Call this before get_recipe, log_recipe_portion or delete_recipe when you do not know the recipe id.',
      inputSchema: {
        query: z.string().optional().describe('Filter by part of the title'),
      },
    },
    async ({ query }): Promise<CallToolResult> => {
      let request = ctx.db
        .from('recipes')
        .select('id, title, kcal, protein, fat, carbs')
        .eq('user_id', ctx.userId)
        .order('created_at', { ascending: false })
        .limit(50);
      if (query) request = request.ilike('title', `%${query}%`);

      const { data, error } = await request;
      if (error) throw new Error(error.message);

      const recipes = (data ?? []) as Recipe[];
      if (recipes.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: query
                ? `No recipes match "${query}".`
                : 'The recipe book is empty. Save the first recipe with save_recipe.',
            },
          ],
        };
      }

      const lines = recipes.map(
        (recipe) => `— "${recipe.title}" — ${macroLine(recipe.kcal, recipe.protein, recipe.fat, recipe.carbs)} per serving (id: ${recipe.id})`
      );
      return { content: [{ type: 'text', text: `Recipes: ${recipes.length}\n${lines.join('\n')}` }] };
    }
  );

  server.registerTool(
    'get_recipe',
    {
      description:
        'Returns the full recipe: ingredients, method steps and nutrients. ' +
        'servings rescales both the ingredients and the nutrients to that number of servings.',
      inputSchema: {
        recipe_id: z.string().uuid().optional().describe('Recipe id, when known'),
        title: z.string().optional().describe('Recipe title to search by, when the id is unknown'),
        servings: z.number().positive().optional().describe('Number of servings to scale to, defaults to 1'),
      },
    },
    async ({ recipe_id, title, servings }): Promise<CallToolResult> => {
      if (!recipe_id && !title) {
        return { content: [{ type: 'text', text: 'Provide either recipe_id or title.' }], isError: true };
      }
      const recipe = await findRecipe(ctx, { recipe_id, title });
      if (!recipe) {
        return { content: [{ type: 'text', text: `No recipe found for "${recipe_id ?? title}".` }] };
      }
      return { content: [{ type: 'text', text: renderRecipe(recipe, servings ?? 1) }] };
    }
  );

  server.registerTool(
    'delete_recipe',
    {
      description:
        'Deletes a recipe from the recipe book along with its ingredients. Takes a recipe_id rather than a title — look it up with list_recipes first.',
      inputSchema: {
        recipe_id: z.string().uuid().describe('Recipe id from list_recipes'),
      },
    },
    async ({ recipe_id }): Promise<CallToolResult> => {
      const { data, error } = await ctx.db
        .from('recipes')
        .delete()
        .eq('id', recipe_id)
        .eq('user_id', ctx.userId)
        .select('title')
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!data) {
        return { content: [{ type: 'text', text: `Recipe ${recipe_id} not found.` }] };
      }
      return { content: [{ type: 'text', text: `Recipe "${(data as { title: string }).title}" deleted.` }] };
    }
  );
}
