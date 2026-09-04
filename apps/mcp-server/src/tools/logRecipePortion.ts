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
        'Логирует приём пищи из сохранённого рецепта одной фразой, без пересчёта КБЖУ — берёт нутриенты порции из книги рецептов ' +
        'и умножает на число порций. Укажи recipe_id или recipe_title (поиск по названию). ' +
        'Если рецепт ещё не сохранён — сначала save_recipe, либо логируй как обычный приём пищи через log_meal.',
      inputSchema: {
        recipe_id: z.string().uuid().optional().describe('ID рецепта, если известен'),
        recipe_title: z.string().optional().describe('Название рецепта для поиска, если id неизвестен'),
        servings: z.number().positive().optional().describe('Сколько порций съедено, по умолчанию 1'),
        eaten_at: z.string().datetime({ offset: true }).optional().describe('ISO datetime, по умолчанию — сейчас'),
        client_ref: z.string().optional().describe('Ключ идемпотентности для повторных вызовов'),
      },
    },
    async ({ recipe_id, recipe_title, servings, eaten_at, client_ref }): Promise<CallToolResult> => {
      if (!recipe_id && !recipe_title) {
        return { content: [{ type: 'text', text: 'Укажи recipe_id или recipe_title.' }], isError: true };
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
                `Рецепт не найден по запросу «${recipe_id ?? recipe_title}». Посмотри список через list_recipes, ` +
                'сохрани рецепт через save_recipe или залогируй еду напрямую через log_meal.',
            },
          ],
        };
      }

      const portions = servings ?? 1;
      const totals = scaleNutrients(recipe, portions);
      const title = portions === 1 ? recipe.title : `${recipe.title} (${portions} порц.)`;

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
                text: `Уже записано ранее: ${meal.title} — ${macroLine(meal.kcal, meal.protein, meal.fat, meal.carbs)} (id: ${meal.id})\n${summary}`,
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
            text: `Записано: ${title} — ${macroLine(totals.kcal, totals.protein, totals.fat, totals.carbs)} (id: ${(meal as Meal).id})\n${summary}`,
          },
        ],
      };
    }
  );
}
