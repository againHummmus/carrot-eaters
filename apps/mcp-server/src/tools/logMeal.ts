import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { sumNutrients, type Meal } from '@kbju/shared';
import type { ToolContext } from './context.js';
import { fetchProfile, NO_PROFILE_HINT } from './profile.js';
import { todaySummaryLine } from './dailySummary.js';
import { macroLine } from '../format.js';

const mealItemSchema = z.object({
  name: z.string(),
  grams: z.number().optional(),
  kcal: z.number(),
  protein: z.number(),
  fat: z.number(),
  carbs: z.number(),
  fiber: z.number().optional(),
  sugar: z.number().optional(),
  saturated_fat: z.number().optional(),
  cholesterol: z.number().optional(),
  sodium: z.number().optional(),
});

const UNIQUE_VIOLATION = '23505';

export function registerLogMealTool(server: McpServer, ctx: ToolContext): void {
  server.registerTool(
    'log_meal',
    {
      description:
        'Записывает приём пищи по уже посчитанным КБЖУ (расчёт делает сама модель по фото/описанию, этот инструмент только сохраняет). ' +
        'fiber/sugar/saturated_fat/cholesterol/sodium — опциональны и best-effort, оставляй null если не уверен(а). ' +
        'client_ref — тот же токен при повторном вызове не создаёт дубль. Возвращает не просто "записано", а сводку за сегодня и остаток до цели.',
      inputSchema: {
        title: z.string().describe('Название приёма пищи'),
        items: z.array(mealItemSchema).min(1).describe('Продукты, из которых состоит приём пищи'),
        eaten_at: z.string().datetime({ offset: true }).optional().describe('ISO datetime, по умолчанию — сейчас'),
        confidence: z.enum(['low', 'medium', 'high']).describe('Насколько уверенно оценены КБЖУ'),
        client_ref: z.string().optional().describe('Ключ идемпотентности для повторных вызовов'),
      },
    },
    async ({ title, items, eaten_at, confidence, client_ref }): Promise<CallToolResult> => {
      const profile = await fetchProfile(ctx);
      if (!profile) {
        return { content: [{ type: 'text', text: NO_PROFILE_HINT }] };
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
                text: `Уже записано ранее: ${meal.title} — ${macroLine(meal.kcal, meal.protein, meal.fat, meal.carbs)}\n${summary}`,
              },
            ],
          };
        }
      }

      const totals = sumNutrients(items);
      const insertMeal = async () =>
        ctx.db
          .from('meals')
          .insert({
            user_id: ctx.userId,
            title,
            eaten_at: eaten_at ?? new Date().toISOString(),
            confidence,
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

      const itemRows = items.map((item) => ({ meal_id: (meal as Meal).id, ...item }));
      const { error: itemsError } = await ctx.db.from('meal_items').insert(itemRows);
      if (itemsError) throw new Error(itemsError.message);

      const summary = await todaySummaryLine(ctx, profile);
      return {
        content: [
          {
            type: 'text',
            text: `Записано: ${title} — ${macroLine(totals.kcal, totals.protein, totals.fat, totals.carbs)}\n${summary}`,
          },
        ],
      };
    }
  );
}
