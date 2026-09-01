import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { sumNutrients } from '@kbju/shared';
import type { ToolContext } from './context.js';
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

export function registerUpdateMealTool(server: McpServer, ctx: ToolContext): void {
  server.registerTool(
    'update_meal',
    {
      description:
        'Правит уже записанный приём пищи: title, eaten_at и/или items (полный новый список продуктов — если передан, ' +
        'КБЖУ пересчитываются с нуля из него). Передавай только те поля, которые нужно поменять.',
      inputSchema: {
        meal_id: z.string().uuid(),
        title: z.string().optional(),
        eaten_at: z.string().datetime({ offset: true }).optional(),
        items: z.array(mealItemSchema).min(1).optional(),
      },
    },
    async ({ meal_id, title, eaten_at, items }): Promise<CallToolResult> => {
      const { data: existing, error: findError } = await ctx.db
        .from('meals')
        .select('id')
        .eq('id', meal_id)
        .eq('user_id', ctx.userId)
        .maybeSingle();
      if (findError) throw new Error(findError.message);
      if (!existing) {
        return { content: [{ type: 'text', text: 'Приём пищи не найден.' }], isError: true };
      }

      const update: Record<string, unknown> = {};
      if (title !== undefined) update.title = title;
      if (eaten_at !== undefined) update.eaten_at = eaten_at;

      if (items !== undefined) {
        const { error: deleteError } = await ctx.db.from('meal_items').delete().eq('meal_id', meal_id);
        if (deleteError) throw new Error(deleteError.message);

        const totals = sumNutrients(items);
        Object.assign(update, totals);

        const { error: insertError } = await ctx.db.from('meal_items').insert(items.map((item) => ({ meal_id, ...item })));
        if (insertError) throw new Error(insertError.message);
      }

      const { data: meal, error: updateError } = await ctx.db.from('meals').update(update).eq('id', meal_id).select('*').single();
      if (updateError) throw new Error(updateError.message);

      return {
        content: [
          {
            type: 'text',
            text: `Обновлено: ${meal.title} — ${macroLine(meal.kcal, meal.protein, meal.fat, meal.carbs)}`,
          },
        ],
      };
    }
  );
}
