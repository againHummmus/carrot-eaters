import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { Meal } from '@carrot-eaters/shared';
import type { ToolContext } from './context.js';
import { fetchProfile, NO_PROFILE_HINT } from './profile.js';
import { todaySummaryLine } from './dailySummary.js';
import { macroLine } from '../format.js';

const UNIQUE_VIOLATION = '23505';

export function registerLogRecipePortionTool(server: McpServer, ctx: ToolContext): void {
  server.registerTool(
    'log_recipe_portion',
    {
      description:
        'Логирует приём пищи из готового рецепта одной фразой, без пересчёта КБЖУ — берёт уже сохранённую порцию текущего ' +
        'пользователя из банка рецептов. Укажи recipe_id или recipe_title (поиск по имени). ' +
        'Если для рецепта нет сохранённой порции для этого пользователя — вернёт подсказку, а не ошибку.',
      inputSchema: {
        recipe_id: z.string().uuid().optional().describe('ID рецепта, если известен'),
        recipe_title: z.string().optional().describe('Название рецепта для поиска, если id неизвестен'),
        eaten_at: z.string().datetime({ offset: true }).optional().describe('ISO datetime, по умолчанию — сейчас'),
        client_ref: z.string().optional().describe('Ключ идемпотентности для повторных вызовов'),
      },
    },
    async ({ recipe_id, recipe_title, eaten_at, client_ref }): Promise<CallToolResult> => {
      if (!recipe_id && !recipe_title) {
        return { content: [{ type: 'text', text: 'Укажи recipe_id или recipe_title.' }], isError: true };
      }

      const profile = await fetchProfile(ctx);
      if (!profile) {
        return { content: [{ type: 'text', text: NO_PROFILE_HINT }] };
      }

      let recipeQuery = ctx.db.from('recipes').select('id, title').limit(1);
      recipeQuery = recipe_id ? recipeQuery.eq('id', recipe_id) : recipeQuery.ilike('title', `%${recipe_title}%`);
      const { data: recipe, error: recipeError } = await recipeQuery.maybeSingle();
      if (recipeError) throw new Error(recipeError.message);
      if (!recipe) {
        return { content: [{ type: 'text', text: `Рецепт не найден по запросу "${recipe_id ?? recipe_title}".` }] };
      }

      const { data: portion, error: portionError } = await ctx.db
        .from('recipe_portions')
        .select('*')
        .eq('recipe_id', recipe.id)
        .eq('user_id', ctx.userId)
        .maybeSingle();
      if (portionError) throw new Error(portionError.message);
      if (!portion) {
        return {
          content: [
            {
              type: 'text',
              text: `Для рецепта «${recipe.title}» нет сохранённой порции для тебя. Добавь её в recipe_portions или залогируй как обычный приём пищи через log_meal.`,
            },
          ],
        };
      }

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
            title: recipe.title,
            eaten_at: eaten_at ?? new Date().toISOString(),
            confidence: 'high',
            client_ref: client_ref ?? null,
            kcal: portion.kcal,
            protein: portion.protein,
            fat: portion.fat,
            carbs: portion.carbs,
          })
          .select('*')
          .single();

      let { data: meal, error } = await insertMeal();
      if (error && error.code === UNIQUE_VIOLATION && client_ref) {
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

      const { error: itemError } = await ctx.db.from('meal_items').insert({
        meal_id: (meal as Meal).id,
        name: recipe.title,
        grams: portion.grams,
        kcal: portion.kcal,
        protein: portion.protein,
        fat: portion.fat,
        carbs: portion.carbs,
      });
      if (itemError) throw new Error(itemError.message);

      const summary = await todaySummaryLine(ctx, profile);
      return {
        content: [
          {
            type: 'text',
            text: `Записано: ${recipe.title} — ${macroLine(portion.kcal, portion.protein, portion.fat, portion.carbs)} (id: ${(meal as Meal).id})\n${summary}`,
          },
        ],
      };
    }
  );
}
