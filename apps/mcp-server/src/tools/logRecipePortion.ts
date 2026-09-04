import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { scaleNutrients, type Meal } from '@carrot-eaters/shared';
import type { ToolContext } from './context.js';
import { fetchProfile, NO_PROFILE_HINT } from './profile.js';
import { todaySummaryLine } from './dailySummary.js';
import { findRecipe } from './recipes.js';
import { macroLine } from '../format.js';

const UNIQUE_VIOLATION = '23505';

export function registerLogRecipePortionTool(server: McpServer, ctx: ToolContext): void {
  server.registerTool(
    'log_recipe_portion',
    {
      description:
        'Logs a meal from a saved recipe in one step, with no nutrient estimation — it takes the per-serving nutrients from the ' +
        'recipe book and multiplies them by the number of servings. Pass recipe_id or recipe_title (searched by title). ' +
        'If the recipe is not saved yet, call save_recipe first, or log the food directly with log_meal.',
      inputSchema: {
        recipe_id: z.string().uuid().optional().describe('Recipe id, when known'),
        recipe_title: z.string().optional().describe('Recipe title to search by, when the id is unknown'),
        servings: z.number().positive().optional().describe('How many servings were eaten, defaults to 1'),
        eaten_at: z.string().datetime({ offset: true }).optional().describe('ISO datetime, defaults to now'),
        client_ref: z.string().optional().describe('Idempotency key for retried calls'),
      },
    },
    async ({ recipe_id, recipe_title, servings, eaten_at, client_ref }): Promise<CallToolResult> => {
      if (!recipe_id && !recipe_title) {
        return { content: [{ type: 'text', text: 'Provide either recipe_id or recipe_title.' }], isError: true };
      }

      const profile = await fetchProfile(ctx);
      if (!profile) {
        return { content: [{ type: 'text', text: NO_PROFILE_HINT }] };
      }

      const recipe = await findRecipe(ctx, { recipe_id, title: recipe_title });
      if (!recipe) {
        return {
          content: [
            {
              type: 'text',
              text:
                `No recipe found for "${recipe_id ?? recipe_title}". Check the list with list_recipes, ` +
                'save the recipe with save_recipe, or log the food directly with log_meal.',
            },
          ],
        };
      }

      const portions = servings ?? 1;
      const totals = scaleNutrients(recipe, portions);
      // This title is persisted and rendered verbatim in the web app, whose language is the user's
      // own choice — so the multi-serving marker stays a language-neutral "×N" rather than a word.
      const title = portions === 1 ? recipe.title : `${recipe.title} ×${portions}`;

      if (client_ref) {
        const { data: existing, error: findError } = await ctx.db
          .from('meals')
          .select('*')
          .eq('user_id', ctx.userId)
          .eq('client_ref', client_ref)
          .maybeSingle();
        if (findError) throw new Error(findError.message);
        if (existing) {
          const meal = existing as Meal;
          const summary = await todaySummaryLine(ctx, profile);
          return {
            content: [
              {
                type: 'text',
                text: `Already logged earlier: ${meal.title} — ${macroLine(meal.kcal, meal.protein, meal.fat, meal.carbs)} (id: ${meal.id})\n${summary}`,
              },
            ],
          };
        }
      }

      const insertMeal = async () =>
        ctx.db
          .from('meals')
          .insert({
            user_id: ctx.userId,
            title,
            eaten_at: eaten_at ?? new Date().toISOString(),
            confidence: 'high',
            client_ref: client_ref ?? null,
            ...totals,
          })
          .select('*')
          .single();

      let { data: meal, error } = await insertMeal();
      if (error && error.code === UNIQUE_VIOLATION && client_ref) {
        // Lost a race against a concurrent identical call — treat as idempotent success.
        const { data: existing, error: findError } = await ctx.db
          .from('meals')
          .select('*')
          .eq('user_id', ctx.userId)
          .eq('client_ref', client_ref)
          .single();
        if (findError) throw new Error(findError.message);
        meal = existing;
        error = null;
      }
      if (error) throw new Error(error.message);

      // One item for the whole dish: per-ingredient nutrients are not stored, only the per-serving total.
      const { error: itemError } = await ctx.db.from('meal_items').insert({
        meal_id: (meal as Meal).id,
        name: title,
        ...totals,
      });
      if (itemError) throw new Error(itemError.message);

      const summary = await todaySummaryLine(ctx, profile);
      return {
        content: [
          {
            type: 'text',
            text: `Logged: ${title} — ${macroLine(totals.kcal, totals.protein, totals.fat, totals.carbs)} (id: ${(meal as Meal).id})\n${summary}`,
          },
        ],
      };
    }
  );
}
